'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  RefreshCw,
  FileText,
  Briefcase,
  Rocket,
  Users,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  warm: 'bg-green-500/20 text-green-400 border-green-500/30',
  exploring: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function statusColor(status: string | null): string {
  if (!status) return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return STATUS_COLORS[status.toLowerCase()] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; gradient: string }> = {
  'jobhunt-engagement': {
    label: 'Consulting Engagement',
    icon: <Briefcase className="w-4 h-4" />,
    gradient: 'from-indigo-400 to-blue-400',
  },
  'jobhunt-venture': {
    label: 'Venture / Advisory',
    icon: <Rocket className="w-4 h-4" />,
    gradient: 'from-purple-400 to-pink-400',
  },
  'jobhunt-lead': {
    label: 'Networking Lead',
    icon: <Users className="w-4 h-4" />,
    gradient: 'from-emerald-400 to-teal-400',
  },
};

interface OpportunityPageProps {
  params: Promise<{ id: string }>;
}

export default function OpportunityPage({ params }: OpportunityPageProps) {
  const { id } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOpportunity() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/jobhunt/opportunity/${id}`);
        if (!res.ok) throw new Error('Failed to fetch opportunity');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchOpportunity();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Link href="/jobhunt">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error || 'Opportunity not found'}
        </div>
      </div>
    );
  }

  const opp = data.opportunity;
  const company = data.company;
  const notes = data.notes || [];
  const oppType: string = data.type || '';
  const meta = TYPE_META[oppType] || TYPE_META['jobhunt-lead'];

  const name = opp?.name || 'Unknown Opportunity';
  const priority = opp?.['priority-level'];
  const status = opp?.['opportunity-status'];
  const description = opp?.description;
  const deadline = opp?.deadline;
  const companyName = company?.name || null;
  const companyUrl = company?.['company-url'] || null;

  // Type-specific fields
  const engagementType = opp?.['engagement-type'];
  const rateInfo = opp?.['rate-info'];
  const ventureStage = opp?.['venture-stage'];
  const equityType = opp?.['equity-type'];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/jobhunt">
            <Button variant="ghost" size="sm" className="mb-2 hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  {meta.icon}
                  {meta.label}
                </Badge>
              </div>
              <h1 className={`text-2xl font-bold bg-gradient-to-r ${meta.gradient} bg-clip-text text-transparent`}>
                {name}
              </h1>
              {companyName && (
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Building2 className="w-4 h-4" />
                  <span>{companyName}</span>
                  {companyUrl && (
                    <a href={companyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {priority && (
                <Badge className={PRIORITY_COLORS[priority]}>
                  {priority} priority
                </Badge>
              )}
              {status && (
                <Badge className={statusColor(status)}>
                  {status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Notes */}
          <div className="lg:col-span-2 space-y-6">
            {description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            )}

            {notes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notes
                    <Badge variant="secondary" className="ml-auto">{notes.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {notes.map((note: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      {note.content && (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {note.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      {idx < notes.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {notes.length === 0 && !description && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  No notes yet. Use the jobhunt skill to add notes to this opportunity.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column — Quick Facts */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {status && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={statusColor(status)}>{status}</Badge>
                  </div>
                )}

                {/* Venture-specific */}
                {ventureStage && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Stage
                    </span>
                    <Badge variant="outline">{ventureStage}</Badge>
                  </div>
                )}
                {equityType && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Equity type</span>
                    <span className="font-medium capitalize">{equityType}</span>
                  </div>
                )}

                {/* Engagement-specific */}
                {engagementType && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Type
                    </span>
                    <span className="font-medium capitalize">{engagementType}</span>
                  </div>
                )}
                {rateInfo && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Rate
                    </span>
                    <span className="font-medium">{rateInfo}</span>
                  </div>
                )}

                {deadline && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="font-medium">{deadline}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {companyName && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Company
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{companyName}</p>
                  {companyUrl && (
                    <a
                      href={companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {companyUrl}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
