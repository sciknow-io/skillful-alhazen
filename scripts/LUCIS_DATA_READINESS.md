# Lucis E1 — Data Readiness Assessment
**Version:** 1.2
**Date:** 2026-03-17
**Prepared for:** Nicolas, Jean-Paul, Romain, François
**Purpose:** Honest audit of whether ingested data is sufficient to produce E1's defined outputs. Not a status update claiming readiness — a gap analysis.

---

## What E1 Is Supposed to Produce (from PM doc)

The Profiling Engine (E1) takes a single input field (device category + intended use + regulatory pathway) and queries four public sources to produce:

| Output | Description |
|--------|-------------|
| **Benchmark profile** | Lucis positioned relative to comparable digital health products in the same ecosystem, on relevant metrics |
| **User profiling** | User characteristics, engagement, distribution of possible impact metrics |
| **Feasibility score** | Numeric 0–100; based on cohort size vs required N, data completeness, endpoint measurability, HAS guidance alignment |
| **3 study design suggestions** | Each with feasibility score |
| **3 outcome suggestions** | Matched to Lucis endpoints (HbA1c, HOMA-IR, lipid panel, CRP-us) |

E1 passes a structured object to E2:
```json
{
  "design_type", "endpoint", "population", "comparable_products[]",
  "relevant_guidance[]", "open_trials_count", "pubmed_evidence_count",
  "feasibility_score", "risk_signal", "data_types_available[]"
}
```

Key live fields E1 must compute at runtime:
- `pubmed_evidence_count`: count of publications matching device category + endpoints
- `comparable_studies_count`: count of comparable digital health studies (PubMed + CT.gov)
- `open_trials_count`: active/completed studies, filtered by France/EU geography
- `relevant_guidance`: matched HAS + FDA guidance titles and effective dates
- `risk_signal`: HIGH / MEDIUM / LOW evidence feasibility signal

---

## Data Sources — Ingestion Status

| Source | PM Target | Ingested | Gap | Notes |
|--------|-----------|----------|-----|-------|
| **PubMed** | 2,000–5,000 abstracts | **2,000** | At lower bound | Full PM doc query used (Block 1 + Block 2); collection `collection-04f0cb7348d7` |
| **ClinicalTrials.gov** | 500–1,500 studies | **229** | ~271–1,271 short | Three broad queries run; EU/French studies underrepresented in CT.gov |
| **HAS Guidance** | 20–50 documents | **0** | **Complete gap** | Manual PDF download required; no ingestion run yet — P0 blocker |
| **FDA Guidance** | 2,040 docs (pre-ingested per PM) | **0 in source-specs** | Unclear | PM doc states "fully embedded, no action needed" but no `fda_guidance` source-specs found in DB |

### PubMed — detail

The query used is the exact strategy from the PM doc:
- **Block 1** (AI/ML): 5 MeSH terms (`Artificial Intelligence`, `Machine Learning`, `Deep Learning`, `Neural Networks Computer`, `Natural Language Processing`) + 19 title/abstract keywords (`LLM`, `generative AI`, `foundation model*`, `random forest`, `XGBoost`, etc.)
- **Block 2** (AI-as-device): 4 MeSH terms (`Software`, `Medical Informatics Applications`, `Decision Support Systems Clinical`, `Diagnosis Computer-Assisted`) + 20 title/abstract terms (`AI-powered`, `AI-based`, `SaMD`, `digital health tool*`, `computer-aided diagnosis`, etc.)

2,000 papers are linked to the collection. The PM target is 2,000–5,000; we are at the lower bound. A second ingestion run with `--max-results 5000` would approach the upper target.

**Critical caveat:** Having 2,000 abstracts stored ≠ a working retrieval pipeline. E1 needs to query this corpus at runtime against a specific device profile (preventive health AI + HbA1c/HOMA-IR endpoints). That requires either keyword filtering on stored abstracts or semantic search (Voyage AI + Qdrant embeddings). Neither is implemented yet.

### ClinicalTrials.gov — detail

229 trials ingested from three broad queries:
- `"preventive health digital intervention biomarker"` (300 limit)
- `"personalised health wearable longitudinal metabolic"` (200 limit)
- `"HbA1c digital health lifestyle intervention"` (200 limit)

Coverage is generalist — sample titles include TB household contacts, depression/exercise RCTs, prostate cancer screening. These are not Lucis-relevant. The PM doc specifies trials should be filtered by France/EU geography and preventive health digital interventions specifically. The current corpus is not filtered and likely has low precision for Lucis's use case.

The PM doc also notes that EU/French clinical studies are less consistently registered in ClinicalTrials.gov than US studies. Relevant French evidence may only be findable via ANSM, REGLISS, or French registry sources — which are Phase 2 scope.

### HAS Guidance — critical gap

**Zero HAS documents ingested.** This is the single most important blocking gap for the French regulatory pathway output. E1 must match `relevant_guidance` from the HAS corpus. Without it:
- The `relevant_guidance[]` field in the E1 output object will be empty
- The `risk_signal` cannot factor HAS methodology alignment
- The evidence dossier outline (E4 output) will have no regulatory grounding

The PM doc specifies 20–50 HAS guidance PDFs via manual download. These need to be identified, downloaded, and ingested via `store_augura_sources.py --type has_guidance`. The `"has"` PDF cleanup profile is implemented and ready.

**Suggested HAS documents to prioritise:**
- Méthodologie des études d'impact des technologies de santé numérique (HAS 2022)
- Guide de dépôt des dossiers de demande d'évaluation des dispositifs médicaux à usage individuel
- Doctrine numérique en santé (HAS 2021)
- Référentiel de bonnes pratiques sur les applications et les objets connectés en santé
- Guide sur les études observationnelles pour les DM

### FDA Guidance — status unclear

The PM doc states FDA guidance is "already ingested — 2,040 docs, doc_type = 'fda_guidance', fully embedded. No action needed." However, the Alhazen database contains zero `augura-source-spec` entities with `doc_type = 'fda_guidance'`. This may mean:
- The PM doc was describing a target state, not current state
- The FDA guidance was ingested in a separate system (not this Alhazen instance)
- It was ingested before the database was reset

This needs clarification with Jean-Paul before treating FDA guidance as available.

---

## Per-Output Readiness Assessment

### E1.1 — Benchmark Profile
*Position Lucis relative to comparable products in the same ecosystem*

**What it requires:** A queryable corpus of comparable digital health AI products with associated metrics (study design, endpoint, user population, evidence level). Needs structured extraction from PubMed abstracts and CT.gov studies.

**What we have:** 2,000 PubMed abstracts and 229 trials stored as raw text. No structured extraction, no product-level indexing, no comparator identification logic.

**Verdict: NOT READY.** The data foundation exists but requires significant pipeline work: NLP extraction of product names, endpoints, populations from abstracts; a comparison/ranking algorithm; a schema to store comparator profiles.

---

### E1.2 — User Profiling
*User characteristics, engagement, distribution of impact metrics*

**What it requires:** Lucis's proprietary user data (engagement logs, biomarker records, recommendation history). PM doc lists: `['blood_panels', 'anthropometrics', 'wearables', 'lifestyle_questionnaire', 'engagement_logs', 'recommendation_history']`.

**What we have:** Nothing. This is explicitly proprietary data from Lucis Life — it must be provided by Julien/Lucis team via the client-facing input interface.

**Verdict: NOT READY** (dependency on client data, not a data ingestion gap on our side). The platform needs a data intake mechanism for this.

---

### E1.3 — Feasibility Score (0–100)
*Based on: cohort size vs required N, data completeness, endpoint measurability, HAS guidance alignment*

**What it requires:** (a) User cohort data from Lucis (E1.2 dependency), (b) HAS guidance corpus for alignment scoring, (c) a scoring algorithm.

**What we have:** Neither (a) nor (b). HAS guidance is zero. No scoring algorithm exists.

**Verdict: NOT READY.** Blocked on both HAS ingestion and client data intake.

---

### E1.4 — Study Design Suggestions (3, with feasibility scores)
*Matched to Lucis's regulatory pathway (HAS dossier) and data profile*

**What it requires:** HAS methodology guidance for observational studies + digital health tools, PubMed evidence of comparable study designs, CT.gov comparable active trials.

**What we have:** PubMed corpus (2,000 papers, unfiltered for Lucis endpoints); 229 trials (broad, not France/EU filtered); zero HAS guidance.

**Verdict: PARTIAL.** PubMed and CT.gov provide a raw evidence base, but without HAS guidance and without runtime query filtering (semantic search or keyword matching against Lucis's specific endpoints), the suggestions cannot be generated reliably. The PM doc's `comparable_studies_count` requires live querying, not batch ingestion.

---

### E1.5 — Outcome Suggestions (3)
*Matched to primary endpoints: HbA1c, HOMA-IR, lipid panel (LDL/HDL/TG), CRP-us*

**What it requires:** PubMed literature demonstrating effect sizes for these endpoints in comparable digital health interventions; comparable trials from CT.gov filtered by these endpoints.

**What we have:** 2,000 PubMed abstracts (likely contains relevant papers — these are common metabolic endpoints in digital health literature). CT.gov corpus is broad and not endpoint-filtered.

**Verdict: PARTIAL.** Raw material exists in PubMed corpus. Requires runtime endpoint-filtered querying (`pubmed_evidence_count` and `comparable_studies_count` as live queries) or semantic search against embedded abstracts.

---

## What Is Not in Scope (and Why This Matters)

The following were explicitly greyed out as Phase 2 in the PM doc. They should not block MVP:

- EUDAMED / ANSM comparable product registry — Phase 2
- Real-time HAS feed monitoring — Phase 2
- Google Scholar full-text retrieval — Phase 2
- Proprietary EHR integration — Phase 2
- CMS / payer dossier (US) — not relevant to Lucis (French pathway only)
- FDA 510(k) / MAUDE data — not relevant (Lucis is EU/French regulatory pathway)

FDA guidance, while ingested in some form per the PM, is secondary to HAS for Lucis's regulatory context. The HAS dossier is the MVP submission target.

---

## Recommended Next Steps (Prioritised)

| Priority | Action | Owner | Blocks |
|----------|--------|-------|--------|
| **P0** | Identify and download 20–50 HAS guidance PDFs; ingest via `store_augura_sources.py --type has_guidance` | Jean-Paul / Romain | E1.3, E1.4, E1.5 feasibility scoring |
| **P0** | Clarify FDA guidance status — is it ingested in this system or another? | Jean-Paul | E1.4 relevant_guidance field |
| **P1** | Ingest ClinicalTrials.gov with France/EU geography filter and Lucis-specific queries (preventive health AI, metabolic biomarkers) | Engineering | E1.4, E1.5 open_trials_count |
| **P1** | Run PubMed ingestion to 5,000 papers (current: 2,000, target upper bound: 5,000) | Engineering | E1.1, E1.4, E1.5 coverage |
| **P1** | Implement runtime endpoint-filtered PubMed query for `pubmed_evidence_count` and `comparable_studies_count` — these are live fields, not batch counts | Engineering | E1.1, E1.4, E1.5 |
| **P2** | Design and implement semantic search (Voyage AI embeddings + Qdrant) over PubMed corpus for product benchmarking | Engineering | E1.1 benchmark profile |
| **P2** | Design client data intake interface for Lucis proprietary data (engagement, biomarkers) | Product / Engineering | E1.2, E1.3 |
| **P3** | Implement scoring algorithm for feasibility score (0–100) | Engineering | E1.3 |

---

## Summary Verdict

| Component | Status |
|-----------|--------|
| PubMed corpus (2,000 papers) | Ingested — retrieval pipeline needed |
| ClinicalTrials.gov (229 trials) | Ingested — precision too low, needs re-query |
| HAS Guidance | **NOT INGESTED — P0 blocker** |
| FDA Guidance | **Status unclear — needs verification** |
| E1.1 Benchmark Profile | NOT READY |
| E1.2 User Profiling | NOT READY (client data dependency) |
| E1.3 Feasibility Score | NOT READY |
| E1.4 Study Design Suggestions | PARTIAL |
| E1.5 Outcome Suggestions | PARTIAL |

The data ingestion work done to date provides a foundation but is not sufficient for E1 to produce its defined outputs end-to-end. The two most critical next steps are HAS guidance ingestion and clarification of FDA guidance status.
