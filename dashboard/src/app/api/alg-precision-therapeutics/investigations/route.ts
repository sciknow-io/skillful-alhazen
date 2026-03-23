import { NextResponse } from 'next/server';
import { listInvestigations } from '@/lib/alg-precision-therapeutics';

export async function GET() {
  try {
    const data = await listInvestigations();
    return NextResponse.json(data);
  } catch (error) {
    console.error('APT investigations error:', error);
    return NextResponse.json({ error: 'Failed to fetch investigations' }, { status: 500 });
  }
}
