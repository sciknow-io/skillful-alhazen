import { NextRequest, NextResponse } from 'next/server';
import { showMechanisms } from '@/lib/alg-precision-therapeutics';

export async function GET(request: NextRequest) {
  const mondoId = request.nextUrl.searchParams.get('mondo_id');
  if (!mondoId) {
    return NextResponse.json({ error: 'mondo_id is required' }, { status: 400 });
  }
  try {
    const data = await showMechanisms(mondoId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('APT mechanisms error:', error);
    return NextResponse.json({ error: 'Failed to fetch mechanisms' }, { status: 500 });
  }
}
