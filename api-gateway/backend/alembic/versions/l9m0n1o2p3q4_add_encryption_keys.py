"""add encryption_keys table and smtp_password_encrypted column

Revision ID: l9m0n1o2p3q4
Revises: k8l9m0n1o2p3
Create Date: 2026-05-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'l9m0n1o2p3q4'
down_revision: Union[str, None] = 'k8l9m0n1o2p3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'encryption_keys',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('key_material', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.add_column('digest_settings', sa.Column('smtp_password_encrypted', sa.Text(), server_default='', nullable=False))


def downgrade() -> None:
    op.drop_column('digest_settings', 'smtp_password_encrypted')
    op.drop_table('encryption_keys')
