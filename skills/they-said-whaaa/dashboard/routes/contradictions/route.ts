import { NextResponse } from 'next/server';
import { listContradictions } from '@/lib/they-said-whaaa';

export async function GET() {
  try {
    const data = await listContradictions();
    return NextResponse.json(data);
  } catch (error) {
    console.error('they-said-whaaa /contradictions error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
