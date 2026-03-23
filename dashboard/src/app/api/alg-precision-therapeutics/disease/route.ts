import { NextRequest, NextResponse } from 'next/server';
import { showDisease } from '@/lib/alg-precision-therapeutics';

export async function GET(request: NextRequest) {
  const mondoId = request.nextUrl.searchParams.get('mondo_id');
  if (!mondoId) {
    return NextResponse.json({ error: 'mondo_id is required' }, { status: 400 });
  }
  try {
    const data = await showDisease(mondoId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('APT disease error:', error);
    return NextResponse.json({ error: 'Failed to fetch disease' }, { status: 500 });
  }
}
