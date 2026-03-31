import { NextResponse } from 'next/server';
import { getWorkflow } from '@/lib/techrecon';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await getWorkflow(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Workflow error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}
