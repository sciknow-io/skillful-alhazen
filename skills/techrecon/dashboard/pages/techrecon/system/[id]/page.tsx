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
  ExternalLink,
  RefreshCw,
  Star,
  GitBranch,
  Scale,
  Package,
  Puzzle,
  FileText,
  Database,
  Server,
  Brain,
  Cpu,
  BarChart2,
  Workflow,
} from 'lucide-react';
import { MaturityBadge, LanguageBadge, TypeBadge, FormatBadge, GranularityBadge } from '@/components/techrecon/badges';
import { TagChips } from '@/components/techrecon/tag-chips';
import { ArchitectureMap } from '@/components/techrecon/architecture-map';

interface SystemPageProps {
  params: Promise<{ id: string }>;
}

export default function SystemPage({ params }: SystemPageProps) {
  const { id } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [archData, setArchData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [decisions, setDecisions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSystem() {
      setLoading(true);
      setError(null);
      try {
        const [sysRes, archRes, benchRes, decRes, wfRes] = await Promise.all([
          fetch(`/api/techrecon/system/${id}`),
          fetch(`/api/techrecon/architecture/${id}`),
          fetch(`/api/techrecon/benchmarks/${id}`),
          fetch(`/api/techrecon/decisions/${id}`),
          fetch(`/api/techrecon/workflows?system=${id}`),
        ]);
        if (!sysRes.ok) throw new Error('Failed to fetch system');
        const sysJson = await sysRes.json();
        setData(sysJson);
        if (archRes.ok) {
          const archJson = await archRes.json();
          setArchData(archJson);
        }
        if (benchRes.ok) {
          const benchJson = await benchRes.json();
          setBenchmarks(benchJson.benchmarks || []);
        }
        if (decRes.ok) {
          const decJson = await decRes.json();
          setDecisions(decJson.decisions || []);
        }
        if (wfRes.ok) {
          const wfJson = await wfRes.json();
          setWorkflows(wfJson.workflows || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchSystem();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-8">
        <Link href="/techrecon">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to TechRecon
          </Button>
        </Link>
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error || 'System not found'}
        </div>
      </div>
    );
  }

  const system = data.system || {};
  const components = data.components || [];
  const dataModels = data.data_models || [];
  const dependencies = data.dependencies || [];
  const artifacts = data.artifacts || [];
  const notes = data.notes || [];
  const tags = data.tags || [];

  // Architecture data
  const archComponents = archData?.components || [];
  const conceptLinks = archData?.concept_links || [];
  const componentDependencies = archData?.component_dependencies || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/techrecon">
            <Button variant="ghost" size="sm" className="mb-2 hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to TechRecon
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                <Server className="w-6 h-6 text-cyan-400" />
                {system.name || 'Unknown System'}
              </h1>
              {system.description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  {system.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {system.language && <LanguageBadge language={system.language} />}
              {system.maturity && <MaturityBadge maturity={system.maturity} />}
              {system.repo_url && (
                <a href={system.repo_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Repository
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {system.stars != null && system.stars > 0 && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Star className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Stars</p>
                  <p className="font-medium">{system.stars.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {system.license && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Scale className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">License</p>
                  <p className="font-medium">{system.license}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {system.version && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Package className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="font-medium">{system.version}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {system.last_commit && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Commit</p>
                  <p className="font-medium">{system.last_commit}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {system.base_model && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Brain className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Base Model</p>
                  <p className="font-medium">{system.base_model}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {system.model_architecture && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Cpu className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Architecture</p>
                  <p className="font-medium">{system.model_architecture}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Tags:</span>
            <TagChips tags={tags} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Architecture */}
            {archComponents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Puzzle className="w-5 h-5" />
                    Architecture
                    <Badge variant="secondary" className="ml-auto">
                      {archComponents.length} components
                    </Badge>
                    <Link href={`/techrecon/architecture/${id}`}>
                      <Button variant="ghost" size="sm">
                        Expand View
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ArchitectureMap
                    components={archComponents}
                    conceptLinks={conceptLinks}
                    componentDependencies={componentDependencies}
                  />
                </CardContent>
              </Card>
            )}

            {/* Benchmarks */}
            {benchmarks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5" />
                    Benchmarks
                    <Badge variant="secondary" className="ml-auto">{benchmarks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 font-medium text-muted-foreground">Benchmark</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Value</th>
                          <th className="text-left py-2 font-medium text-muted-foreground pl-2">Context</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {benchmarks.map((b: any, idx: number) => (
                          <tr key={b.id || idx} className="border-b border-border/30 last:border-0">
                            <td className="py-2">
                              <span className="font-medium">{b.name}</span>
                              {b.metric && b.metric !== b.name && (
                                <span className="text-muted-foreground ml-1">({b.metric})</span>
                              )}
                            </td>
                            <td className="py-2 text-right font-mono">
                              {b.value}{b.unit && <span className="text-muted-foreground ml-0.5">{b.unit}</span>}
                            </td>
                            <td className="py-2 pl-2 text-muted-foreground text-xs">{b.context}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Workflows */}
            {workflows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-cyan-500" />
                    Workflows
                    <Badge variant="secondary" className="ml-auto">{workflows.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {workflows.map((wf: any) => (
                    <div key={wf.id} className="border border-border/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <Link href={`/techrecon/workflow/${wf.id}`} className="font-medium text-sm hover:underline text-primary">
                          {wf.name}
                        </Link>
                        <GranularityBadge granularity={wf.granularity} />
                      </div>
                      {wf.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{wf.description}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Design Decisions */}
            {decisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Design Decisions
                    <Badge variant="secondary" className="ml-auto">{decisions.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {decisions.map((d: any, idx: number) => (
                    <div key={d.id || idx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{d.name}</span>
                        {d.status && (
                          <Badge variant="outline" className="text-xs capitalize ml-auto">
                            {d.status}
                          </Badge>
                        )}
                      </div>
                      {d.rationale && (
                        <p className="text-xs text-muted-foreground"><strong>Rationale:</strong> {d.rationale}</p>
                      )}
                      {d['alternatives'] && (
                        <p className="text-xs text-muted-foreground"><strong>Alternatives:</strong> {d['alternatives']}</p>
                      )}
                      {d['trade-off'] && (
                        <p className="text-xs text-muted-foreground"><strong>Trade-off:</strong> {d['trade-off']}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Dependencies ({dependencies.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {dependencies.map((dep: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Link
                          href={`/techrecon/system/${dep.id}`}
                          className="text-primary hover:underline font-medium text-sm"
                        >
                          {dep.name}
                        </Link>
                        {dep.relationship && (
                          <Badge variant="outline" className="text-xs">
                            {dep.relationship}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {notes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Notes
                    <Badge variant="secondary" className="ml-auto">
                      {notes.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {notes.map((note: any, idx: number) => (
                    <div key={note.id || idx} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        {note.name && <span className="font-medium">{note.name}</span>}
                        {note.type && <TypeBadge type={note.type} />}
                      </div>
                      {note.content && (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {note.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      {idx < notes.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar (1/3) */}
          <div className="space-y-6">
            {/* Data Models */}
            {dataModels.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Data Models
                    <Badge variant="secondary" className="ml-auto">
                      {dataModels.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {dataModels.map((dm: any) => (
                    <div key={dm.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{dm.name}</span>
                      {dm.format && <FormatBadge format={dm.format} />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Artifacts */}
            {artifacts.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Artifacts
                    <Badge variant="secondary" className="ml-auto">
                      {artifacts.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {artifacts.map((art: any) => (
                    <Link
                      key={art.id}
                      href={`/techrecon/artifact/${art.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="text-sm font-medium truncate">{art.name}</span>
                      {art.type && <TypeBadge type={art.type} />}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Doc URL */}
            {system.doc_url && (
              <Card>
                <CardContent className="p-4">
                  <a
                    href={system.doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Documentation
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
