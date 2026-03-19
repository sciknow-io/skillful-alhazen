# System Design: alg-precision-therapeutics

_Skill: alg-precision-therapeutics_  
_Domain ID: dm-domain-892a3035f5c3_


---

## Phase 1 -- System Goal

### Goal: Build mechanism-of-harm KG from known MONDO ID to identify therapeutic strategies

Implement APM Phase 2 (Therapeutic Phase). Given a MONDO ID: (1) auto-ingest phenotypes, causal/associated genes, disease hierarchy, clinical trials, and drugs from Monarch/ClinTrials/ChEMBL; (2) enable Claude sensemaking to build apt-mechanism entities linking genes to pathways to phenotypes; (3) map therapeutic strategies onto each mechanism with candidate drugs; (4) surface gaps including undrugged targets, unexplained phenotypes, mechanisms without strategies; (5) support cross-disease repurposing via shared mechanism types. Central innovation: apt-mechanism as first-class domain-thing entity enabling full graph traversal from genomic cause through mechanism chain to phenotype and therapeutic intervention.


**Evaluation Criteria:**

- **Ingestion completeness** _completeness_

  All Monarch/ClinTrials/ChEMBL data populated for a test disease

  _Success when:_ After ingest-disease on NGLY1 deficiency MONDO:0800044, phenotypes, genes, trials and drugs are all present

- **Mechanism chain traversable** _accuracy_

  gene->mechanism->phenotype->therapy chain exists post-sensemaking

  _Success when:_ After sensemaking on test disease, show-mechanisms returns non-empty chains with gene and phenotype links

- **Gap queries surface correctly** _accuracy_

  Undrugged targets and unexplained phenotypes are surfaced by analysis commands

  _Success when:_ show-gaps CLI command returns undrugged mechanisms and phenotypes with no linked mechanism

- **Cross-disease repurposing** _usability_

  Shared mechanism types surface repurposing candidates across 2+ diseases

  _Success when:_ show-repurposing command returns drug candidates shared across diseases with same mechanism type


---

## Phase 2 -- Entity Schema

### apt-investigation (collection) _(feasibility: yes)_

Root collection for a rare disease investigation. Typed collection grouping all entities, artifacts and notes related to one disease investigation. Holds investigation metadata: status, start date, investigator.


**Open Gaps:**

- [moderate] No explicit relation linking apt-investigation to apt-disease in schema. The investigation collection logically contains a disease but there is no apt-investigation-for-disease relation defined. Navigating from investigation to disease requires a workaround.
### apt-disease (domain-thing) _(feasibility: yes)_

Rare disease entity anchored to a MONDO ontology ID. Stores disease name, MONDO ID, Orphanet ID, OMIM ID, and description. Central hub connecting all other entities via relations.

### apt-patient-cohort (collection) _(feasibility: partial)_

Collection representing a patient cohort for a disease. Defined in schema but minimally used - no ingestion commands populate it.

### apt-mechanism (domain-thing) _(feasibility: yes)_

First-class entity for mechanism of harm. Central innovation: promoted from relation attribute to domain-thing. Attributes: apt-mechanism-type (GoF/LoF-partial/LoF-total/dominant-negative/haploinsufficiency/toxic-aggregation/pathway-dysregulation), apt-mechanism-level (molecular/cellular/tissue/systemic). Relations: apt-disease-has-mechanism, apt-mechanism-involves-gene, apt-mechanism-involves-protein, apt-mechanism-affects-pathway, apt-mechanism-causes-phenotype.

### apt-gene (domain-thing) _(feasibility: yes)_

Gene entity with HGNC symbol, gene name, HGNC ID, NCBI gene ID. Populated by ingest-genes from Monarch Initiative. Relations: apt-gene-causes-disease, apt-gene-associated-with, apt-mechanism-involves-gene, apt-gene-encodes.

### apt-protein (domain-thing) _(feasibility: partial)_

Protein entity for protein products of disease-associated genes. Attributes: UniProt ID, protein name, protein function. Linked via apt-gene-encodes relation. No ingestion path currently - must be added manually via add-gene or a future ingest-proteins command.


**Open Gaps:**

- [moderate] apt-protein has no ingestion path. Defined in schema but no ingest-proteins command. UniProt API would be the natural source. Proteins must be added manually.
### apt-pathway (domain-thing) _(feasibility: partial)_

Biological pathway entity (Reactome/KEGG pathway). Attributes: pathway ID, pathway name, pathway database. Linked via apt-mechanism-affects-pathway and apt-pathway-membership. No ingestion path - must be added manually. Future work: integrate Reactome/KEGG API.


**Open Gaps:**

- [moderate] apt-pathway has no ingestion path. Defined in schema but no ingest-pathways command. Reactome and KEGG are natural sources. Pathway enrichment analysis needs these entities.
### apt-phenotype (domain-thing) _(feasibility: yes)_

Phenotype entity anchored to HPO ontology. Attributes: HPO ID, phenotype name, frequency qualifier (obligate/very-frequent/frequent/occasional/rare/very-rare), onset. Populated by ingest-phenotypes from Monarch. Relations: apt-disease-has-phenotype, apt-mechanism-causes-phenotype.

### apt-variant (domain-thing) _(feasibility: partial)_

Genetic variant entity. Attributes: variant notation (c. and p. notation), variant type (missense/nonsense/frameshift/splice), ClinVar classification, HGVS notation. Relations: apt-variant-in-gene. No auto-ingestion - populated manually or from sequencing reports.

### apt-drug (domain-thing) _(feasibility: yes)_

Drug/compound entity from ChEMBL. Attributes: ChEMBL ID, drug name, drug type (small-molecule/biologic/gene-therapy), mechanism of action. Populated by ingest-drugs from ChEMBL API querying causal genes. Relations: apt-drug-targets, apt-drug-indicated-for, apt-strategy-implements.

### apt-therapeutic-strategy (domain-thing) _(feasibility: yes)_

Therapeutic strategy for a mechanism. Attributes: modality (enzyme-replacement/gene-therapy/substrate-reduction/chaperone/symptom-management/read-through), rationale, evidence-level. Claude-generated during sensemaking. Relations: apt-strategy-targets-mechanism, apt-strategy-implements (drug).

### apt-clinical-trial (domain-thing) _(feasibility: yes)_

Clinical trial entity from ClinicalTrials.gov v2 API. Attributes: NCT ID, trial title, phase, status, sponsor, enrollment count. Populated by ingest-clintrials. Relations: apt-trial-studies (disease or drug). Gap: queries by disease name string, not MONDO/MeSH ID.

### apt-disease-model (domain-thing) _(feasibility: partial)_

Experimental disease model (mouse model, zebrafish, cell line, organoid). Attributes: model type, species, model name, recapitulates-mechanism. Defined in schema and skill.yaml. No ingestion command implemented - must be added manually.


**Open Gaps:**

- [moderate] apt-disease-model has no ingestion command. Must be added manually. Could be partially automated from MGI or ZFIN APIs.
### apt-biomarker (domain-thing) _(feasibility: partial)_

Biomarker entity for disease monitoring or diagnosis. Attributes: biomarker name, biomarker type (genomic/proteomic/metabolomic/imaging), measurement method. Defined in schema. No ingestion path. Must be added manually.


**Open Gaps:**

- [minor] apt-biomarker has no ingestion path. Must be added manually. Low priority as biomarkers are often disease-specific and manually curated.
### apt-mondo-record (artifact) _(feasibility: yes)_

Raw MONDO/Monarch record for a disease. Populated by init-investigation. Stores full JSON from Monarch entity lookup API.

### apt-monarch-assoc-record (artifact) _(feasibility: yes)_

Monarch Initiative association records (phenotypes, genes) for a disease. Populated by ingest-phenotypes and ingest-genes. Multiple records per disease investigation.

### apt-omim-record (artifact) [MISSING] _(feasibility: no)_

OMIM record for disease/gene. Artifact type defined in schema and skill.yaml but NO ingest-omim command implemented. OMIM API requires API key. High-priority gap: OMIM provides unique clinical data, inheritance patterns, allelic variants not available from Monarch.


**Open Gaps:**

- [critical] OMIM ingestion completely missing. apt-omim-record artifact type defined but no ingest-omim command implemented. OMIM requires API key. OMIM provides inheritance patterns, allelic variants, clinical synopses not available from Monarch. Critical gap for complete disease characterization.
### apt-clinvar-record (artifact) [MISSING] _(feasibility: no)_

ClinVar variant record. Artifact type defined in schema. No ingest-clinvar command implemented. ClinVar provides variant pathogenicity classifications and evidence.


**Open Gaps:**

- [moderate] ClinVar ingestion missing. apt-clinvar-record defined but no ingest-clinvar command. ClinVar provides pathogenicity classifications and submitter evidence for known variants.
### apt-gnomad-record (artifact) [MISSING] _(feasibility: no)_

gnomAD population genetics record. Artifact type defined in schema. No ingest-gnomad command. gnomAD provides allele frequencies and constraint scores essential for variant interpretation.


**Open Gaps:**

- [moderate] gnomAD ingestion missing. apt-gnomad-record defined but no ingest-gnomad command. gnomAD provides population allele frequencies and loss-of-function constraint scores essential for variant interpretation.
### apt-clintrials-record (artifact) _(feasibility: yes)_

ClinicalTrials.gov v2 API response record. Populated by ingest-clintrials. Stores raw trial JSON including NCT ID, phase, status, interventions.

### apt-chembl-record (artifact) _(feasibility: yes)_

ChEMBL API response record for drug-target interactions. Populated by ingest-drugs querying causal genes as targets.

### apt-sequencing-report (artifact) [MISSING] _(feasibility: no)_

Whole-genome or whole-exome sequencing report. Artifact type defined in schema. No ingestion path - would need manual upload or HL7 FHIR integration. Lowest priority of missing artifacts.


**Open Gaps:**

- [minor] apt-sequencing-report artifact type defined in schema but no ingestion path. Lowest priority of missing artifacts - requires manual upload or HL7 FHIR integration.
### apt-mechanism-claim (fragment) _(feasibility: partial)_

Claude-extracted mechanism claim from artifact analysis. Links artifact evidence to mechanism hypothesis. Protocol for extraction not fully specified in USAGE.md.


**Open Gaps:**

- [moderate] apt-mechanism-claim extraction protocol unclear. Fragment type defined but no structured prompt ordering in USAGE.md specifying how Claude should extract mechanism claims from artifacts.
### apt-phenotype-entry (fragment) _(feasibility: yes)_

Phenotype frequency entry extracted from Monarch association records. Stores HPO ID, frequency qualifier, onset.

### apt-drug-interaction (fragment) _(feasibility: yes)_

Drug-target interaction fragment from ChEMBL records. Stores action type, activity value, assay type.

### apt-variant-call (fragment) _(feasibility: partial)_

Variant call fragment from sequencing reports or ClinVar. Stores HGVS notation, zygosity, classification.

### apt-conservation-data (fragment) _(feasibility: partial)_

Evolutionary conservation data for variants. Defined in schema but underspecified - unclear what attributes to store or what API to use (PhyloP? CADD? GERP?). Low priority.


**Open Gaps:**

- [minor] apt-conservation-data fragment type is underspecified. Schema defines it but no attributes specified and no API source documented. Unclear whether to use PhyloP, CADD, GERP, or SpliceAI scores.
### apt-disease-overview-note (note) _(feasibility: yes)_

Claude-generated disease overview note summarizing disease characteristics, prevalence, genetic basis.

### apt-mechanism-analysis-note (note) _(feasibility: yes)_

Claude-generated analysis of mechanism of harm. Core sensemaking output.

### apt-therapeutic-strategy-note (note) _(feasibility: yes)_

Claude-generated therapeutic strategy analysis per mechanism.

### apt-research-gaps-note (note) _(feasibility: partial)_

Claude-generated research gaps note identifying missing data, unanswered questions. Currently requires manual generation - no show-gaps CLI.


---

## Phase 3 -- Source Schema

### Monarch Initiative v3 API _(feasibility: yes)_

Primary source for phenotype-disease and gene-disease associations. Uses /entity/{MONDO_ID} for disease lookup and /entity/{MONDO_ID}/{biolink:Category} for associations. Returns phenotypes with HPO IDs and frequency qualifiers, causal genes with HGNC symbols, disease hierarchy subclasses. Operational and well-implemented. No significant gaps.

### ClinicalTrials.gov v2 API _(feasibility: yes)_

Source for clinical trial data. Uses /studies endpoint with condition query string. Operational and returns NCT ID, phase, status, sponsor, enrollment. Gap: queries by disease name string (not MONDO/MeSH ID), which misses trials registered under name variants or synonyms.


**Open Gaps:**

- [moderate] ClinicalTrials.gov query uses disease name string instead of MONDO ID or MeSH ID. This misses trials registered under alternative disease names, synonyms, or related conditions. Should use condition_id=MONDO:XXXXXXX or mesh_term when available.
### ChEMBL REST API _(feasibility: yes)_

Source for drug-target interaction data. Queries /mechanism endpoint for drugs targeting causal genes. Operational for finding approved and investigational compounds. Gap: only queries causal genes as targets; missing disease indication endpoint which would surface drugs for the condition itself (repurposing candidates).


**Open Gaps:**

- [moderate] ChEMBL ingest-drugs only queries causal genes as drug targets. Missing the disease indication endpoint which surfaces drugs already indicated for the condition or closely related conditions. Also missing target prediction APIs that could suggest novel druggable targets from pathway membership.
### OMIM API [MISSING] _(feasibility: no)_

OMIM (Online Mendelian Inheritance in Man) provides authoritative gene-disease relationships, inheritance patterns (AR/AD/XL), allelic variants, and clinical synopses. Artifact type apt-omim-record is defined but no ingestion command exists. Requires OMIM API key (free for academic use from omim.org/api). High priority: OMIM data is not duplicated by Monarch.


**Open Gaps:**

- [critical] OMIM ingestion completely missing. No ingest-omim command. OMIM API key required (free academic registration at omim.org/api). OMIM provides: inheritance patterns (AR/AD/XL/mitochondrial), allelic variant table with known pathogenic variants, clinical synopsis structured by organ system, molecular genetics section with functional studies. None of this data is available from Monarch or other sources.
### ClinVar + gnomAD [MISSING] _(feasibility: no)_

ClinVar provides variant pathogenicity classifications. gnomAD provides population allele frequencies and constraint scores (pLI, LOEUF). Both artifact types defined in schema. Neither has ingestion commands. ClinVar API is NCBI E-utilities. gnomAD has GraphQL API at gnomad.broadinstitute.org/api.


**Open Gaps:**

- [moderate] ClinVar and gnomAD ingestion both missing. ClinVar NCBI E-utilities API provides pathogenicity classifications for known variants. gnomAD GraphQL API provides allele frequencies (AF), loss-of-function intolerance (pLI, LOEUF), and homozygous variant counts in population controls. Both are needed for variant interpretation workflow.
### Scientific Literature (build-corpus scaffold) _(feasibility: partial)_

build-corpus command generates epmc-search shell commands for literature search but does not ingest papers into the APT graph. Papers are not linked to apt-disease, apt-mechanism, or apt-gene entities. This is a scaffold with no functional connection between the literature and the knowledge graph. High priority: literature is the primary evidence base for mechanism claims.


**Open Gaps:**

- [critical] build-corpus generates epmc-search shell commands but provides no ingestion or linkage. Papers retrieved by epmc-search are not ingested into the APT knowledge graph. There is no command to link a scientific paper (scilit-paper entity) to an apt-disease, apt-mechanism, or apt-gene. The literature is the primary evidence base for mechanism claims and therapeutic rationale - this gap makes the literature dimension non-functional.

---

## Phase 4 -- Derivation Skills

### search-disease + init-investigation _(feasibility: yes)_

search-disease queries Monarch for MONDO IDs matching a disease name. init-investigation creates apt-disease and apt-investigation entities plus apt-mondo-record artifact. Operational. Well-implemented.

### ingest-disease (full pipeline) _(feasibility: yes)_

Orchestrates: ingest-phenotypes (Monarch phenotype associations -> apt-phenotype entities), ingest-genes (Monarch gene associations -> apt-gene entities), ingest-hierarchy (Monarch subclass -> apt-disease-subclass-of relations), ingest-clintrials (ClinicalTrials.gov -> apt-clinical-trial entities), ingest-drugs (ChEMBL -> apt-drug entities). All sub-commands are operational. Gap: not idempotent - re-running creates duplicate entities without checking if they already exist.


**Open Gaps:**

- [moderate] ingest-disease is not idempotent. Re-running the full pipeline on an already-ingested disease creates duplicate apt-phenotype, apt-gene, apt-clinical-trial, and apt-drug entities. No existence check before insert. Should use match-or-insert pattern to be safe to re-run.
### Claude sensemaking (add-mechanism, link-*, add-strategy) _(feasibility: yes)_

Manual Claude-driven workflow: Claude reads artifacts via list-artifacts/show-artifact, synthesizes mechanism claims, then calls add-mechanism to create apt-mechanism entities and link-mechanism-gene/link-mechanism-phenotype/add-strategy/link-drug-mechanism to build the mechanism chain. All commands are operational. Gap: sensemaking workflow is underspecified in USAGE.md - no structured prompt ordering, no guidance on how many mechanisms to create, no protocol for mechanism-claim extraction from artifacts.


**Open Gaps:**

- [critical] Sensemaking workflow is underspecified in USAGE.md. There is no structured prompt ordering for Claude to follow: which artifacts to read first, how to structure mechanism claims, how many mechanisms to create per disease, what level of evidence is sufficient to assert a mechanism, or how to handle contradictory evidence across artifacts. A sensemaking protocol with example prompts and decision criteria is needed.
### add-note + tag _(feasibility: yes)_

add-note creates typed notes (apt-disease-overview-note, apt-mechanism-analysis-note, etc.) linked to entities. tag applies tags for search/filtering. Operational.

### ingest-omim [MISSING] _(feasibility: no)_

No ingest-omim command implemented. Would fetch OMIM disease records, allelic variants, and inheritance patterns via OMIM API. Required API key documentation is also missing from USAGE.md and skill.yaml.

### ingest-clinvar + ingest-gnomad [MISSING] _(feasibility: no)_

No ingest-clinvar or ingest-gnomad commands implemented. Would fetch variant pathogenicity and population frequency data to populate apt-clinvar-record and apt-gnomad-record artifacts.

### ingest-models [MISSING] _(feasibility: no)_

No ingest-models command to populate apt-disease-model entities from MGI or ZFIN. Must be added manually.


---

## Phase 5 -- Analysis Skills

### show-disease + show-mechanisms + show-phenome + show-genes + show-therapeutic-map + show-trials _(feasibility: yes)_

Six operational analysis view commands. show-disease: full disease overview with entities. show-mechanisms: mechanism chain with gene and phenotype links. show-phenome: phenotypes by HPO frequency tier. show-genes: causal and associated genes with evidence. show-therapeutic-map: therapeutic strategies per mechanism with candidate drugs. show-trials: clinical trials with phase and status. All operational. Gap: cannot automatically surface gaps - show-mechanisms does not highlight mechanisms with no strategy or genes with no mechanism.


**Open Gaps:**

- [critical] show-mechanisms, show-therapeutic-map, and show-phenome do not highlight gaps automatically. A mechanism with no linked therapeutic strategy appears identical to one with strategies. Phenotypes not linked to any mechanism are not flagged. Adding gap indicators to these views or a dedicated show-gaps command is needed.
### build-corpus _(feasibility: partial)_

Generates epmc-search CLI commands for literature retrieval based on disease name and gene symbols. Provides shell commands to run but does not execute them, ingest papers into TypeDB, or link papers to apt-disease/apt-mechanism/apt-gene entities. Functions as a scaffold that generates instructions rather than a complete ingestion pipeline.


**Open Gaps:**

- [critical] build-corpus only generates shell commands but does not ingest literature or link papers to the APT knowledge graph. After running epmc-search, there is no command to link retrieved papers to apt-disease, apt-gene, or apt-mechanism entities. The literature evidence base is completely disconnected from the mechanism and therapeutic graph.
### show-gaps [MISSING - TypeQL in USAGE.md] _(feasibility: no)_

No show-gaps CLI command. TypeQL queries exist in USAGE.md for: (1) mechanisms with no linked therapeutic strategy, (2) phenotypes not linked to any mechanism, (3) genes not linked to any mechanism. These queries could be wrapped as a show-gaps command. High priority: gap analysis is a core APM deliverable.


**Open Gaps:**

- [critical] show-gaps CLI command is missing. TypeQL queries for gap analysis exist in USAGE.md but are not wrapped as a CLI command. Users must manually run TypeQL in TypeDB console. The gap queries cover: (1) mechanisms with no therapeutic strategy, (2) phenotypes with no mechanism, (3) genes with no mechanism, (4) diseases with no sensemaking notes.
### show-repurposing [MISSING - TypeQL in USAGE.md] _(feasibility: no)_

No show-repurposing CLI command. TypeQL query exists in USAGE.md for finding drugs shared across diseases with the same mechanism type. This enables cross-disease repurposing analysis. Currently requires manually running TypeQL in TypeDB console.


**Open Gaps:**

- [moderate] show-repurposing CLI command is missing. TypeQL exists in USAGE.md but not as a CLI command. Cross-disease repurposing is a key APM Phase 2 deliverable that should be easily accessible.
### show-sibling-diseases [MISSING] _(feasibility: no)_

No show-sibling-diseases command to surface diseases sharing mechanism types. Would query apt-disease-has-mechanism relations across diseases to find diseases with the same apt-mechanism-type for comparison and repurposing context.

### export-report [MISSING] _(feasibility: no)_

No export-report command to generate a structured disease profile report. Would compile show-disease, show-mechanisms, show-therapeutic-map, show-gaps into a single markdown or PDF report. Referenced in skill SKILL.md as planned but not implemented.

### Dashboard (mechanism map, therapeutic landscape, gap analysis) [MISSING] _(feasibility: no)_

No dashboard components for APT skill. No dash/ directory in local_skills/alg-precision-therapeutics/. A mechanism map visualization, therapeutic landscape overview, and gap analysis panel would be high-value for clinical use. Low priority compared to CLI gaps.


**Open Gaps:**

- [moderate] No dashboard components exist for the APT skill. A mechanism map visualization showing the gene->mechanism->phenotype->therapy chain would significantly improve usability for clinical researchers. No dash/ directory in local_skills/alg-precision-therapeutics/.
