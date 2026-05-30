"""
Addon routes for news_fetcher.py — Wikipedia squad scraper.
To be appended to /root/news_fetcher.py on the Silicon Valley server.

Parses https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads
Structure: <h3>TeamName</h3> ... <table class="wikitable">No.|Pos.|Player|...</table>
"""
import logging
import re
import subprocess
import unicodedata

from lxml import etree

logger = logging.getLogger(__name__)

WIKI_URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads"

POS_MAP = {
    "1GK": "门将", "GK": "门将",
    "2DF": "后卫", "DF": "后卫",
    "3MF": "中场", "MF": "中场",
    "4FW": "前锋", "FW": "前锋",
}

TEAM_NAME_TO_CODE = {
    "argentina": "ARG", "algeria": "ALG", "australia": "AUS",
    "austria": "AUT", "belgium": "BEL", "bosnia and herzegovina": "BIH",
    "brazil": "BRA", "canada": "CAN", "cape verde": "CPV",
    "colombia": "COL", "croatia": "CRO", "curacao": "CUW",
    "curaçao": "CUW", "czech republic": "CZE", "dr congo": "COD",
    "ecuador": "ECU", "egypt": "EGY", "england": "ENG",
    "france": "FRA", "germany": "GER", "ghana": "GHA",
    "haiti": "HAI", "iran": "IRN", "iraq": "IRQ",
    "ivory coast": "CIV", "japan": "JPN", "jordan": "JOR",
    "mexico": "MEX", "morocco": "MAR", "netherlands": "NED",
    "new zealand": "NZL", "norway": "NOR", "panama": "PAN",
    "paraguay": "PAR", "portugal": "POR", "qatar": "QAT",
    "saudi arabia": "KSA", "scotland": "SCO", "senegal": "SEN",
    "south africa": "RSA", "south korea": "KOR", "spain": "ESP",
    "sweden": "SWE", "switzerland": "SUI", "tunisia": "TUN",
    "turkey": "TUR", "united states": "USA", "uruguay": "URU",
    "uzbekistan": "UZB",
}


def _fetch_wikipedia_html():
    """Fetch Wikipedia squad page via curl (requests blocked by CloudFront)."""
    proc = subprocess.run(
        [
            "curl", "-s", "--max-time", "30",
            "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "-H", "Accept-Language: en-US,en;q=0.9",
            WIKI_URL,
        ],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed: {proc.stderr}")
    return proc.stdout


def _normalize_team_name(name):
    n = name.strip().lower()
    n = "".join(c for c in unicodedata.normalize("NFKD", n) if unicodedata.category(c) != "Mn")
    n = re.sub(r"\s*\([^)]*\)", "", n)
    n = re.sub(r"[^a-z ]", "", n)
    return n.strip()


def _team_code(name):
    norm = _normalize_team_name(name)
    if norm in TEAM_NAME_TO_CODE:
        return TEAM_NAME_TO_CODE[norm]
    for key, code in TEAM_NAME_TO_CODE.items():
        if key in norm or norm in key:
            return code
    logger.warning("No FIFA code match for team: %s", name)
    return ""


def _element_position(el):
    """Count preceding elements for document-order comparison."""
    return len(el.xpath("preceding::*"))


def _parse_squads(html):
    """Parse Wikipedia HTML into list of {code, name, players}."""
    tree = etree.HTML(html)
    h3s = tree.xpath('//h3')
    logger.info("Found %d h3 headers, %d wikitable tables",
                len(h3s), len(tree.xpath('//table[contains(@class, "wikitable")]')))

    squads_map = {}

    for i, h3 in enumerate(h3s):
        text = " ".join((h3.text or "").split())
        if not text or len(text) >= 80:
            continue

        # Find all following wikitables
        following_tables = h3.xpath('following::table[contains(@class, "wikitable")]')
        if not following_tables:
            continue

        # Determine which tables belong to this h3 (before the next h3)
        next_h3s = h3.xpath('following::h3')
        next_h3_pos = _element_position(next_h3s[0]) if next_h3s else float("inf")

        for table in following_tables:
            table_pos = _element_position(table)
            if table_pos > next_h3_pos:
                break  # This table belongs to the next team
            players = _parse_wikitable(table)
            if players:
                code = _team_code(text)
                if code in squads_map:
                    squads_map[code]["players"].extend(players)
                elif len(players) >= 11:
                    squads_map[code] = {"code": code, "name": text, "players": players}

    result = list(squads_map.values())
    logger.info("Parsed %d teams from Wikipedia", len(result))
    return result


def _parse_wikitable(table):
    """Parse a Wikipedia wikitable. Returns list of {no, pos, name_en, club}."""
    players = []
    rows = table.xpath(".//tr")
    header_done = False

    for row in rows:
        cells = row.xpath(".//th | .//td")
        if not cells:
            continue
        texts = [" ".join((c.text_content() or "").split()) for c in cells]

        # Detect header row
        if not header_done:
            joined = " ".join(texts).lower()
            if "no." in joined or ("pos." in joined and "player" in joined):
                header_done = True
            continue

        if len(texts) < 3:
            continue

        no_str = texts[0]
        pos_str = texts[1]
        name_str = texts[2]
        # Club is typically column 6 (0-indexed), fallback to last column
        club_str = texts[6] if len(texts) > 6 else texts[-1]

        try:
            no = int(no_str.strip())
        except ValueError:
            continue

        if no <= 0 or no > 99:
            continue

        pos_cn = POS_MAP.get(pos_str.strip(), pos_str.strip())

        if name_str and pos_str:
            players.append({
                "no": no,
                "pos": pos_cn,
                "name_en": name_str,
                "club": club_str,
            })

    return players


# ---- Flask route (app is defined in news_fetcher.py) ----

@app.route("/fetch_squads", methods=["GET"])
def fetch_squads():
    """Fetch and parse Wikipedia 2026 World Cup squads."""
    try:
        html = _fetch_wikipedia_html()
        logger.info("Fetched Wikipedia HTML: %d bytes", len(html))
        teams = _parse_squads(html)
        return jsonify({
            "teams": teams,
            "count": len(teams),
            "source": WIKI_URL,
        })
    except Exception as e:
        logger.exception("fetch_squads failed")
        return jsonify({"error": str(e)}), 500
