"""
Seed worldcup_matches and worldcup_teams tables from frontend JS data.

Usage:
    cd backend
    python scripts/seed_worldcup.py

Requires the miniprogram/ directory to exist alongside the backend,
so the script can read matches.js and teams.js via Node.js.
"""
import asyncio
import json
import os
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

# Add parent to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import async_session_factory
from app.models.worldcup import Match, Team


def export_js(filepath: str) -> dict:
    """Run a JS file that module.exports data and return as Python dict."""
    script = f"const m = require('{filepath.as_posix()}'); console.log(JSON.stringify(m));"
    proc = subprocess.run(
        ["node", "-e", script],
        capture_output=True, text=True, cwd=filepath.parent,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Node.js error for {filepath}: {proc.stderr}")
    return json.loads(proc.stdout)


def to_date(d: str | date) -> date:
    if isinstance(d, date):
        return d
    return datetime.strptime(d, "%Y-%m-%d").date()


async def seed_matches(matches_data: list[dict], knockout_data: list[dict], groups_data: dict) -> int:
    """Insert all matches into the database. Replicates the JS generation logic."""
    # Build group name → team list map from groups data
    # Actually the matches_data already has group matches generated.
    # We'll seed directly from matches_data (group) + knockout_data.
    async with async_session_factory() as db:
        count = 0
        for m in matches_data + knockout_data:
            match = Match(
                id=m["id"],
                date=to_date(m["date"]),
                time=m["time"],
                team_a_code=m["teamA"]["code"],
                team_a_name=m["teamA"]["name"],
                team_a_flag=m["teamA"]["flag"],
                team_b_code=m["teamB"]["code"],
                team_b_name=m["teamB"]["name"],
                team_b_flag=m["teamB"]["flag"],
                group_name=m.get("group"),
                stage=m.get("stage", "group"),
                round=m.get("round"),
                status=m.get("status", "upcoming"),
                score_a=m.get("scoreA"),
                score_b=m.get("scoreB"),
            )
            db.add(match)
            count += 1
        await db.commit()
        print(f"Seeded {count} matches")
        return count


async def seed_teams(teams_data: dict, groups_data: dict) -> int:
    """Insert all teams into the database."""
    # Map groups to team codes
    group_map = {}
    for letter, team_list in groups_data.items():
        for t in team_list:
            group_map[t["code"]] = letter

    async with async_session_factory() as db:
        count = 0
        for code, data in teams_data.items():
            team = Team(
                code=code,
                name=data.get("name", ""),
                flag=data.get("flag", ""),
                group_name=group_map.get(code, ""),
                fifa_rank=data.get("fifaRank"),
                appearances=data.get("appearances", 0),
                best_result=data.get("best", ""),
                coach=data.get("coach", ""),
                key_player=data.get("keyPlayer", ""),
                squad_confirmed=data.get("squadConfirmed", False),
                squad_data=data.get("squad") if data.get("squad") else None,
            )
            db.add(team)
            count += 1
        await db.commit()
        print(f"Seeded {count} teams")
        return count


async def main():
    # Locate frontend data files
    base = Path(__file__).resolve().parent.parent.parent.parent / "miniprogram" / "pages" / "worldcup"
    matches_js = base / "matches.js"
    teams_js = base / "teams.js"

    if not matches_js.exists():
        print(f"ERROR: {matches_js} not found")
        sys.exit(1)
    if not teams_js.exists():
        print(f"ERROR: {teams_js} not found")
        sys.exit(1)

    print(f"Reading {matches_js} ...")
    matches_data = export_js(matches_js)
    print(f"Reading {teams_js} ...")
    teams_data = export_js(teams_js)

    print(f"Loaded {len(matches_data['groupMatches'])} group matches, "
          f"{len(matches_data['knockoutMatches'])} knockout matches, "
          f"{len(teams_data)} teams")

    await seed_matches(
        matches_data["groupMatches"],
        matches_data["knockoutMatches"],
        matches_data.get("groups", {}),
    )
    await seed_teams(teams_data, matches_data.get("groups", {}))

    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
