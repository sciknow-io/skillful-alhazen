# They Said Whaaa? — Usage Reference

## Overview

Track public statements by politicians and other public figures. Ingest YouTube transcripts and news articles, extract claims, detect contradictions, and build position timelines.

## Architecture

```
tsw-public-figure (domain-thing) — a politician or public figure
tsw-statement     (domain-thing) — a video, interview, speech, or article
tsw-topic         (domain-thing) — a political or social topic
tsw-claim         (fragment)     — a specific claim extracted from a statement
tsw-transcript    (artifact)     — raw transcript text
tsw-article       (artifact)     — raw article text
tsw-analysis-note (note)         — Claude's analysis or summary
tsw-investigation (collection)   — a research investigation

Key relations:
  tsw-made-statement  : (speaker: figure, statement: statement)
  tsw-contains-claim  : (statement: statement, claim: claim)
  tsw-statement-topic : (statement: statement, topic: topic)
  tsw-claimed         : (speaker: figure, claim: claim, topic: topic)  ← analysis triple
  tsw-contradicts     : (claim1: claim, claim2: claim)
  tsw-supports        : (claim1: claim, claim2: claim)
  representation      : (artifact: transcript/article, referent: statement)
  fragmentation       : (whole: artifact, part: claim)
```

## Dashboard

```bash
cd dashboard && npm run dev
# Navigate to http://localhost:3000/they-said-whaaa
```

## Sensemaking Workflow

1. **Set up figures and topics**
   ```bash
   uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py add-figure \
       --name "Alexandria Ocasio-Cortez" --office representative --party Democrat --country US
   uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py add-topic --name "Healthcare"
   ```

2. **Ingest source material**
   ```bash
   # YouTube transcript (requires youtube-transcript-api)
   uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py ingest-youtube \
       --url "https://www.youtube.com/watch?v=VIDEO_ID" --figure-id tsw-figure-...

   # News article
   uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py ingest-article \
       --url "https://news.example.com/article" --figure-id tsw-figure-...
   ```

3. **Read source content** (Claude reads this to extract claims)
   ```bash
   uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py show-statement \
       --id tsw-statement-...
   ```

4. **Extract claims** (Claude identifies individual claims in the transcript/article)
   ```bash
   uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py add-claim \
       --statement-id tsw-statement-... \
       --figure-id tsw-figure-... \
       --topic-id tsw-topic-... \
       --text "We will reduce healthcare costs by 30 percent within two years" \
       --claim-type position \
       --position for \
       --confidence 0.95 \
       --start 142 --end 158
   ```

5. **Flag contradictions** (Claude detects conflicting claims across sources)
   ```bash
   uv run python .claude/skills/they-said-whaaa/they_said_whaaa.py flag-contradiction \
       --claim1 tsw-claim-... --claim2 tsw-claim-... --contradiction-type direct
   ```

## Command Reference

### Figure Management

| Command | Key args | Description |
|---------|----------|-------------|
| `add-figure` | `--name` (req), `--office`, `--party`, `--country`, `--url`, `--description` | Add a public figure |
| `list-figures` | — | List all tracked figures |
| `show-figure` | `--id` (req) | Show figure with statements and claims |

### Topic Management

| Command | Key args | Description |
|---------|----------|-------------|
| `add-topic` | `--name` (req), `--description` | Add a topic |
| `list-topics` | — | List all topics |

### Source Ingestion

| Command | Key args | Description |
|---------|----------|-------------|
| `add-statement` | `--name` (req), `--figure-id`, `--platform`, `--video-id`, `--video-url`, `--date` | Create statement entity manually |
| `ingest-youtube` | `--url` (req), `--figure-id`, `--name`, `--date`, `--transcript-file` | Fetch YouTube transcript |
| `ingest-article` | `--url` (req), `--figure-id`, `--name`, `--date` | Fetch news article |
| `list-statements` | `--figure-id` | List all statements |
| `show-statement` | `--id` (req) | Show statement with transcript text and claims |

### Claim Extraction

| Command | Key args | Description |
|---------|----------|-------------|
| `add-claim` | `--statement-id` (req), `--text` (req), `--figure-id`, `--topic-id`, `--claim-type`, `--position`, `--confidence`, `--start`, `--end` | Add a claim |
| `link-claim` | `--claim-id` (req), `--figure-id` (req), `--topic-id` (req) | Link claim to speaker+topic |
| `flag-contradiction` | `--claim1` (req), `--claim2` (req), `--contradiction-type` | Mark two claims as contradicting |

### Analysis

| Command | Key args | Description |
|---------|----------|-------------|
| `list-claims` | `--figure-id`, `--topic-id`, `--claim-type`, `--position` | List claims with filters |
| `get-timeline` | `--figure-id` (req), `--topic-id` | Chronological claims |
| `list-contradictions` | `--figure-id` | List all contradiction pairs |
| `compare-figures` | `--topic-id` (req), `--figure-ids` (req, multiple) | Compare figures on a topic |

### Collections

| Command | Key args | Description |
|---------|----------|-------------|
| `create-investigation` | `--name` (req), `--description` | Create an investigation |
| `list-investigations` | — | List all investigations |

## Data Model

### Attributes

| Attribute | Type | Used On | Notes |
|-----------|------|---------|-------|
| `tsw-office` | string | public-figure | Role (senator, president, etc.) |
| `tsw-party` | string | public-figure | Political party |
| `tsw-country` | string | public-figure | Country (added) |
| `tsw-figure-url` | string | public-figure | Bio or Wikipedia URL (added) |
| `tsw-platform` | string | statement | youtube, cspan, article, twitter, etc. |
| `tsw-video-id` | string | statement | YouTube video ID |
| `tsw-video-url` | string | statement | Video or article URL |
| `tsw-statement-date` | datetime | statement | When statement was made |
| `tsw-duration-seconds` | integer | statement | Duration of video/speech |
| `tsw-transcript-source` | string | statement | Transcript source label |
| `tsw-claim-text` | string | claim | Full claim text |
| `tsw-claim-type` | string | claim | factual, position, promise, denial, other |
| `tsw-claim-confidence` | double | claim | 0.0–1.0 extraction confidence |
| `tsw-timestamp-start` | integer | claim | Start second in video |
| `tsw-timestamp-end` | integer | claim | End second in video |
| `tsw-position` | string | claim | for/against/neutral/unclear (added) |
| `tsw-contradiction-type` | string | claim | direct/nuanced/partial (added) |
| `tsw-task-status` | string | task | Task status |
| `tsw-investigation-status` | string | investigation | open/closed/archived (added) |

### TypeDB Pitfalls

- Role names use plain names (not tsw- prefixed): `speaker`, `statement`, `claim`, `topic`, `claim1`, `claim2`
- `tsw-claimed` is a ternary relation: `(speaker: $f, claim: $c, topic: $t) isa tsw-claimed;`
- `tsw-contains-claim` links statement to claim: `(statement: $s, claim: $c) isa tsw-contains-claim;`
- Contradiction query needs id comparison: `$c1 has id $id1; $c2 has id $id2; $id1 != $id2;`
- Representation links artifact to statement: `(artifact: $a, referent: $s) isa representation;`
- Fragmentation links artifact to claim: `(whole: $a, part: $c) isa fragmentation;`
- `tsw-claim sub fragment` inherits `plays fragmentation:part` and `plays aboutness:note`
