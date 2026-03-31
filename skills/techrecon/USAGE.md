# Tech Recon — Usage Reference

## Sensemaking Protocol: From Ingestion to Deep Understanding

This protocol guides you from zero to a complete technology investigation. Follow these steps in order. Each step builds on the previous. Read this section before running any commands.

### Step 1: Orient — start-investigation + add-system

Begin by defining what you want to learn and naming the system.

```bash
INV_ID=$(uv run python .claude/skills/techrecon/techrecon.py start-investigation \
    --name "Kosmos by Edison Scientific" \
    --goal "Understand how Kosmos works as an AI scientist: architecture, world model, agent loop" \
    2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['investigation_id'])")

SYS_ID=$(uv run python .claude/skills/techrecon/techrecon.py add-system \
    --name "Kosmos" \
    --description "AI scientist system: reads papers, runs code, builds a structured world model" \
    --investigation $INV_ID \
    2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['system_id'])")
```

Tag immediately with domain and relationship tags:

```bash
uv run python .claude/skills/techrecon/techrecon.py tag --entity $INV_ID --tag "domain:ai-scientist"
uv run python .claude/skills/techrecon/techrecon.py tag --entity $SYS_ID --tag "org:edison-scientific"
```

### Step 2: Ingest primary sources

Ingest the homepage/announcement and any paper first. These give the system's own framing.

```bash
# Announcement or homepage
uv run python .claude/skills/techrecon/techrecon.py ingest-doc \
    --url "https://edisonscientific.com/articles/announcing-kosmos" \
    --system $SYS_ID --investigation $INV_ID

# GitHub repo (if open-source)
uv run python .claude/skills/techrecon/techrecon.py ingest-repo \
    --url "https://github.com/example/system" \
    --investigation $INV_ID
```

### Step 3: Add provenance note — where did this come from?

Before analyzing the technology, understand its origin. This shapes everything else.

```bash
uv run python .claude/skills/techrecon/techrecon.py add-note \
    --type provenance \
    --about $SYS_ID \
    --investigation $INV_ID \
    --content "## Provenance

Predecessor: [what system/project came before and why it was insufficient]
Origin org: [who built it, what kind of institution, what motivated them]
Key insight: [the core design insight that made this system possible]
Prior art: [what existing work it builds on]
Publication: [paper/blog/date]"
```

**What to capture:** predecessor systems, origin institution, the problem that motivated it, key insight that enabled the solution, prior art lineage.

### Step 4: Identify architectural components

Read ingested artifacts, then extract components. Use `show-artifact --id` to read each one.

```bash
# Add components
uv run python .claude/skills/techrecon/techrecon.py add-component \
    --name "Structured World Model" \
    --system $SYS_ID \
    --description "Queryable DB of entities, relationships, experimental results; long-term memory across 200+ agent rollouts" \
    --investigation $INV_ID

# Add key concepts
uv run python .claude/skills/techrecon/techrecon.py add-concept \
    --name "World Model Pattern" \
    --category architecture \
    --description "Replace context-window memory with a persistent queryable knowledge store shared across agent rollouts" \
    --investigation $INV_ID
```

### Step 5: Ingest key source files (if open-source)

Dig into implementation details for the core components identified in Step 4.

```bash
# Source file
uv run python .claude/skills/techrecon/techrecon.py ingest-source \
    --url "https://github.com/example/system/blob/main/core/world_model.py" \
    --language "Python" --system $SYS_ID

# Schema/config
uv run python .claude/skills/techrecon/techrecon.py ingest-schema \
    --url "https://github.com/example/system/blob/main/schema.yaml" \
    --format "yaml" --system $SYS_ID
```

### Step 6: Synthesize the architecture note

Now write the architecture note from everything ingested so far.

```bash
uv run python .claude/skills/techrecon/techrecon.py add-note \
    --type architecture \
    --about $SYS_ID \
    --investigation $INV_ID \
    --content "## [System] Architecture

### Core Innovation
[What is the central technical idea?]

### Agent Loop / Processing Pipeline
[How does data flow? What are the main steps?]

### Key Metrics
[Performance numbers, scale claims, cost]

### Transparency / Auditability Design
[How are conclusions traced to sources?]"
```

### Step 7: Map use cases — what problems does it solve, for whom?

```bash
uv run python .claude/skills/techrecon/techrecon.py add-note \
    --type use-case \
    --about $SYS_ID \
    --investigation $INV_ID \
    --content "## Use Cases

### Primary Problem
[The core limitation or need that drove this system]

### Target Users
[Who is this for? What prior skill level is assumed?]

### What It Replaces / Improves
[Alternative approaches and why they fall short]

### Validated Use Cases
[Concrete examples from the announcement/paper]"
```

### Step 8: Design pattern notes — what patterns does it embody?

```bash
uv run python .claude/skills/techrecon/techrecon.py add-note \
    --type design-pattern \
    --about $SYS_ID \
    --investigation $INV_ID \
    --content "## [Pattern Name]

Pattern: [1-sentence description]
How it works: [the mechanics]
Advantages: [why this pattern was chosen]
Trade-offs: [known limitations]"
```

### Step 9: Integration note — what is the integration potential?

```bash
uv run python .claude/skills/techrecon/techrecon.py add-note \
    --type integration \
    --about $SYS_ID \
    --investigation $INV_ID \
    --content "## Integration Potential

### Structural Parallel
[What existing systems or workflows does this resemble?]

### Integration Opportunities
1. [As a data source or API]
2. [As an architectural pattern to adopt]
3. [As a dependency or pre-processing step]

### Gaps and Limitations
[What this system cannot do or does poorly]

### Near-Term Action
[Concrete next step if integrating]" \
    --priority high \
    --complexity moderate
```

### Step 10: Assessment note — maturity, risks, recommendation

```bash
uv run python .claude/skills/techrecon/techrecon.py add-note \
    --type assessment \
    --about $SYS_ID \
    --investigation $INV_ID \
    --content "## Assessment

### Maturity
[Production / beta / research prototype. Evidence base.]

### Validated Claims
[What has been independently validated?]

### Risks
[Technical, commercial, provenance, licensing risks]

### Schema Gaps Revealed
[What questions could NOT be answered with current techrecon schema?]

### Recommendation
[Should we use this? Integrate it? Monitor it? Pass?]"
```

### Step 11: Close the investigation

```bash
uv run python .claude/skills/techrecon/techrecon.py update-investigation \
    --id $INV_ID --status "complete"

# Verify full investigation
uv run python .claude/skills/techrecon/techrecon.py show-investigation --id $INV_ID \
    2>/dev/null | python3 -m json.tool
```

---

## Web Interface

A Next.js dashboard is available for browsing investigations, systems, and architecture maps.

**Start the dashboard:**
```bash
make dashboard-dev    # starts on http://localhost:3000
```

**Views:**
- **Investigations** (`/techrecon`) — Grid of all active and completed investigations
- **System Detail** (`/techrecon/system/{id}`) — Full system profile: components, concepts, data models, notes
- **Architecture** (`/techrecon/architecture/{id}`) — Architecture map for a system
- **Investigation Detail** (`/techrecon/investigation/{id}`) — Investigation progress and linked systems
- **Artifact Viewer** (`/techrecon/artifact/{id}`) — Raw ingested content (READMEs, source, docs)

---

## Starting an Investigation

**Triggers:** "investigate", "study", "research [system]", "look into", "tech recon"

### Start Investigation

```bash
uv run python .claude/skills/techrecon/techrecon.py start-investigation \
    --name "mediKanren Investigation" \
    --goal "Understand mediKanren's architecture, data model, and query interface"
```

### Ingest a Repository

```bash
uv run python .claude/skills/techrecon/techrecon.py ingest-repo \
    --url "https://github.com/webyrd/mediKanren" \
    --investigation "investigation-abc123" \
    --tags "biomedical" "knowledge-graph" "reasoning"
```

This fetches:
- Repository metadata (stars, language, license)
- README content (stored as `techrecon-readme` artifact)
- File tree (stored as `techrecon-file-tree` artifact)
- Creates a `techrecon-system` entity with extracted metadata

---

## Deep Investigation: Source Code Analysis

```bash
# Ingest a key source file
uv run python .claude/skills/techrecon/techrecon.py ingest-source \
    --url "https://github.com/webyrd/mediKanren/blob/master/medikanren2/neo/dbKanren/dbk/index.rkt" \
    --file-path "medikanren2/neo/dbKanren/dbk/index.rkt" \
    --language "Racket" \
    --system "system-abc123"

# Ingest documentation
uv run python .claude/skills/techrecon/techrecon.py ingest-doc \
    --url "https://biolink.github.io/biolink-model/" \
    --system "system-abc123" \
    --tags "data-model" "biolink"

# Ingest a schema file
uv run python .claude/skills/techrecon/techrecon.py ingest-schema \
    --url "https://github.com/biolink/biolink-model/blob/master/biolink-model.yaml" \
    --format "custom" \
    --system "system-abc123"

# Ingest a HuggingFace model card
uv run python .claude/skills/techrecon/techrecon.py ingest-model-card \
    --model-id "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract" \
    --system "system-abc123"
```

### Extracting Code Snippets

```bash
uv run python .claude/skills/techrecon/techrecon.py add-fragment \
    --type code-snippet \
    --source "artifact-xyz" \
    --about "component-abc" \
    --language "Racket" \
    --name "Query pattern for drug-disease paths" \
    --content "(run* (drug disease) (fresh (gene) (edge drug gene 'treats') (edge gene disease 'causes')))"
```

---

## Queries

```bash
uv run python .claude/skills/techrecon/techrecon.py list-systems
uv run python .claude/skills/techrecon/techrecon.py show-system --id "system-abc123"
uv run python .claude/skills/techrecon/techrecon.py show-architecture --id "system-abc123"
uv run python .claude/skills/techrecon/techrecon.py show-component --id "component-xyz"
uv run python .claude/skills/techrecon/techrecon.py show-concept --id "concept-xyz"
uv run python .claude/skills/techrecon/techrecon.py show-data-model --id "datamodel-xyz"
```

---

## Tagging

```bash
uv run python .claude/skills/techrecon/techrecon.py tag \
    --entity "system-abc123" --tag "biomedical"

uv run python .claude/skills/techrecon/techrecon.py search-tag --tag "biomedical"
```

**Common tag patterns:**
- `domain:biomedical`, `domain:nlp`, `domain:knowledge-graph`, `domain:ai-scientist`
- `lang:python`, `lang:racket`, `lang:rust`
- `status:deep-dive`, `status:surveyed`, `status:rejected`
- `integration:high-priority`, `integration:blocked`
- `org:academia`, `org:commercial`, `org:nonprofit`
- `type:multi-agent`, `type:ai-scientist`, `type:knowledge-graph`

---

## Data Model

### Entity Types

| Type | Description |
|------|-------------|
| `techrecon-investigation` | An investigation (collection) |
| `techrecon-system` | Software system/library/framework (owns provenance attrs) |
| `techrecon-component` | Module/subsystem |
| `techrecon-concept` | Key concept/pattern/algorithm |
| `techrecon-data-model` | Data model/schema/ontology |
| `techrecon-use-case` | Problem/solution mapping (who uses it, what problem it solves) |

### Artifact Types

| Type | Description |
|------|-------------|
| `techrecon-readme` | Repository README |
| `techrecon-source-file` | Source code file |
| `techrecon-doc-page` | Documentation page |
| `techrecon-schema-file` | Schema/model definition |
| `techrecon-model-card` | HuggingFace model card |
| `techrecon-file-tree` | Repository file tree |

### Fragment Types

| Type | Description |
|------|-------------|
| `techrecon-code-snippet` | Extracted code snippet |
| `techrecon-api-spec` | API specification excerpt |
| `techrecon-schema-excerpt` | Schema excerpt |
| `techrecon-config-excerpt` | Config file excerpt |

### Note Types

| `--type` | Schema entity | Purpose |
|----------|---------------|---------|
| `architecture` | `techrecon-architecture-note` | System architecture analysis |
| `design-pattern` | `techrecon-design-pattern-note` | Design pattern analysis |
| `integration` | `techrecon-integration-note` | Integration assessment (has priority, complexity) |
| `comparison` | `techrecon-comparison-note` | Cross-system comparison |
| `data-model` | `techrecon-data-model-note` | Data model analysis |
| `assessment` | `techrecon-assessment-note` | Overall system assessment |
| `provenance` | `techrecon-provenance-note` | Origin, predecessor, motivation |
| `use-case` | `techrecon-use-case-note` | Problem/solution/user mapping |
| `general` | `note` | Unstructured note |

### Relations

| Relation | Description |
|----------|-------------|
| `techrecon-has-component` | System contains component |
| `techrecon-uses-concept` | Component uses concept |
| `techrecon-concept-for-system` | Concept belongs to system (not just component) |
| `techrecon-has-data-model` | System uses data model |
| `techrecon-system-dependency` | System depends on system |
| `techrecon-component-dependency` | Component depends on component |
| `techrecon-system-addresses` | System addresses a use-case |
| `techrecon-system-derived-from` | System derives from a predecessor system |

---

## Command Reference

| Command | Description | Key Args |
|---------|-------------|----------|
| `start-investigation` | Start investigation | `--name`, `--goal` |
| `list-investigations` | List investigations | `--status` |
| `update-investigation` | Update status | `--id`, `--status` |
| `add-system` | Add system | `--name`, `--repo-url` |
| `add-component` | Add component | `--name`, `--system`, `--type` |
| `add-concept` | Add concept | `--name`, `--category` |
| `add-data-model` | Add data model | `--name`, `--format` |
| `ingest-repo` | Ingest GitHub repo | `--url` |
| `ingest-doc` | Ingest doc page | `--url` |
| `ingest-source` | Ingest source file | `--url`, `--language` |
| `ingest-schema` | Ingest schema file | `--url`/`--file`, `--format` |
| `ingest-model-card` | Ingest HF model | `--model-id` |
| `link-component` | Link component | `--system`, `--component` |
| `link-concept` | Link concept | `--component`, `--concept` |
| `link-data-model` | Link data model | `--system`, `--data-model` |
| `link-dependency` | Link dependency | `--system`, `--dependency` |
| `list-systems` | List systems | |
| `show-system` | System details | `--id` |
| `show-architecture` | Architecture map | `--id` |
| `list-artifacts` | List artifacts | `--status`, `--system`, `--type` |
| `show-artifact` | Artifact content | `--id` |
| `add-note` | Add note | `--about`, `--type`, `--content` |
| `add-fragment` | Add fragment | `--type`, `--content`, `--source` |
| `tag` | Tag entity | `--entity`, `--tag` |
| `search-tag` | Search by tag | `--tag` |

---

## TypeDB Reference

- **TechRecon Schema:** `local_skills/techrecon/schema.tql`
- **Core Schema:** `local_resources/typedb/alhazen_notebook.tql`

### Common Pitfalls (TypeDB 3.x)

- **Fetch syntax** — Use `fetch { "key": $var.attr };` (JSON-style)
- **No sessions** — Use `driver.transaction(database, TransactionType.X)` directly
- **Update = delete + insert** — Can't modify attributes in place
- **`entity` is reserved** — Use `isa identifiable-entity` to match any entity by id
