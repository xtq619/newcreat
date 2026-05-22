import uuid
from datetime import date as date_type, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ---- Guess ----
class GuessSubmit(BaseModel):
    score_a: int = Field(ge=0, le=99)
    score_b: int = Field(ge=0, le=99)


class GuessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    match_id: int
    score_a: int
    score_b: int
    created_at: datetime
    updated_at: datetime


class GuessList(BaseModel):
    items: list[GuessResponse]


# ---- Emotion ----
class EmotionSubmit(BaseModel):
    emotion: str = Field(min_length=1, max_length=20)


class EmotionStat(BaseModel):
    emotion: str
    count: int
    pct: int


class EmotionResponse(BaseModel):
    match_id: int
    my_emotion: str | None = None
    stats: list[EmotionStat]


# ---- Match ----
class MatchTeam(BaseModel):
    code: str
    name: str
    flag: str


class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    time: str
    teamA: MatchTeam
    teamB: MatchTeam
    group: str | None = None
    stage: str
    round: int | None = None
    status: str
    scoreA: int | None = None
    scoreB: int | None = None


class MatchUpdate(BaseModel):
    status: str | None = None
    score_a: int | None = None
    score_b: int | None = None


class MatchList(BaseModel):
    matches: list[MatchOut]


# ---- Team ----
class SquadPlayer(BaseModel):
    pos: str
    name: str
    no: int


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    flag: str
    group: str
    fifaRank: int | None = None
    appearances: int
    best: str
    coach: str
    keyPlayer: str
    squadConfirmed: bool
    squad: list[dict[str, Any]] = []
    updatedAt: datetime | None = None


class TeamUpdate(BaseModel):
    fifa_rank: int | None = None
    coach: str | None = None
    key_player: str | None = None
    squad_confirmed: bool | None = None
    squad_data: list[dict[str, Any]] | None = None


class TeamList(BaseModel):
    teams: list[TeamOut]