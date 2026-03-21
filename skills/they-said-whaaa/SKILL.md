---
name: they-said-whaaa
description: Credibility and consistency tracker for public figures. Ingests YouTube transcripts and news articles, extracts claims, detects contradictions, and builds position timelines.
---

# They Said Whaaa?

Use this skill to track public statements by politicians and other public figures, detect contradictions, and build position timelines across topics.

**When to use:** "track what [figure] said about", "ingest YouTube video", "ingest news article", "extract claims from", "find contradictions", "build timeline", "compare figures on topic", "add politician", "add topic"

## Prerequisites
- TypeDB running: `make db-start`
- Schema loaded: `make build-db`
- Dependencies: `uv sync --all-extras`
- YouTube transcripts: `uv sync --extra they-said-whaaa` (installs `youtube-transcript-api`)

## Quick Start
```bash
uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py add-figure \
    --name "Jane Senator" --role senator --party Democrat --country US

uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py ingest-article \
    --url "https://example.com/article" --figure-id tsw-figure-...

uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py list-figures
```

## Sensemaking Pattern
1. Ingest transcript or article → get artifact ID
2. `show-source --id <artifact_id>` → read the content
3. `add-statement` for each significant utterance
4. `add-claim` for each distinct factual/positional claim within a statement
5. `flag-contradiction` when two claims conflict

**Before executing any commands, read `USAGE.md` in this directory.**
