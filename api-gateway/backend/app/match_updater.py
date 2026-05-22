"""
Daily match status updater. Runs via APScheduler.

- Auto-transitions match status based on Beijing time (UTC+8):
  upcoming → live when match time arrives
  live → finished ~2 hours after kickoff
- If an external data source is configured, fetches actual scores.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

from app.core.database import async_session
from app.models.worldcup import Match

logger = logging.getLogger(__name__)

BEIJING_TZ = timezone(timedelta(hours=8))


def _beijing_now() -> datetime:
    return datetime.now(timezone.utc).astimezone(BEIJING_TZ)


async def run_match_updates() -> dict:
    """
    Main entry point called by the scheduler.
    Returns a summary dict of what was updated.
    """
    now_utc = datetime.now(timezone.utc)
    now_bj = now_utc.astimezone(BEIJING_TZ)
    summary = {"live": 0, "finished": 0, "scores_updated": 0}

    async with async_session() as db:
        # 1. Find matches that should be live now
        #    (match has started but not yet finished, status is still "upcoming")
        result = await db.execute(
            select(Match).where(
                Match.status == "upcoming",
            )
        )
        upcoming_matches = result.scalars().all()

        for m in upcoming_matches:
            match_start_bj = _match_start_bj(m)
            match_end_bj = match_start_bj + timedelta(hours=2, minutes=30)

            if match_start_bj <= now_bj < match_end_bj:
                m.status = "live"
                m.updated_at = datetime.now(timezone.utc)
                summary["live"] += 1
                logger.info("Match #%d (%s vs %s) → live", m.id, m.team_a_code, m.team_b_code)
            elif now_bj >= match_end_bj:
                m.status = "finished"
                m.updated_at = datetime.now(timezone.utc)
                summary["finished"] += 1
                logger.info("Match #%d (%s vs %s) → finished (no score data)", m.id, m.team_a_code, m.team_b_code)

        # 2. Find live matches that should be finished
        result = await db.execute(
            select(Match).where(Match.status == "live")
        )
        live_matches = result.scalars().all()

        for m in live_matches:
            match_start_bj = _match_start_bj(m)
            match_end_bj = match_start_bj + timedelta(hours=2, minutes=30)

            if now_bj >= match_end_bj:
                # Try to fetch scores from external source
                scores = await _fetch_scores(m)
                if scores:
                    m.score_a = scores[0]
                    m.score_b = scores[1]
                    summary["scores_updated"] += 1
                m.status = "finished"
                m.updated_at = datetime.now(timezone.utc)
                summary["finished"] += 1
                logger.info("Match #%d (%s vs %s) → finished (score: %s-%s)",
                            m.id, m.team_a_code, m.team_b_code, m.score_a, m.score_b)

        await db.commit()

    if any(v > 0 for v in summary.values()):
        logger.info("Match updater summary: %s", summary)
    return summary


def _match_start_bj(m: Match) -> datetime:
    """Parse match date + time as Beijing time."""
    hour, minute = int(m.time[:2]), int(m.time[3:5])
    return datetime(
        m.date.year, m.date.month, m.date.day,
        hour, minute, 0,
        tzinfo=BEIJING_TZ,
    )


async def run_squad_updates() -> dict:
    """
    Update team squad data from an external API. Runs every 12 hours.
    Set WORLDCUP_SQUADS_API_URL in .env to enable.

    Expected API response format:
      [{"code": "KOR", "squad": [{"pos": "门将", "name": "...", "no": 1}, ...], "squadConfirmed": true}, ...]
    """
    from app.core.config import settings
    from app.models.worldcup import Team

    api_url = getattr(settings, "WORLDCUP_SQUADS_API_URL", None)
    if not api_url:
        return {"enabled": False, "reason": "WORLDCUP_SQUADS_API_URL not configured"}

    summary = {"updated": 0, "unchanged": 0, "teams_checked": 0}

    try:
        import aiohttp

        async with async_session() as db:
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status != 200:
                        logger.warning("Squad API returned HTTP %d", resp.status)
                        return {"enabled": True, "error": f"HTTP {resp.status}"}
                    data = await resp.json()

            for item in data or []:
                code = item.get("code")
                if not code:
                    continue
                summary["teams_checked"] += 1

                result = await db.execute(select(Team).where(Team.code == code))
                team = result.scalar_one_or_none()
                if not team:
                    continue

                new_squad = item.get("squad")
                new_confirmed = item.get("squadConfirmed")
                changed = False

                if new_squad is not None and new_squad != team.squad_data:
                    team.squad_data = new_squad
                    changed = True
                if new_confirmed is not None and new_confirmed != team.squad_confirmed:
                    team.squad_confirmed = new_confirmed
                    changed = True

                if changed:
                    team.updated_at = datetime.now(timezone.utc)
                    summary["updated"] += 1
                    logger.info("Squad updated for %s (%d players, confirmed=%s)",
                                code, len(new_squad) if new_squad else 0, new_confirmed)
                else:
                    summary["unchanged"] += 1

            if summary["updated"] > 0:
                await db.commit()

    except Exception as e:
        logger.exception("Squad update failed: %s", e)
        return {"enabled": True, "error": str(e)}

    if summary["updated"] > 0:
        logger.info("Squad updater summary: %s", summary)
    return summary


async def _fetch_scores(m: Match) -> tuple[int, int] | None:
    """
    Try to fetch actual scores from an external API.
    Placeholder — extend with real API integration when available.

    Set WORLDCUP_SCORES_API_URL in .env to enable.
    Expected API response format:
      {"home_score": 2, "away_score": 1}
    """
    from app.core.config import settings

    api_url = getattr(settings, "WORLDCUP_SCORES_API_URL", None)
    if not api_url:
        return None

    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            url = f"{api_url}?home_team={m.team_a_name}&away_team={m.team_b_name}&date={m.date.isoformat()}"
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return (int(data.get("home_score", 0)), int(data.get("away_score", 0)))
    except Exception as e:
        logger.warning("Failed to fetch scores for match #%d: %s", m.id, e)

    return None
