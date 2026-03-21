import { NextResponse } from 'next/server';
import { listFigures } from '@/lib/they-said-whaaa';

export async function GET() {
  try {
    const data = await listFigures();
    return NextResponse.json(data);
  } catch (error) {
    console.error('they-said-whaaa /figures error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
