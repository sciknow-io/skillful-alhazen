import { NextRequest, NextResponse } from 'next/server';
import { getSystemDecisions } from '@/lib/techrecon';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await getSystemDecisions(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Decisions error:', error);
    return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 });
  }
}
