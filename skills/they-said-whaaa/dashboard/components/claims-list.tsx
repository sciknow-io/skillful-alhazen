'use client';

import { PositionBadge, type Position } from './position-badge';

export interface Claim {
  claim_id?: string;
  id?: string;
  claim_text?: string;
  text?: string;
  name?: string;
  position?: Position;
  claim_position?: Position;
  statement_date?: string | null;
  created?: string | null;
  confidence?: number | null;
}

interface ClaimsListProps {
  claims: Claim[];
  showDate?: boolean;
}

function claimId(c: Claim) { return c.claim_id ?? c.id ?? ''; }
function claimText(c: Claim) { return c.claim_text ?? c.text ?? c.name ?? '(no text)'; }
function claimPosition(c: Claim): Position { return (c.position ?? c.claim_position) as Position; }
function claimDate(c: Claim) {
  const d = c.statement_date ?? c.created;
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ClaimsList({ claims, showDate = true }: ClaimsListProps) {
  if (claims.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No claims yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {claims.map((claim) => (
        <li
          key={claimId(claim)}
          className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/30 px-4 py-3"
        >
          <PositionBadge position={claimPosition(claim)} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">{claimText(claim)}</p>
            {showDate && claimDate(claim) && (
              <p className="text-xs text-muted-foreground mt-1">{claimDate(claim)}</p>
            )}
          </div>
          {claim.confidence != null && (
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {Math.round(claim.confidence * 100)}%
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
