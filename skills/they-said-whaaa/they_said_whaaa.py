#!/usr/bin/env python3
"""
they-said-whaaa CLI — Credibility and consistency tracking for public figures.

Architecture:
  tsw-public-figure (domain-thing) — a politician or public figure
  tsw-statement     (domain-thing) — a video, interview, speech, or article
  tsw-topic         (domain-thing) — a political or social topic
  tsw-claim         (fragment)     — a specific claim extracted from a statement
  tsw-transcript    (artifact)     — raw transcript text (linked to a statement)
  tsw-article       (artifact)     — raw article text (linked to a statement)
  tsw-analysis-note (note)         — Claude's analysis or annotation
  tsw-investigation (collection)   — a research investigation

Key relations:
  tsw-made-statement  : speaker (figure) → statement
  tsw-contains-claim  : statement → claim
  tsw-statement-topic : statement → topic
  tsw-claimed         : speaker (figure), claim, topic  (the analysis triple)
  tsw-contradicts     : claim1 ↔ claim2
  tsw-supports        : claim1 → claim2
  representation      : artifact → statement (links transcript/article to statement)
  fragmentation       : artifact (whole) → claim (part)

Commands:
    add-figure          Add a public figure
    list-figures        List all figures
    show-figure         Show figure with statements and claims

    add-topic           Add a topic
    list-topics         List all topics

    add-statement       Add a statement (video/speech/article) entity
    ingest-youtube      Fetch YouTube transcript, create statement + transcript artifact
    ingest-article      Fetch news article, create statement + article artifact
    list-statements     List all statements
    show-statement      Show statement with its transcript and claims

    add-claim           Add a claim extracted from a statement
    link-claim          Link a claim to speaker and topic (tsw-claimed triple)
    flag-contradiction  Mark two claims as contradicting
    list-claims         List claims (filterable)
    get-timeline        Chronological claims for a figure/topic
    list-contradictions List all contradiction pairs
    compare-figures     Compare figures' claims on a topic

    create-investigation  Create an investigation collection
    list-investigations   List investigations
"""

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone

try:
    import requests
    from bs4 import BeautifulSoup
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

try:
    from typedb.driver import Credentials, DriverOptions, TransactionType, TypeDB
    TYPEDB_AVAILABLE = True
except ImportError:
    TYPEDB_AVAILABLE = False

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

TYPEDB_HOST = os.getenv("TYPEDB_HOST", "localhost")
TYPEDB_PORT = int(os.getenv("TYPEDB_PORT", "1729"))
TYPEDB_DATABASE = os.getenv("TYPEDB_DATABASE", "alhazen_notebook")
TYPEDB_USERNAME = os.getenv("TYPEDB_USERNAME", "admin")
TYPEDB_PASSWORD = os.getenv("TYPEDB_PASSWORD", "password")


# ---------------------------------------------------------------------------
# Inline utilities (self-contained — no internal package imports needed)
# ---------------------------------------------------------------------------

def escape_string(s: str) -> str:
    if s is None:
        return ""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "")


def generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def get_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


# ---------------------------------------------------------------------------
# Driver helpers
# ---------------------------------------------------------------------------

def get_driver():
    if not TYPEDB_AVAILABLE:
        print(json.dumps({"success": False, "error": "typedb-driver not installed. Run: uv sync --all-extras"}))
        sys.exit(1)
    return TypeDB.driver(
        f"{TYPEDB_HOST}:{TYPEDB_PORT}",
        Credentials(TYPEDB_USERNAME, TYPEDB_PASSWORD),
        DriverOptions(is_tls_enabled=False),
    )


def _write(driver, query: str):
    with driver.transaction(TYPEDB_DATABASE, TransactionType.WRITE) as tx:
        tx.query(query).resolve()
        tx.commit()


def _read(driver, query: str) -> list:
    with driver.transaction(TYPEDB_DATABASE, TransactionType.READ) as tx:
        return list(tx.query(query).resolve())


# ---------------------------------------------------------------------------
# Figure management
# ---------------------------------------------------------------------------

def cmd_add_figure(args):
    figure_id = generate_id("tsw-figure")
    ts = get_timestamp()
    q = (
        f'insert $f isa tsw-public-figure,'
        f' has id "{figure_id}",'
        f' has name "{escape_string(args.name)}",'
        f' has created-at {ts}'
    )
    if args.description:
        q += f', has description "{escape_string(args.description)}"'
    if args.office:
        q += f', has tsw-office "{escape_string(args.office)}"'
    if args.party:
        q += f', has tsw-party "{escape_string(args.party)}"'
    if args.country:
        q += f', has tsw-country "{escape_string(args.country)}"'
    if args.url:
        q += f', has tsw-figure-url "{escape_string(args.url)}"'
    q += ";"
    with get_driver() as driver:
        _write(driver, q)
    print(json.dumps({"success": True, "figure_id": figure_id, "name": args.name}))


def cmd_list_figures(args):
    q = """match $f isa tsw-public-figure;
fetch {
    "id": $f.id,
    "name": $f.name,
    "office": $f.tsw-office,
    "party": $f.tsw-party,
    "country": $f.tsw-country,
    "created": $f.created-at
};"""
    with get_driver() as driver:
        results = _read(driver, q)
    print(json.dumps({"success": True, "count": len(results), "figures": results}, default=str))


def cmd_show_figure(args):
    q = f"""match $f isa tsw-public-figure, has id "{args.id}";
fetch {{
    "id": $f.id,
    "name": $f.name,
    "description": $f.description,
    "office": $f.tsw-office,
    "party": $f.tsw-party,
    "country": $f.tsw-country,
    "url": $f.tsw-figure-url,
    "created": $f.created-at
}};"""

    statements_q = f"""match
    $f isa tsw-public-figure, has id "{args.id}";
    $s isa tsw-statement;
    (speaker: $f, statement: $s) isa tsw-made-statement;
fetch {{
    "id": $s.id,
    "name": $s.name,
    "platform": $s.tsw-platform,
    "date": $s.tsw-statement-date
}};"""

    claims_q = f"""match
    $f isa tsw-public-figure, has id "{args.id}";
    $c isa tsw-claim;
    (speaker: $f, claim: $c) isa tsw-claimed;
fetch {{
    "id": $c.id,
    "text": $c.tsw-claim-text,
    "type": $c.tsw-claim-type,
    "position": $c.tsw-position,
    "confidence": $c.tsw-claim-confidence,
    "created": $c.created-at
}};"""

    with get_driver() as driver:
        figure = _read(driver, q)
        if not figure:
            print(json.dumps({"success": False, "error": f"Figure {args.id} not found"}))
            return
        statements = _read(driver, statements_q)
        claims = _read(driver, claims_q)

    print(json.dumps({
        "success": True,
        "figure": figure[0],
        "statements": statements,
        "claims": claims,
    }, default=str))


# ---------------------------------------------------------------------------
# Topic management
# ---------------------------------------------------------------------------

def cmd_add_topic(args):
    topic_id = generate_id("tsw-topic")
    ts = get_timestamp()
    q = (
        f'insert $t isa tsw-topic,'
        f' has id "{topic_id}",'
        f' has name "{escape_string(args.name)}",'
        f' has created-at {ts}'
    )
    if args.description:
        q += f', has description "{escape_string(args.description)}"'
    q += ";"
    with get_driver() as driver:
        _write(driver, q)
    print(json.dumps({"success": True, "topic_id": topic_id, "name": args.name}))


def cmd_list_topics(args):
    q = """match $t isa tsw-topic;
fetch {
    "id": $t.id,
    "name": $t.name,
    "description": $t.description,
    "created": $t.created-at
};"""
    with get_driver() as driver:
        results = _read(driver, q)
    print(json.dumps({"success": True, "count": len(results), "topics": results}, default=str))


# ---------------------------------------------------------------------------
# Statement management
# ---------------------------------------------------------------------------

def cmd_add_statement(args):
    """Create a tsw-statement entity (for a video/speech/article)."""
    stmt_id = generate_id("tsw-statement")
    ts = get_timestamp()
    q = (
        f'insert $s isa tsw-statement,'
        f' has id "{stmt_id}",'
        f' has name "{escape_string(args.name)}",'
        f' has created-at {ts}'
    )
    if args.platform:
        q += f', has tsw-platform "{escape_string(args.platform)}"'
    if args.video_id:
        q += f', has tsw-video-id "{escape_string(args.video_id)}"'
    if args.video_url:
        q += f', has tsw-video-url "{escape_string(args.video_url)}"'
    if args.date:
        q += f', has tsw-statement-date {args.date}'
    if args.duration:
        q += f', has tsw-duration-seconds {args.duration}'
    q += ";"

    with get_driver() as driver:
        _write(driver, q)
        if args.figure_id:
            link_q = f"""match
    $f isa tsw-public-figure, has id "{args.figure_id}";
    $s isa tsw-statement, has id "{stmt_id}";
insert (speaker: $f, statement: $s) isa tsw-made-statement;"""
            _write(driver, link_q)
        if args.topic_id:
            topic_q = f"""match
    $s isa tsw-statement, has id "{stmt_id}";
    $t isa tsw-topic, has id "{args.topic_id}";
insert (statement: $s, topic: $t) isa tsw-statement-topic;"""
            _write(driver, topic_q)

    print(json.dumps({"success": True, "statement_id": stmt_id, "name": args.name}))


def _fetch_article_text(url: str) -> tuple[str, str]:
    if not REQUESTS_AVAILABLE:
        raise RuntimeError("requests/bs4 not installed. Run: uv sync --all-extras")
    headers = {"User-Agent": "Mozilla/5.0 (compatible; AlhazenBot/1.0)"}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    title = soup.title.string.strip() if soup.title else url
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    return title, text


def cmd_ingest_youtube(args):
    try:
        from youtube_transcript_api import YouTubeTranscriptApi  # noqa: PLC0415
    except ImportError:
        if not args.transcript_file:
            print(json.dumps({
                "success": False,
                "error": (
                    "youtube-transcript-api not installed. "
                    "Run: uv sync --extra they-said-whaaa  "
                    "OR provide --transcript-file FILE"
                )
            }))
            sys.exit(1)

    # Extract video ID from URL
    video_id = args.url
    for prefix in ("https://www.youtube.com/watch?v=", "https://youtu.be/"):
        if args.url.startswith(prefix):
            video_id = args.url[len(prefix):].split("&")[0]
            break

    if args.transcript_file:
        with open(args.transcript_file) as f:
            transcript_text = f.read()
    else:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            transcript_text = "\n".join(
                f"[{int(entry['start'])}s] {entry['text']}"
                for entry in transcript_list
            )
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Transcript fetch failed: {e}"}))
            sys.exit(1)

    name = args.name or f"YouTube: {video_id}"
    ts = get_timestamp()
    stmt_date = args.date or ts

    # Create tsw-statement
    stmt_id = generate_id("tsw-statement")
    stmt_q = (
        f'insert $s isa tsw-statement,'
        f' has id "{stmt_id}",'
        f' has name "{escape_string(name)}",'
        f' has tsw-platform "youtube",'
        f' has tsw-video-id "{escape_string(video_id)}",'
        f' has tsw-video-url "{escape_string(args.url)}",'
        f' has tsw-statement-date {stmt_date},'
        f' has created-at {ts};'
    )

    # Create tsw-transcript artifact
    from skillful_alhazen.utils.cache import save_to_cache, should_cache  # noqa: PLC0415
    artifact_id = generate_id("tsw-transcript")
    if should_cache(transcript_text):
        cache_result = save_to_cache(artifact_id, transcript_text, "text/plain")
        content_clause = f'has cache-path "{escape_string(cache_result["cache_path"])}"'
    else:
        content_clause = f'has content "{escape_string(transcript_text)}"'

    artifact_q = (
        f'insert $a isa tsw-transcript,'
        f' has id "{artifact_id}",'
        f' has name "{escape_string(name)}",'
        f' has source-uri "{escape_string(args.url)}",'
        f' has created-at {ts},'
        f' {content_clause};'
    )

    with get_driver() as driver:
        _write(driver, stmt_q)
        _write(driver, artifact_q)

        # Link artifact to statement via representation
        rep_q = f"""match
    $a isa tsw-transcript, has id "{artifact_id}";
    $s isa tsw-statement, has id "{stmt_id}";
insert (artifact: $a, referent: $s) isa representation;"""
        _write(driver, rep_q)

        if args.figure_id:
            link_q = f"""match
    $f isa tsw-public-figure, has id "{args.figure_id}";
    $s isa tsw-statement, has id "{stmt_id}";
insert (speaker: $f, statement: $s) isa tsw-made-statement;"""
            _write(driver, link_q)

    print(json.dumps({
        "success": True,
        "statement_id": stmt_id,
        "artifact_id": artifact_id,
        "video_id": video_id,
        "name": name,
        "chars": len(transcript_text),
        "message": "Transcript stored. Use show-statement to read, then add-claim to extract claims.",
    }))


def cmd_ingest_article(args):
    try:
        title, text = _fetch_article_text(args.url)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to fetch article: {e}"}))
        sys.exit(1)

    name = args.name or title[:200]
    ts = get_timestamp()
    stmt_date = args.date or ts

    stmt_id = generate_id("tsw-statement")
    stmt_q = (
        f'insert $s isa tsw-statement,'
        f' has id "{stmt_id}",'
        f' has name "{escape_string(name)}",'
        f' has tsw-platform "article",'
        f' has tsw-video-url "{escape_string(args.url)}",'
        f' has tsw-statement-date {stmt_date},'
        f' has created-at {ts};'
    )

    from skillful_alhazen.utils.cache import save_to_cache, should_cache  # noqa: PLC0415
    artifact_id = generate_id("tsw-article")
    if should_cache(text):
        cache_result = save_to_cache(artifact_id, text, "text/plain")
        content_clause = f'has cache-path "{escape_string(cache_result["cache_path"])}"'
    else:
        content_clause = f'has content "{escape_string(text)}"'

    artifact_q = (
        f'insert $a isa tsw-article,'
        f' has id "{artifact_id}",'
        f' has name "{escape_string(name)}",'
        f' has source-uri "{escape_string(args.url)}",'
        f' has created-at {ts},'
        f' {content_clause};'
    )

    with get_driver() as driver:
        _write(driver, stmt_q)
        _write(driver, artifact_q)

        rep_q = f"""match
    $a isa tsw-article, has id "{artifact_id}";
    $s isa tsw-statement, has id "{stmt_id}";
insert (artifact: $a, referent: $s) isa representation;"""
        _write(driver, rep_q)

        if args.figure_id:
            link_q = f"""match
    $f isa tsw-public-figure, has id "{args.figure_id}";
    $s isa tsw-statement, has id "{stmt_id}";
insert (speaker: $f, statement: $s) isa tsw-made-statement;"""
            _write(driver, link_q)

    print(json.dumps({
        "success": True,
        "statement_id": stmt_id,
        "artifact_id": artifact_id,
        "name": name,
        "chars": len(text),
        "message": "Article stored. Use show-statement to read, then add-claim to extract claims.",
    }))


def cmd_list_statements(args):
    if args.figure_id:
        q = f"""match
    $f isa tsw-public-figure, has id "{args.figure_id}";
    $s isa tsw-statement;
    (speaker: $f, statement: $s) isa tsw-made-statement;
fetch {{
    "id": $s.id,
    "name": $s.name,
    "platform": $s.tsw-platform,
    "date": $s.tsw-statement-date
}};"""
    else:
        q = """match $s isa tsw-statement;
fetch {
    "id": $s.id,
    "name": $s.name,
    "platform": $s.tsw-platform,
    "date": $s.tsw-statement-date,
    "created": $s.created-at
};"""
    with get_driver() as driver:
        results = _read(driver, q)
    print(json.dumps({"success": True, "count": len(results), "statements": results}, default=str))


def cmd_show_statement(args):
    from skillful_alhazen.utils.cache import load_from_cache_text  # noqa: PLC0415

    q = f"""match $s isa tsw-statement, has id "{args.id}";
fetch {{
    "id": $s.id,
    "name": $s.name,
    "platform": $s.tsw-platform,
    "video_id": $s.tsw-video-id,
    "video_url": $s.tsw-video-url,
    "date": $s.tsw-statement-date,
    "duration": $s.tsw-duration-seconds,
    "created": $s.created-at
}};"""

    artifact_q = f"""match
    $s isa tsw-statement, has id "{args.id}";
    $a isa identifiable-entity;
    (artifact: $a, referent: $s) isa representation;
fetch {{
    "artifact_id": $a.id,
    "content": $a.content,
    "cache_path": $a.cache-path
}};"""

    claims_q = f"""match
    $s isa tsw-statement, has id "{args.id}";
    $c isa tsw-claim;
    (statement: $s, claim: $c) isa tsw-contains-claim;
fetch {{
    "id": $c.id,
    "text": $c.tsw-claim-text,
    "type": $c.tsw-claim-type,
    "position": $c.tsw-position,
    "start": $c.tsw-timestamp-start,
    "end": $c.tsw-timestamp-end
}};"""

    with get_driver() as driver:
        stmt = _read(driver, q)
        if not stmt:
            print(json.dumps({"success": False, "error": f"Statement {args.id} not found"}))
            return
        artifacts = _read(driver, artifact_q)
        claims = _read(driver, claims_q)

    # Resolve cache paths
    for a in artifacts:
        cp = a.get("cache_path")
        if cp and not a.get("content"):
            a["content"] = load_from_cache_text(cp)

    print(json.dumps({
        "success": True,
        "statement": stmt[0],
        "artifacts": artifacts,
        "claims": claims,
    }, default=str))


# ---------------------------------------------------------------------------
# Claim management
# ---------------------------------------------------------------------------

def cmd_add_claim(args):
    """Add a claim extracted from a statement."""
    claim_id = generate_id("tsw-claim")
    ts = get_timestamp()
    q = (
        f'insert $c isa tsw-claim,'
        f' has id "{claim_id}",'
        f' has tsw-claim-text "{escape_string(args.text)}",'
        f' has name "{escape_string(args.text[:100])}",'
        f' has created-at {ts}'
    )
    if args.claim_type:
        q += f', has tsw-claim-type "{escape_string(args.claim_type)}"'
    if args.position:
        q += f', has tsw-position "{args.position}"'
    if args.confidence is not None:
        q += f", has tsw-claim-confidence {args.confidence}"
    if args.start is not None:
        q += f", has tsw-timestamp-start {args.start}"
    if args.end is not None:
        q += f", has tsw-timestamp-end {args.end}"
    q += ";"

    with get_driver() as driver:
        _write(driver, q)

        # Link claim to statement via tsw-contains-claim
        if args.statement_id:
            contains_q = f"""match
    $s isa tsw-statement, has id "{args.statement_id}";
    $c isa tsw-claim, has id "{claim_id}";
insert (statement: $s, claim: $c) isa tsw-contains-claim;"""
            _write(driver, contains_q)

            # Also link via fragmentation to the transcript artifact
            frag_q = f"""match
    $s isa tsw-statement, has id "{args.statement_id}";
    $a isa identifiable-entity;
    (artifact: $a, referent: $s) isa representation;
    $c isa tsw-claim, has id "{claim_id}";
insert (whole: $a, part: $c) isa fragmentation;"""
            try:
                _write(driver, frag_q)
            except Exception:
                pass  # OK if no artifact linked to statement

        # Link claim to speaker+topic via tsw-claimed
        if args.figure_id and args.topic_id:
            claimed_q = f"""match
    $f isa tsw-public-figure, has id "{args.figure_id}";
    $c isa tsw-claim, has id "{claim_id}";
    $t isa tsw-topic, has id "{args.topic_id}";
insert (speaker: $f, claim: $c, topic: $t) isa tsw-claimed;"""
            _write(driver, claimed_q)
        elif args.figure_id:
            # Link speaker without topic using aboutness on claim
            speaker_q = f"""match
    $f isa tsw-public-figure, has id "{args.figure_id}";
    $c isa tsw-claim, has id "{claim_id}";
    $s isa tsw-statement, has id "{args.statement_id}";
insert (speaker: $f, statement: $s) isa tsw-made-statement;"""
            # already done above via statement link; skip double-linking

    print(json.dumps({"success": True, "claim_id": claim_id}))


def cmd_link_claim(args):
    """Link a claim to a speaker and/or topic via tsw-claimed."""
    with get_driver() as driver:
        q = f"""match
    $f isa tsw-public-figure, has id "{args.figure_id}";
    $c isa tsw-claim, has id "{args.claim_id}";
    $t isa tsw-topic, has id "{args.topic_id}";
insert (speaker: $f, claim: $c, topic: $t) isa tsw-claimed;"""
        _write(driver, q)
    print(json.dumps({"success": True, "claim_id": args.claim_id, "figure_id": args.figure_id, "topic_id": args.topic_id}))


def cmd_flag_contradiction(args):
    with get_driver() as driver:
        q = f"""match
    $c1 isa tsw-claim, has id "{args.claim1}";
    $c2 isa tsw-claim, has id "{args.claim2}";
insert (claim1: $c1, claim2: $c2) isa tsw-contradicts;"""
        _write(driver, q)

        if args.contradiction_type:
            for cid in (args.claim1, args.claim2):
                type_q = f"""match $c isa tsw-claim, has id "{cid}";
insert $c has tsw-contradiction-type "{escape_string(args.contradiction_type)}";"""
                try:
                    _write(driver, type_q)
                except Exception:
                    pass  # may already have value

    print(json.dumps({"success": True, "claim1": args.claim1, "claim2": args.claim2}))


def cmd_list_claims(args):
    filters = ["$c isa tsw-claim;"]
    if args.figure_id:
        filters.append(f'$f isa tsw-public-figure, has id "{args.figure_id}";')
        filters.append("(speaker: $f, claim: $c) isa tsw-claimed;")
    if args.topic_id:
        filters.append(f'$t isa tsw-topic, has id "{args.topic_id}";')
        filters.append("(claim: $c, topic: $t) isa tsw-claimed;")
    if args.claim_type:
        filters.append(f'$c has tsw-claim-type "{escape_string(args.claim_type)}";')
    if args.position:
        filters.append(f'$c has tsw-position "{args.position}";')

    q = "match\n    " + "\n    ".join(filters) + """
fetch {
    "id": $c.id,
    "text": $c.tsw-claim-text,
    "type": $c.tsw-claim-type,
    "position": $c.tsw-position,
    "confidence": $c.tsw-claim-confidence,
    "created": $c.created-at
};"""
    with get_driver() as driver:
        results = _read(driver, q)
    print(json.dumps({"success": True, "count": len(results), "claims": results}, default=str))


def cmd_get_timeline(args):
    topic_filter = ""
    if args.topic_id:
        topic_filter = f'\n    $t isa tsw-topic, has id "{args.topic_id}";\n    (speaker: $f, claim: $c, topic: $t) isa tsw-claimed;'
    else:
        topic_filter = "\n    (speaker: $f, claim: $c) isa tsw-claimed;"

    q = f"""match
    $f isa tsw-public-figure, has id "{args.figure_id}";
    $c isa tsw-claim;
    $s isa tsw-statement;
    (statement: $s, claim: $c) isa tsw-contains-claim;{topic_filter}
fetch {{
    "claim_id": $c.id,
    "text": $c.tsw-claim-text,
    "position": $c.tsw-position,
    "type": $c.tsw-claim-type,
    "confidence": $c.tsw-claim-confidence,
    "statement_date": $s.tsw-statement-date,
    "statement_name": $s.name
}};"""

    with get_driver() as driver:
        results = _read(driver, q)

    results.sort(key=lambda r: str(r.get("statement_date") or r.get("created") or ""))
    print(json.dumps({"success": True, "figure_id": args.figure_id, "count": len(results), "timeline": results}, default=str))


def cmd_list_contradictions(args):
    figure_filter = ""
    if args.figure_id:
        figure_filter = f"""
    $f isa tsw-public-figure, has id "{args.figure_id}";
    (speaker: $f, claim: $c1) isa tsw-claimed;"""

    q = f"""match
    $c1 isa tsw-claim;
    $c2 isa tsw-claim;
    (claim1: $c1, claim2: $c2) isa tsw-contradicts;
    $c1 has id $id1; $c2 has id $id2; $id1 != $id2;{figure_filter}
fetch {{
    "claim1_id": $c1.id,
    "claim1_text": $c1.tsw-claim-text,
    "claim1_position": $c1.tsw-position,
    "claim2_id": $c2.id,
    "claim2_text": $c2.tsw-claim-text,
    "claim2_position": $c2.tsw-position,
    "contradiction_type": $c1.tsw-contradiction-type
}};"""
    with get_driver() as driver:
        results = _read(driver, q)
    print(json.dumps({"success": True, "count": len(results), "contradictions": results}, default=str))


def cmd_compare_figures(args):
    all_results = {}
    with get_driver() as driver:
        for fid in args.figure_ids:
            q = f"""match
    $f isa tsw-public-figure, has id "{fid}";
    $t isa tsw-topic, has id "{args.topic_id}";
    $c isa tsw-claim;
    (speaker: $f, claim: $c, topic: $t) isa tsw-claimed;
    $s isa tsw-statement;
    (statement: $s, claim: $c) isa tsw-contains-claim;
fetch {{
    "claim_id": $c.id,
    "text": $c.tsw-claim-text,
    "position": $c.tsw-position,
    "statement_date": $s.tsw-statement-date
}};"""
            all_results[fid] = _read(driver, q)

    print(json.dumps({"success": True, "topic_id": args.topic_id, "figures": all_results}, default=str))


# ---------------------------------------------------------------------------
# Investigations
# ---------------------------------------------------------------------------

def cmd_create_investigation(args):
    inv_id = generate_id("tsw-investigation")
    ts = get_timestamp()
    q = (
        f'insert $i isa tsw-investigation,'
        f' has id "{inv_id}",'
        f' has name "{escape_string(args.name)}",'
        f' has tsw-investigation-status "open",'
        f' has created-at {ts}'
    )
    if args.description:
        q += f', has description "{escape_string(args.description)}"'
    q += ";"
    with get_driver() as driver:
        _write(driver, q)
    print(json.dumps({"success": True, "investigation_id": inv_id, "name": args.name}))


def cmd_list_investigations(args):
    q = """match $i isa tsw-investigation;
fetch {
    "id": $i.id,
    "name": $i.name,
    "description": $i.description,
    "status": $i.tsw-investigation-status,
    "created": $i.created-at
};"""
    with get_driver() as driver:
        results = _read(driver, q)
    print(json.dumps({"success": True, "count": len(results), "investigations": results}, default=str))


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="they-said-whaaa — track public statements and detect contradictions"
    )
    sub = parser.add_subparsers(dest="command", metavar="COMMAND")

    # add-figure
    p = sub.add_parser("add-figure", help="Add a public figure")
    p.add_argument("--name", required=True)
    p.add_argument("--description")
    p.add_argument("--office", help="Office (senator, president, representative, etc.)")
    p.add_argument("--party", help="Political party")
    p.add_argument("--country", default="US")
    p.add_argument("--url", help="Wikipedia or bio URL")

    sub.add_parser("list-figures", help="List all tracked figures")

    p = sub.add_parser("show-figure", help="Show figure with statements and claims")
    p.add_argument("--id", required=True)

    # add-topic
    p = sub.add_parser("add-topic", help="Add a topic")
    p.add_argument("--name", required=True)
    p.add_argument("--description")

    sub.add_parser("list-topics", help="List all topics")

    # statement commands
    p = sub.add_parser("add-statement", help="Add a statement entity (video/speech/article)")
    p.add_argument("--name", required=True, help="Descriptive name")
    p.add_argument("--figure-id", help="Speaker figure ID")
    p.add_argument("--topic-id", help="Topic ID to link")
    p.add_argument("--platform", help="Platform (youtube, cspan, twitter, press-release, etc.)")
    p.add_argument("--video-id", help="YouTube video ID")
    p.add_argument("--video-url", help="Video or article URL")
    p.add_argument("--date", help="Statement date (YYYY-MM-DDTHH:MM:SS)")
    p.add_argument("--duration", type=int, help="Duration in seconds")

    p = sub.add_parser("ingest-youtube", help="Fetch YouTube transcript, create statement + artifact")
    p.add_argument("--url", required=True, help="YouTube video URL")
    p.add_argument("--figure-id", help="Associate with this figure")
    p.add_argument("--name", help="Override auto-generated name")
    p.add_argument("--date", help="Statement date (YYYY-MM-DDTHH:MM:SS)")
    p.add_argument("--transcript-file", help="Use local file instead of fetching")

    p = sub.add_parser("ingest-article", help="Fetch news article, create statement + artifact")
    p.add_argument("--url", required=True)
    p.add_argument("--figure-id", help="Associate with this figure")
    p.add_argument("--name", help="Override auto-generated title")
    p.add_argument("--date", help="Publication date (YYYY-MM-DDTHH:MM:SS)")

    p = sub.add_parser("list-statements", help="List statements")
    p.add_argument("--figure-id", help="Filter by figure")

    p = sub.add_parser("show-statement", help="Show statement with transcript and claims")
    p.add_argument("--id", required=True)

    # claim commands
    p = sub.add_parser("add-claim", help="Add a claim extracted from a statement")
    p.add_argument("--statement-id", required=True, help="Statement the claim comes from")
    p.add_argument("--text", required=True, help="Claim text")
    p.add_argument("--claim-type", help="Type: factual|position|promise|denial|other")
    p.add_argument("--position", choices=["for", "against", "neutral", "unclear"])
    p.add_argument("--figure-id", help="Speaker figure ID (required for tsw-claimed)")
    p.add_argument("--topic-id", help="Topic ID (required for tsw-claimed)")
    p.add_argument("--confidence", type=float, help="Confidence 0.0-1.0")
    p.add_argument("--start", type=int, help="Start timestamp (seconds)")
    p.add_argument("--end", type=int, help="End timestamp (seconds)")

    p = sub.add_parser("link-claim", help="Link claim to speaker + topic (tsw-claimed)")
    p.add_argument("--claim-id", required=True)
    p.add_argument("--figure-id", required=True)
    p.add_argument("--topic-id", required=True)

    p = sub.add_parser("flag-contradiction", help="Mark two claims as contradicting")
    p.add_argument("--claim1", required=True)
    p.add_argument("--claim2", required=True)
    p.add_argument("--contradiction-type", choices=["direct", "nuanced", "partial"])

    p = sub.add_parser("list-claims", help="List claims")
    p.add_argument("--figure-id")
    p.add_argument("--topic-id")
    p.add_argument("--claim-type")
    p.add_argument("--position", choices=["for", "against", "neutral", "unclear"])

    p = sub.add_parser("get-timeline", help="Chronological claims for a figure")
    p.add_argument("--figure-id", required=True)
    p.add_argument("--topic-id", help="Filter to a specific topic")

    p = sub.add_parser("list-contradictions", help="List all contradiction pairs")
    p.add_argument("--figure-id", help="Filter by figure")

    p = sub.add_parser("compare-figures", help="Compare figures on a topic")
    p.add_argument("--topic-id", required=True)
    p.add_argument("--figure-ids", nargs="+", required=True)

    p = sub.add_parser("create-investigation", help="Create an investigation collection")
    p.add_argument("--name", required=True)
    p.add_argument("--description")

    sub.add_parser("list-investigations", help="List all investigations")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch = {
        "add-figure": cmd_add_figure,
        "list-figures": cmd_list_figures,
        "show-figure": cmd_show_figure,
        "add-topic": cmd_add_topic,
        "list-topics": cmd_list_topics,
        "add-statement": cmd_add_statement,
        "ingest-youtube": cmd_ingest_youtube,
        "ingest-article": cmd_ingest_article,
        "list-statements": cmd_list_statements,
        "show-statement": cmd_show_statement,
        "add-claim": cmd_add_claim,
        "link-claim": cmd_link_claim,
        "flag-contradiction": cmd_flag_contradiction,
        "list-claims": cmd_list_claims,
        "get-timeline": cmd_get_timeline,
        "list-contradictions": cmd_list_contradictions,
        "compare-figures": cmd_compare_figures,
        "create-investigation": cmd_create_investigation,
        "list-investigations": cmd_list_investigations,
    }

    try:
        dispatch[args.command](args)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stdout)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
