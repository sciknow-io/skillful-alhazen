import { NextRequest, NextResponse } from 'next/server';
import { listComparisons } from '@/lib/techrecon';

export async function GET(request: NextRequest) {
  const investigation = request.nextUrl.searchParams.get('investigation') || undefined;
  try {
    const data = await listComparisons(investigation);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Comparisons error:', error);
    return NextResponse.json({ error: 'Failed to fetch comparisons' }, { status: 500 });
  }
}
