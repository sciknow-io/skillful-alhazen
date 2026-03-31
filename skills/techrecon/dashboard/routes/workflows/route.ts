import { NextRequest, NextResponse } from 'next/server';
import { listWorkflows } from '@/lib/techrecon';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const system = searchParams.get('system') ?? undefined;
    const data = await listWorkflows(system);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Workflows error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}
