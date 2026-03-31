import { NextRequest, NextResponse } from 'next/server';
import { getBenchmarks } from '@/lib/techrecon';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await getBenchmarks(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Benchmarks error:', error);
    return NextResponse.json({ error: 'Failed to fetch benchmarks' }, { status: 500 });
  }
}
