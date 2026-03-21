'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Megaphone, MessageSquare, Users } from 'lucide-react';
import { FigureCard, type FigureSummary } from '@/components/they-said-whaaa/figure-card';

interface FiguresResponse {
  success: boolean;
  count: number;
  figures: FigureSummary[];
}

interface StatsResponse {
  success: boolean;
  count: number;
}

export default function TheySaidWhaaaPage() {
  const [figures, setFigures] = useState<FigureSummary[]>([]);
  const [totalClaims, setTotalClaims] = useState<number>(0);
  const [totalContradictions, setTotalContradictions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [figRes, contraRes] = await Promise.all([
        fetch('/api/they-said-whaaa/figures'),
        fetch('/api/they-said-whaaa/contradictions'),
      ]);
      if (!figRes.ok) throw new Error('Failed to fetch figures');
      const figData: FiguresResponse = await figRes.json();
      setFigures(figData.figures ?? []);

      if (contraRes.ok) {
        const contraData: StatsResponse = await contraRes.json();
        setTotalContradictions(contraData.count ?? 0);
      }

      const claimCount = (figData.figures ?? []).reduce(
        (sum, f) => sum + (f.claim_count ?? 0), 0
      );
      setTotalClaims(claimCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Hub
              </Link>
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <h1 className="text-xl font-bold">They Said Whaaa?</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats row */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border border-border/50 bg-card/30 p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-2xl font-bold">{figures.length}</p>
                <p className="text-xs text-muted-foreground">Figures</p>
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/30 p-4 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-2xl font-bold">{totalClaims}</p>
                <p className="text-xs text-muted-foreground">Claims</p>
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/30 p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-2xl font-bold">{totalContradictions}</p>
                <p className="text-xs text-muted-foreground">Contradictions</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading figures…</div>
        )}

        {!loading && !error && figures.length === 0 && (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No figures tracked yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">add-figure</code> to start tracking.
            </p>
          </div>
        )}

        {!loading && figures.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {figures.map((figure) => (
              <FigureCard key={figure.id} figure={figure} />
            ))}
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
