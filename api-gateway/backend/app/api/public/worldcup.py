from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.worldcup import MatchList, MatchOut, TeamList, TeamOut
from app.services import worldcup_service

router = APIRouter(prefix="/worldcup", tags=["public-worldcup"])


def _match_to_out(match) -> MatchOut:
    return MatchOut(
        id=match.id,
        date=match.date,
        time=match.time,
        teamA={"code": match.team_a_code, "name": match.team_a_name, "flag": match.team_a_flag},
        teamB={"code": match.team_b_code, "name": match.team_b_name, "flag": match.team_b_flag},
        group=match.group_name,
        stage=match.stage,
        round=match.round,
        status=match.status,
        scoreA=match.score_a,
        scoreB=match.score_b,
    )


def _team_to_out(team) -> TeamOut:
    return TeamOut(
        code=team.code,
        name=team.name,
        flag=team.flag,
        group=team.group_name,
        fifaRank=team.fifa_rank,
        appearances=team.appearances,
        best=team.best_result,
        coach=team.coach,
        keyPlayer=team.key_player,
        squadConfirmed=team.squad_confirmed if team.squad_confirmed is not None else False,
        squad=team.squad_data or [],
        updatedAt=team.updated_at,
    )


@router.get("/matches", response_model=MatchList)
async def get_matches(db: AsyncSession = Depends(get_db)):
    matches = await worldcup_service.get_all_matches(db)
    return MatchList(matches=[_match_to_out(m) for m in matches])


@router.get("/matches/{match_id}", response_model=MatchOut)
async def get_match_detail(match_id: int, db: AsyncSession = Depends(get_db)):
    match = await worldcup_service.get_match(db, match_id)
    if not match:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="比赛不存在")
    return _match_to_out(match)


@router.get("/teams", response_model=TeamList)
async def get_teams(db: AsyncSession = Depends(get_db)):
    teams = await worldcup_service.get_all_teams(db)
    return TeamList(teams=[_team_to_out(t) for t in teams])


@router.get("/teams/{code}", response_model=TeamOut)
async def get_team_detail(code: str, db: AsyncSession = Depends(get_db)):
    team = await worldcup_service.get_team(db, code)
    if not team:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="球队不存在")
    return _team_to_out(team)
