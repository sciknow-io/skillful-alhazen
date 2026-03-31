'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Workflow, Puzzle, Server } from 'lucide-react';
import { GranularityBadge } from '@/components/techrecon/badges';

interface WorkflowPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkflow() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/techrecon/workflow/${id}`);
        if (!res.ok) throw new Error('Failed to fetch workflow');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchWorkflow();
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
          <strong>Error:</strong> {error || 'Workflow not found'}
        </div>
      </div>
    );
  }

  const workflow = data.workflow || {};
  const system = data.system;
  const components = data.components || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          {system ? (
            <Link href={`/techrecon/system/${system.id}`}>
              <Button variant="ghost" size="sm" className="mb-2 hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {system.name}
              </Button>
            </Link>
          ) : (
            <Link href="/techrecon">
              <Button variant="ghost" size="sm" className="mb-2 hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to TechRecon
              </Button>
            </Link>
          )}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                <Workflow className="w-6 h-6 text-cyan-500" />
                {workflow.name || 'Unknown Workflow'}
              </h1>
              {workflow.description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  {workflow.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <GranularityBadge granularity={workflow.granularity} />
            </div>
          </div>
          {system && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Server className="w-4 h-4" />
              <Link href={`/techrecon/system/${system.id}`} className="text-primary hover:underline">
                {system.name}
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {workflow.content && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-cyan-500" />
                    Workflow Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {workflow.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Linked Components */}
            {components.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Puzzle className="w-4 h-4" />
                    Components
                    <Badge variant="secondary" className="ml-auto">
                      {components.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {components.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/techrecon/component/${c.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Puzzle className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="text-sm font-medium truncate">{c.name}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
