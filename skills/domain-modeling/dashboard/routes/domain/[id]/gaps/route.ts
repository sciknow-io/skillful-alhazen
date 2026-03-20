import { NextResponse } from 'next/server';
import { getDomainGaps } from '@/lib/domain-modeling';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getDomainGaps(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('domain-modeling gaps error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
