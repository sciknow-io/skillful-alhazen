'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Dna } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvestigationsList, Investigation } from '@/components/alg-precision-therapeutics/investigations-list';

export default function AptPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/alg-precision-therapeutics/investigations');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInvestigations(data.investigations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Hub
              </Link>
              <div className="flex items-center gap-3">
                <Dna className="w-6 h-6 text-teal-400" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                    Disease Mechanism Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Precision therapeutics investigations
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="border-border/50 hover:border-teal-500/50 hover:bg-teal-500/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
            <strong>Error:</strong> {error}
            <p className="text-sm mt-1">Make sure TypeDB is running and the APT skill is configured.</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <InvestigationsList investigations={investigations} />
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
