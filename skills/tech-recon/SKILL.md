---
name: tech-recon
description: Goal-driven technology investigation — interview, discover, ingest, analyze, and visualize competing systems against user-defined success criteria
triggers:
  - investigate [technology/framework/library]
  - compare [tools/systems]
  - tech recon
  - research alternatives to X
  - evaluate [tool] for [use case]
  - what are the options for [problem]
prerequisites:
  - TypeDB running: make db-start
  - Dependencies installed: make build-skills
---

# Tech-Recon Skill

Use this skill to run systematic, goal-driven investigations of technology landscapes. You interview the user to define success criteria, discover candidate systems, ingest their primary sources, write structured notes, plan and implement visualizations, and surface findings in a dashboard.

**When to use:** "investigate", "research", "evaluate", "compare", "tech recon", "what tools exist for", "alternatives to X", "assess [framework] for [purpose]"

## Prerequisites

- TypeDB must be running: `make db-start`
- `GITHUB_TOKEN` env var recommended for higher GitHub API rate limits

## Quick Start

When a user asks to investigate a technology, run the interview (one question per turn):

1. What problem are you trying to solve?
2. What does success look like — what questions must this investigation answer?
3. Are there existing tools or approaches you already know about?
4. What programming language or ecosystem are you working in?
5. What scale or performance requirements matter?
6. What licensing constraints apply?
7. What is your timeline — are you choosing now or exploring?
8. Any non-negotiables (e.g., must be open source, must have Python API)?

After the interview, synthesize a goal statement and call:

```bash
uv run python .claude/skills/tech-recon/tech_recon.py start-investigation \
    --name "Observable Plot alternatives" \
    --goal "Find the best JS charting library for Observable notebooks" \
    --success-criteria "Supports SVG, has TypeScript types, active community"
```

## Investigation Phases

1. **Interview** — conversational, ~8 questions, produces goal doc
2. **Discovery** — search for candidate systems (web-search + GitHub + HF)
3. **Ingestion** — dispatch parallel subagents per system (ingest-page, ingest-repo, ingest-docs)
4. **Sensemaking** — dispatch parallel subagents per system (write-note per topic)
5. **Viz Planning** — propose visualizations mapped to success criteria (plan-analyses)
6. **Analysis** — implement Observable Plot visualizations (add-analysis, run-analysis)
7. **Dashboard** — http://localhost:3001/tech-recon

**Read USAGE.md before executing any commands.**
