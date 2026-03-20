import { NextResponse } from 'next/server';
import { getDomain } from '@/lib/domain-modeling';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getDomain(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('domain-modeling domain error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
