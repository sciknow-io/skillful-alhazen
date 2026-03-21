# System Design: they-said-whaaa

_Skill: they-said-whaaa_  
_Domain ID: dm-domain-0e96eb50a0e0_


---

## Phase 1 -- System Goal

### Goal: Track and analyze public statements made by politicians and other public figures to assess credibility and consistency over time. The system ingests video transcripts (primarily YouTube), news articles, press releases, and social media posts. It extracts individual claims, links them to speakers and topics, timestamps them, and enables cross-referencing to detect contradictions, position shifts, and rhetorical patterns. The curation goal is to build a structured, evidence-backed record of what public figures have said — so users can answer questions like: 'Did Senator X contradict themselves on issue Y?', 'How has this politician's position on Z evolved?', 'What did they say about topic W in 2024 vs 2025?'


**Evaluation Criteria:**

- **Claim extraction accuracy** _accuracy_

  How accurately does the system extract discrete claims from transcripts and articles, including speaker attribution and topic tagging?

  _Success when:_ For 90% of test transcript segments, extracted claims match human-annotated ground truth on speaker, topic, and claim text

  _Approach:_ Manually annotate 20 transcript segments from diverse speakers; compare system extraction against annotations

- **Contradiction detection recall** _completeness_

  When a public figure has made contradictory statements on the same topic, does the system surface them?

  _Success when:_ For 80% of known contradictions in the test set, the system flags the pair of conflicting claims

  _Approach:_ Curate 15 known politician contradictions from fact-checking sites; run analysis and measure recall

- **Temporal coverage** _completeness_

  Can the system track position evolution across months and years for a given speaker+topic?

  _Success when:_ For a test politician with 5+ ingested sources spanning 2+ years, the system produces a chronological position timeline with no temporal gaps >6 months

  _Approach:_ Select one well-covered politician, ingest 10+ sources across 3 years, verify timeline completeness


---

## Phase 2 -- Entity Schema

### Core domain entities _(feasibility: yes)_

tsw-public-figure (domain-thing): a politician or public figure being tracked. tsw-statement (domain-thing): a single public appearance/speech/interview/post — the event where words were said. tsw-topic (domain-thing): a policy area or subject (e.g., immigration, healthcare, climate). tsw-claim (fragment): a discrete factual or policy assertion extracted from a statement, attributed to a speaker on a topic with a timestamp.


**Specs:**

```
# Core Entity Schema (TypeQL 3.x)

## Attributes
attribute tsw-party, value string;          # political party affiliation
attribute tsw-office, value string;         # current/former office held
attribute tsw-platform, value string;       # youtube, twitter, press-conference, interview, hearing, rally
attribute tsw-video-id, value string;       # YouTube video ID
attribute tsw-video-url, value string;      # full video URL
attribute tsw-statement-date, value datetime; # when the statement was made
attribute tsw-duration-seconds, value long; # video/audio duration
attribute tsw-transcript-source, value string; # auto-caption, manual, third-party
attribute tsw-claim-text, value string;     # the extracted claim verbatim or paraphrased
attribute tsw-claim-type, value string;     # factual, promise, opinion, prediction
attribute tsw-confidence, value double;     # extraction confidence 0.0-1.0
attribute tsw-timestamp-start, value long;  # seconds offset in video where claim starts
attribute tsw-timestamp-end, value long;    # seconds offset in video where claim ends

## Entities
entity tsw-public-figure sub domain-thing,
    owns tsw-party,
    owns tsw-office,
    plays tsw-made-statement:speaker,
    plays tsw-claimed:speaker;

entity tsw-statement sub domain-thing,
    owns tsw-platform,
    owns tsw-video-id,
    owns tsw-video-url,
    owns tsw-statement-date,
    owns tsw-duration-seconds,
    owns tsw-transcript-source,
    plays tsw-made-statement:statement,
    plays tsw-statement-topic:statement,
    plays tsw-contains-claim:statement;

entity tsw-topic sub domain-thing,
    plays tsw-statement-topic:topic,
    plays tsw-claimed:topic;

entity tsw-claim sub fragment,
    owns tsw-claim-text,
    owns tsw-claim-type,
    owns tsw-confidence,
    owns tsw-timestamp-start,
    owns tsw-timestamp-end,
    plays tsw-contains-claim:claim,
    plays tsw-claimed:claim,
    plays tsw-contradicts:claim1,
    plays tsw-contradicts:claim2,
    plays tsw-supports:claim1,
    plays tsw-supports:claim2;

## Artifacts
entity tsw-transcript sub artifact;    # raw transcript text
entity tsw-article sub artifact;       # news article HTML/text

## Notes
entity tsw-analysis-note sub note;     # Claude's credibility/consistency analysis

## Relations
relation tsw-made-statement,
    relates speaker,
    relates statement;

relation tsw-statement-topic,
    relates statement,
    relates topic;

relation tsw-contains-claim,
    relates statement,
    relates claim;

relation tsw-claimed,
    relates speaker,
    relates claim,
    relates topic;

relation tsw-contradicts,
    relates claim1,
    relates claim2;

relation tsw-supports,
    relates claim1,
    relates claim2;
```

### Collections and task _(feasibility: yes)_

tsw-investigation (collection): a named investigation tracking a specific public figure or topic over time. tsw-task (domain-thing): the framing question driving an investigation, e.g., 'Track Senator X statements on healthcare 2023-2026'.


**Specs:**

```
# Collection & Task Schema

attribute tsw-task-status, value string;   # active | completed | on-hold

entity tsw-investigation sub collection,
    plays tsw-task-scope:collection;

entity tsw-task sub domain-thing,
    owns tsw-task-status,
    plays tsw-task-scope:task;

relation tsw-task-scope,
    relates task,
    relates collection;
```


---

## Phase 3 -- Source Schema

### YouTube videos _(feasibility: yes)_

Primary source. YouTube Data API v3 for video metadata (title, channel, date, duration, description). YouTube transcript API (youtube-transcript-api Python library) for auto-generated and manual captions. Produces one tsw-transcript artifact per video containing the full timestamped transcript. Video metadata populates the tsw-statement entity.

### News articles and fact-check sites _(feasibility: yes)_

Secondary source. Web pages from news outlets, fact-checking sites (PolitiFact, FactCheck.org, Snopes), and press release archives. Fetched via HTTP/Playwright. Produces tsw-article artifacts. Useful for cross-referencing claims and finding known contradictions.

### Congressional Record and C-SPAN _(feasibility: partial)_

Official government source. Congress.gov API for floor speeches and voting records. C-SPAN video archive (also on YouTube). Produces tsw-transcript artifacts for floor speeches. High-authority source for what politicians said in official proceedings.

### Social media posts _(feasibility: partial)_

Supplementary source. Posts from X/Twitter, Truth Social, Facebook, etc. Captured via Playwright screenshots or third-party archives. Short-form statements that often contain strong position signals. Produces tsw-article artifacts with platform metadata.


---

## Phase 4 -- Derivation Skills

### extract-claims _(feasibility: yes)_

Claude reads a tsw-transcript or tsw-article artifact, identifies discrete claims, and the script inserts them into TypeDB. For each claim: (1) extract claim text (verbatim quote or close paraphrase), (2) classify type (factual, promise, opinion, prediction), (3) identify speaker attribution, (4) identify topic(s), (5) record timestamp offsets for video claims, (6) assign confidence. Script creates tsw-claim fragments and tsw-claimed relations linking speaker+claim+topic.

- **Inputs:** tsw-transcript artifact, tsw-article artifact
- **Outputs:** tsw-claim fragments, tsw-topic (find-or-create), tsw-claimed relations, tsw-contains-claim relations
### manage-figures _(feasibility: yes)_

CRUD operations for tsw-public-figure entities. add-figure creates a new figure with name, party, office. update-figure modifies attributes. merge-figures handles deduplication (same person referred to differently). list-figures shows all tracked figures with claim counts.

- **Inputs:** User input (name, party, office)
- **Outputs:** tsw-public-figure entities
### ingest-youtube _(feasibility: yes)_

Given a YouTube URL or video ID: (1) fetch video metadata via YouTube Data API (title, channel, published date, duration, description), (2) fetch transcript via youtube-transcript-api (timestamped captions), (3) create tsw-statement entity with metadata, (4) create tsw-transcript artifact with full timestamped transcript, (5) link via representation relation. Does NOT extract claims — that is sensemaking.

- **Inputs:** YouTube video URL or ID
- **Outputs:** tsw-statement, tsw-transcript artifact, tsw-public-figure (find-or-create)
### ingest-article _(feasibility: yes)_

Given a news article or fact-check URL: (1) fetch page content via HTTP or Playwright, (2) create tsw-article artifact with raw HTML/text, (3) create or find tsw-statement if the article describes a specific speech/appearance, (4) link artifact to statement via representation. For fact-check articles, also tag the article with the public figure being checked.

- **Inputs:** News/fact-check URL
- **Outputs:** tsw-article artifact, tsw-statement (optional), tsw-public-figure (find-or-create)

---

## Phase 5 -- Analysis Skills

### detect-contradictions _(feasibility: yes)_

Query all claims by a given speaker on a given topic, ordered chronologically. Claude compares claim pairs for semantic contradiction. When found, create tsw-contradicts relation between the two claims and a tsw-analysis-note explaining the contradiction with evidence citations. Handles nuance: distinguishes genuine contradictions from position evolution, context-dependent statements, and rhetorical framing.

- **Inputs:** tsw-claim fragments filtered by speaker and topic
- **Outputs:** tsw-contradicts relations, tsw-analysis-note with contradiction explanation
### build-position-timeline _(feasibility: yes)_

For a given speaker+topic pair, produce a chronological timeline of all claims with dates, sources, and claim types. Claude synthesizes a narrative summary of how the figure's position has evolved. Output is a tsw-analysis-note containing the Markdown timeline plus a credibility assessment.

- **Inputs:** tsw-claim fragments, tsw-statement dates, tsw-public-figure
- **Outputs:** tsw-analysis-note with Markdown timeline and credibility assessment
### credibility-scorecard _(feasibility: partial)_

Aggregate analysis across all topics for a single public figure. Counts: total claims, contradictions found, promises kept/broken (if tracked), factual accuracy vs fact-checks. Produces a summary scorecard as a tsw-analysis-note. Includes links to the most significant contradictions and position shifts.

- **Inputs:** tsw-claim fragments, tsw-contradicts relations, tsw-analysis-notes for a speaker
- **Outputs:** tsw-analysis-note with credibility scorecard in Markdown
### compare-figures-on-topic _(feasibility: yes)_

Compare what multiple public figures have said on the same topic. Query claims for 2+ speakers on one topic, produce a side-by-side comparison showing areas of agreement, disagreement, and where each figure's position has changed. Useful for debate prep or policy comparison.

- **Inputs:** tsw-claim fragments for multiple speakers on one topic
- **Outputs:** tsw-analysis-note with comparative Markdown table
