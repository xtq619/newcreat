import base64
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_fernet: Fernet | None = None
_canonical_key: str | None = None  # DB-loaded key, takes precedence over .env


def set_canonical_key(key: str) -> None:
    """Set the encryption key from the database. Overrides .env ENCRYPTION_KEY."""
    global _canonical_key, _fernet
    _canonical_key = key
    _fernet = None  # force rebuild on next use
    logger.info("Canonical encryption key set from database")


def _get_fernet() -> Fernet:
    global _fernet, _canonical_key
    if _fernet is not None:
        return _fernet
    # DB key takes priority over .env
    key = _canonical_key or settings.ENCRYPTION_KEY
    if len(key) != 44:
        raise ValueError(
            "ENCRYPTION_KEY 无效：长度必须为 44 字符。\n"
            "请在 backend/.env 中设置正确的 ENCRYPTION_KEY。\n"
            "生成方式: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    try:
        base64.urlsafe_b64decode(key)
    except Exception:
        raise ValueError(
            "ENCRYPTION_KEY 无效：不是有效的 base64 编码。\n"
            "请在 backend/.env 中设置正确的 ENCRYPTION_KEY。\n"
            "生成方式: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    _fernet = Fernet(key.encode())
    return _fernet


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def generate_api_key() -> tuple[str, str, str]:
    raw = secrets.token_hex(24)
    prefix = raw[:8]
    full_key = f"{settings.API_KEY_PREFIX}{raw}"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_hash, prefix


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def encrypt_api_key(plain: str) -> str:
    return _get_fernet().encrypt(plain.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


# ---------------------------------------------------------------------------
# Database-backed key management
# ---------------------------------------------------------------------------


async def load_key_from_db(db: AsyncSession) -> str | None:
    """Read the active encryption key from the database. Returns None if not set."""
    from app.models.encryption_key import EncryptionKey

    result = await db.execute(
        select(EncryptionKey.key_material)
        .where(EncryptionKey.is_active == True)
        .order_by(EncryptionKey.created_at.desc())
        .limit(1)
    )
    row = result.first()
    return row[0] if row else None


async def persist_key_to_db(db: AsyncSession, key: str) -> None:
    """Store the encryption key in the database (first-time setup)."""
    from app.models.encryption_key import EncryptionKey

    entry = EncryptionKey(key_material=key, is_active=True)
    db.add(entry)
    await db.commit()
    logger.info("Encryption key persisted to database")


async def rotate_all_keys(db: AsyncSession, old_key_str: str, new_key_str: str) -> dict:
    """Re-encrypt all model API keys and SMTP passwords with a new key.

    Returns stats dict: {"models_rotated": N, "smtp_rotated": N}
    """
    from app.models.digest import DigestSetting
    from app.models.model_registry import ModelRegistry

    old_fernet = Fernet(old_key_str.encode())
    new_fernet = Fernet(new_key_str.encode())

    stats = {"models_rotated": 0, "smtp_rotated": 0}

    # Re-encrypt model registry API keys
    result = await db.execute(select(ModelRegistry))
    for model in result.scalars().all():
        if model.api_key_encrypted:
            try:
                plain = old_fernet.decrypt(model.api_key_encrypted.encode()).decode()
                model.api_key_encrypted = new_fernet.encrypt(plain.encode()).decode()
                stats["models_rotated"] += 1
            except Exception:
                logger.warning("Failed to re-encrypt model %s (%s)", model.model_name, model.id)

    # Re-encrypt SMTP password if present
    result = await db.execute(select(DigestSetting))
    for setting in result.scalars().all():
        encrypted = setting.smtp_password_encrypted or ""
        if encrypted:
            try:
                plain = old_fernet.decrypt(encrypted.encode()).decode()
                setting.smtp_password_encrypted = new_fernet.encrypt(plain.encode()).decode()
                stats["smtp_rotated"] += 1
            except Exception:
                logger.warning("Failed to re-encrypt SMTP password for %s", setting.id)

    # Update the stored key
    from app.models.encryption_key import EncryptionKey

    # Deactivate old keys
    old_keys = await db.execute(
        select(EncryptionKey).where(EncryptionKey.is_active == True)
    )
    for k in old_keys.scalars().all():
        k.is_active = False

    # Store new key
    new_entry = EncryptionKey(key_material=new_key_str, is_active=True)
    db.add(new_entry)

    await db.commit()
    logger.info("Key rotation complete: %s", stats)
    return stats
