import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Match(Base):
    __tablename__ = "worldcup_matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    time: Mapped[str] = mapped_column(String(5), nullable=False)
    team_a_code: Mapped[str] = mapped_column(String(3), nullable=False)
    team_a_name: Mapped[str] = mapped_column(String(32), nullable=False)
    team_a_flag: Mapped[str] = mapped_column(String(8), nullable=False)
    team_b_code: Mapped[str] = mapped_column(String(3), nullable=False)
    team_b_name: Mapped[str] = mapped_column(String(32), nullable=False)
    team_b_flag: Mapped[str] = mapped_column(String(8), nullable=False)
    group_name: Mapped[str | None] = mapped_column(String(1), nullable=True)
    stage: Mapped[str] = mapped_column(String(20), nullable=False, default="group")
    round: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="upcoming")
    score_a: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_b: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Team(Base):
    __tablename__ = "worldcup_teams"

    code: Mapped[str] = mapped_column(String(3), primary_key=True)
    name: Mapped[str] = mapped_column(String(32), nullable=False)
    flag: Mapped[str] = mapped_column(String(8), nullable=False)
    group_name: Mapped[str] = mapped_column(String(1), nullable=False)
    fifa_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    appearances: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    best_result: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    coach: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    key_player: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    squad_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    squad_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Guess(Base):
    __tablename__ = "worldcup_guesses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    match_id: Mapped[int] = mapped_column(Integer, nullable=False)
    score_a: Mapped[int] = mapped_column(Integer, nullable=False)
    score_b: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "match_id", name="uq_guess_user_match"),
    )


class EmotionVote(Base):
    __tablename__ = "worldcup_emotions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    match_id: Mapped[int] = mapped_column(Integer, nullable=False)
    emotion: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "match_id", name="uq_emotion_user_match"),
    )