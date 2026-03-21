'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';
import { ClaimsList, type Claim } from '@/components/they-said-whaaa/claims-list';
import { PositionBadge, type Position } from '@/components/they-said-whaaa/position-badge';

interface FigureDetail {
  id: string;
  name: string;
  description?: string | null;
  role?: string | null;
  party?: string | null;
  country?: string | null;
  url?: string | null;
  created?: string | null;
}

interface Topic {
  topic_id: string;
  topic_name: string;
}

interface Contradiction {
  claim1_id: string;
  claim1_text: string;
  claim1_position?: Position;
  claim2_id: string;
  claim2_text: string;
  claim2_position?: Position;
  contradiction_type?: string | null;
}

interface FigureResponse {
  success: boolean;
  figure?: FigureDetail;
  topics?: Topic[];
  claims?: Claim[];
  contradictions?: Contradiction[];
  error?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FigureDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [data, setData] = useState<FigureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/they-said-whaaa/figure/${id}`);
      if (!res.ok) throw new Error('Failed to fetch figure');
      const d: FigureResponse = await res.json();
      if (!d.success) throw new Error(d.error ?? 'Unknown error');
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const figure = data?.figure;
  const claims = data?.claims ?? [];
  const topics = data?.topics ?? [];
  const contradictions = data?.contradictions ?? [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/they-said-whaaa"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Figures
              </Link>
              <h1 className="text-xl font-bold">{figure?.name ?? 'Loading…'}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
        )}

        {!loading && figure && (
          <div className="space-y-6">
            {/* Figure profile */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{figure.name}</h2>
                  {figure.role && (
                    <p className="text-muted-foreground capitalize mt-1">{figure.role}</p>
                  )}
                  {figure.description && (
                    <p className="text-sm mt-3 text-muted-foreground">{figure.description}</p>
                  )}
                </div>
                {figure.url && (
                  <a
                    href={figure.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline flex-shrink-0"
                  >
                    Profile <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {figure.party && (
                  <span className="text-xs px-2 py-1 rounded border border-border/50 bg-muted/30">
                    {figure.party}
                  </span>
                )}
                {figure.country && (
                  <span className="text-xs px-2 py-1 rounded border border-border/50 bg-muted/30">
                    {figure.country}
                  </span>
                )}
              </div>

              {/* Topics */}
              {topics.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">Topics tracked</p>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t) => (
                      <span
                        key={t.topic_id}
                        className="text-xs px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400"
                      >
                        {t.topic_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contradictions */}
            {contradictions.length > 0 && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                  {contradictions.length} Contradiction{contradictions.length !== 1 ? 's' : ''} Detected
                </h3>
                <div className="space-y-4">
                  {contradictions.map((c, i) => (
                    <div key={i} className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border/40 bg-card/30 p-3">
                        <PositionBadge position={c.claim1_position} className="mb-2" />
                        <p className="text-sm">{c.claim1_text}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-card/30 p-3">
                        <PositionBadge position={c.claim2_position} className="mb-2" />
                        <p className="text-sm">{c.claim2_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Claims timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Claims ({claims.length})
              </h3>
              <ClaimsList claims={claims} showDate />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            They Said Whaaa? &bull; Powered by TypeDB + Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}
