"""
Silicon Valley News Fetcher —— 硅谷新闻抓取代理
为阿里云上海服务器提供境外军事新闻源的批量抓取服务。
Includes /fetch_squads route for Wikipedia World Cup squad data.
"""

import json
import logging
import re
import subprocess
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from threading import Semaphore

import feedparser
import requests
from flask import Flask, request, Response, jsonify
from lxml import etree

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
}

# 直接 RSS 源（不用 Google News 代理）
RSS_SOURCES = [
    {
        "name": "Breaking Defense",
        "url": "https://breakingdefense.com/feed/",
        "category": "军事",
    },
    {
        "name": "Naval News",
        "url": "https://www.navalnews.com/feed/",
        "category": "军事",
    },
    {
        "name": "Defense News",
        "url": "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
        "category": "军事",
    },
    {
        "name": "自由時報",
        "url": "https://news.ltn.com.tw/rss/all.xml",
        "category": "军事",
    },
    {
        "name": "War on the Rocks",
        "url": "https://warontherocks.com/feed/",
        "category": "军事",
    },
]


def _extract_article_text(html: str) -> str:
    """用 readability-lxml 提取文章正文。"""
    try:
        from lxml.html import fromstring
        from readability import Document

        doc = Document(html)
        summary_html = doc.summary()
        tree = fromstring(summary_html)
        text = tree.text_content()
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:30000]
    except Exception:
        return ""


def fetch_rss_entries(source: dict, max_items: int = 5) -> list[dict]:
    """抓取单个 RSS 源的条目。"""
    try:
        resp = requests.get(source["url"], headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        logger.warning("Failed to fetch RSS from %s: %s", source["name"], e)
        return []

    feed = feedparser.parse(resp.text)
    entries = []
    for entry in feed.entries[:max_items]:
        link = getattr(entry, "link", None) or ""
        title = getattr(entry, "title", "") or ""
        summary_raw = getattr(entry, "summary", "") or ""
        content_raw = ""
        if hasattr(entry, "content") and entry.content:
            content_raw = entry.content[0].get("value", "") if entry.content else ""

        if not title or not link:
            continue

        entries.append({
            "title": title,
            "link": link,
            "summary": summary_raw,
            "fulltext": "",
            "source_name": source["name"],
            "category": source["category"],
        })
    return entries


def _fetch_fulltext_for_entries(entries: list[dict], max_workers: int = 5) -> list[dict]:
    """并发抓取文章全文。"""
    if not entries:
        return entries

    with requests.Session() as session:
        session.headers.update(HEADERS)
        sem = Semaphore(max_workers)

        def fetch_one(entry):
            with sem:
                try:
                    resp = session.get(entry["link"], timeout=30)
                    resp.raise_for_status()
                    text = _extract_article_text(resp.text)
                    if text:
                        entry["fulltext"] = text
                except Exception:
                    pass
                return entry

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(fetch_one, e) for e in entries]
            results = [f.result() for f in futures]

    return results


# ======================================================================
# Wikipedia World Cup Squad Fetcher
# ======================================================================

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
    return len(el.xpath("preceding::*"))


def _parse_squads(html):
    """Parse Wikipedia HTML into list of {code, name, players}."""
    tree = etree.HTML(html)
    h3s = tree.xpath('//h3')
    all_tables = tree.xpath('//table[contains(@class, "wikitable")]')
    logger.info("Found %d h3 headers, %d wikitable tables", len(h3s), len(all_tables))

    squads_map = {}

    for h3 in h3s:
        text = " ".join("".join(h3.itertext()).split())
        if not text or len(text) >= 80:
            continue

        following_tables = h3.xpath('following::table[contains(@class, "wikitable")]')
        if not following_tables:
            continue

        next_h3s = h3.xpath('following::h3')
        next_h3_pos = _element_position(next_h3s[0]) if next_h3s else float("inf")

        for table in following_tables:
            table_pos = _element_position(table)
            if table_pos > next_h3_pos:
                break
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
        texts = [" ".join("".join(c.itertext()).split()) for c in cells]

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
        club_str = texts[6] if len(texts) > 6 else texts[-1]

        # Jersey number may be empty (not yet announced); default to 0
        no = 0
        no_str_stripped = no_str.strip()
        if no_str_stripped:
            try:
                no = int(no_str_stripped)
            except ValueError:
                no = 0
        if no < 0 or no > 99:
            no = 0

        pos_cn = POS_MAP.get(pos_str.strip(), pos_str.strip())

        if name_str and pos_str:
            players.append({
                "no": no,
                "pos": pos_cn,
                "name_en": name_str,
                "club": club_str,
            })

    return players


# ======================================================================
# Routes
# ======================================================================

@app.route("/fetch_batch", methods=["POST"])
def fetch_batch():
    """批量抓取：RSS → 全文"""
    try:
        data = request.get_json(silent=True) or {}
        per_source = int(data.get("per_source", 5))

        all_entries = []
        for source in RSS_SOURCES:
            try:
                entries = fetch_rss_entries(source, max_items=per_source)
                logger.info("RSS %s: %d entries", source["name"], len(entries))
                all_entries.extend(entries)
            except Exception as exc:
                logger.exception("RSS source %s failed", source["name"])

        all_entries = _fetch_fulltext_for_entries(all_entries)

        logger.info("Batch fetch complete: %d articles", len(all_entries))
        return jsonify({"articles": all_entries})
    except Exception as e:
        logger.exception("fetch_batch failed")
        return jsonify({"error": str(e), "articles": []}), 500


@app.route("/fetch_article", methods=["GET"])
def fetch_article():
    """抓取单篇文章全文。"""
    url = request.args.get("url", "")
    if not url:
        return jsonify({"error": "missing url"}), 400

    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        logger.warning("Failed to fetch article: %s", e)
        return jsonify({"error": str(e)}), 502

    fulltext = _extract_article_text(resp.text)

    title = ""
    try:
        from lxml.html import fromstring
        tree = fromstring(resp.text)
        title_el = tree.cssselect("title") or tree.xpath("//title")
        if title_el:
            title = title_el[0].text_content().strip()
    except Exception:
        pass

    return jsonify({
        "title": title,
        "fulltext": fulltext,
        "content_length": len(fulltext),
    })


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


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "sources": len(RSS_SOURCES)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
