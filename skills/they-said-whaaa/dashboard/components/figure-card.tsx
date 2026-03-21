'use client';

import Link from 'next/link';
import { AlertTriangle, MessageSquare, User } from 'lucide-react';

export interface FigureSummary {
  id: string;
  name: string;
  role?: string | null;
  party?: string | null;
  country?: string | null;
  created?: string | null;
  claim_count?: number;
  contradiction_count?: number;
}

interface FigureCardProps {
  figure: FigureSummary;
}

const PARTY_COLORS: Record<string, string> = {
  democrat: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  republican: 'text-red-400 bg-red-500/10 border-red-500/20',
  independent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

function partyStyle(party?: string | null): string {
  if (!party) return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  return PARTY_COLORS[party.toLowerCase()] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/20';
}

export function FigureCard({ figure }: FigureCardProps) {
  const contradictions = figure.contradiction_count ?? 0;
  const claims = figure.claim_count ?? 0;

  return (
    <Link
      href={`/they-said-whaaa/figure/${figure.id}`}
      className="block group rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-amber-500/40 transition-all duration-200 p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">{figure.name}</h2>
            {figure.role && (
              <p className="text-xs text-muted-foreground truncate capitalize">{figure.role}</p>
            )}
          </div>
        </div>

        {contradictions > 0 && (
          <span className="flex-shrink-0 flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" />
            {contradictions}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-4">
        {figure.party && (
          <span className={`text-xs px-2 py-0.5 rounded border ${partyStyle(figure.party)}`}>
            {figure.party}
          </span>
        )}
        {figure.country && (
          <span className="text-xs text-muted-foreground">{figure.country}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/30 pt-3 mt-3">
        {claims > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {claims} claim{claims !== 1 ? 's' : ''}
          </span>
        )}
        {figure.created && (
          <span className="ml-auto">
            {new Date(figure.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>
    </Link>
  );
}
