'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MechanismCard, Mechanism } from '@/components/alg-precision-therapeutics/mechanism-card';
import { PhenomeTable, PhenomeTier } from '@/components/alg-precision-therapeutics/phenome-table';
import { GapsPanel } from '@/components/alg-precision-therapeutics/gaps-panel';

interface Gene {
  id: string;
  symbol: string;
  hgnc_id: string;
  association_type: string;
}

interface Disease {
  id: string;
  name: string;
  mondo_id: string;
  omim_id: string | null;
  orpha_id: string | null;
  inheritance_pattern: string | null;
  prevalence: string | null;
  age_of_onset: string | null;
  phenotype_count: number;
  causal_genes: Gene[];
  mechanisms: unknown[];
}

interface GapData {
  undrugged_mechanisms: { id: string; name: string; type: string }[];
  unexplained_phenotypes: { hpo_id: string; label: string }[];
  orphan_genes: { id: string; symbol: string }[];
  summary: { undrugged_count: number; unexplained_phenotype_count: number; orphan_gene_count: number };
}

export default function DiseaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const mondoId = decodeURIComponent(id);

  const [disease, setDisease] = useState<Disease | null>(null);
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([]);
  const [phenome, setPhenome] = useState<PhenomeTier[]>([]);
  const [genes, setGenes] = useState<Gene[]>([]);
  const [gaps, setGaps] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCore() {
    setLoading(true);
    setError(null);
    try {
      const qs = `?mondo_id=${encodeURIComponent(mondoId)}`;
      const [diseaseRes, mechRes, phenomeRes, genesRes] = await Promise.all([
        fetch(`/api/alg-precision-therapeutics/disease${qs}`),
        fetch(`/api/alg-precision-therapeutics/mechanisms${qs}`),
        fetch(`/api/alg-precision-therapeutics/phenome${qs}`),
        fetch(`/api/alg-precision-therapeutics/genes${qs}`),
      ]);

      const [diseaseData, mechData, phenomeData, genesData] = await Promise.all([
        diseaseRes.json(), mechRes.json(), phenomeRes.json(), genesRes.json(),
      ]);

      setDisease(diseaseData.disease ?? null);
      setMechanisms(mechData.mechanisms ?? []);
      setPhenome(phenomeData.phenome ?? []);
      setGenes([...(genesData.causal_genes ?? []), ...(genesData.associated_genes ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function fetchGaps() {
    setGapsLoading(true);
    try {
      const res = await fetch(
        `/api/alg-precision-therapeutics/gaps?mondo_id=${encodeURIComponent(mondoId)}`
      );
      const data = await res.json();
      setGaps(data);
    } catch {
      // gaps are non-critical
    } finally {
      setGapsLoading(false);
    }
  }

  useEffect(() => { fetchCore(); }, [mondoId]);

  const handleTabChange = (tab: string) => {
    if (tab === 'gaps' && !gaps) fetchGaps();
  };

  const omimUrl = disease?.omim_id
    ? `https://omim.org/entry/${disease.omim_id}`
    : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/apt"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Investigations
              </Link>
              {disease && (
                <div>
                  <h1 className="text-xl font-bold capitalize">{disease.name}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <code className="text-xs text-teal-400">{disease.mondo_id}</code>
                    {disease.omim_id && omimUrl && (
                      <a
                        href={omimUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        OMIM:{disease.omim_id}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {disease.inheritance_pattern && (
                      <Badge variant="outline" className="text-xs border-slate-500/30 text-slate-400">
                        {disease.inheritance_pattern}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs border-teal-500/30 text-teal-400">
                      {disease.phenotype_count} phenotypes
                    </Badge>
                    <Badge variant="outline" className="text-xs border-teal-500/30 text-teal-400">
                      {mechanisms.length} mechanism{mechanisms.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCore}
              disabled={loading}
              className="border-border/50 hover:border-teal-500/50 hover:bg-teal-500/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="mechanisms" onValueChange={handleTabChange}>
            <TabsList className="mb-6">
              <TabsTrigger value="mechanisms">
                Mechanisms ({mechanisms.length})
              </TabsTrigger>
              <TabsTrigger value="phenome">
                Phenome ({disease?.phenotype_count ?? 0})
              </TabsTrigger>
              <TabsTrigger value="genes">
                Genes ({genes.length})
              </TabsTrigger>
              <TabsTrigger value="gaps">
                Gaps
              </TabsTrigger>
            </TabsList>

            {/* Mechanisms tab */}
            <TabsContent value="mechanisms" className="space-y-4">
              {mechanisms.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No mechanisms yet. Run sensemaking to add them.
                </p>
              ) : (
                mechanisms.map((m, i) => (
                  <MechanismCard key={m.id} mechanism={m} index={i} />
                ))
              )}
            </TabsContent>

            {/* Phenome tab */}
            <TabsContent value="phenome">
              {phenome.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No phenotypes ingested.</p>
              ) : (
                <PhenomeTable phenome={phenome} total={disease?.phenotype_count ?? 0} />
              )}
            </TabsContent>

            {/* Genes tab */}
            <TabsContent value="genes">
              {genes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No genes ingested.</p>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Symbol</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">HGNC ID</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Association</th>
                      </tr>
                    </thead>
                    <tbody>
                      {genes.map((g) => (
                        <tr key={g.id} className="border-t border-border/30 hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono font-semibold">{g.symbol}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <a
                              href={`https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${g.hgnc_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors flex items-center gap-1"
                            >
                              {g.hgnc_id}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={
                                g.association_type === 'causal'
                                  ? 'border-red-500/30 text-red-300 bg-red-500/10 text-xs'
                                  : 'text-xs'
                              }
                            >
                              {g.association_type}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Gaps tab */}
            <TabsContent value="gaps">
              {gapsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : gaps ? (
                <GapsPanel
                  undrugged={gaps.undrugged_mechanisms}
                  unexplained={gaps.unexplained_phenotypes}
                  orphanGenes={gaps.orphan_genes}
                  summary={gaps.summary}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Click this tab to load gap analysis.
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            Disease Mechanism Dashboard &bull; Powered by TypeDB + Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}
