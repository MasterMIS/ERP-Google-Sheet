import { sql, executeQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const delegationId = request.nextUrl.searchParams.get('delegationId');

    if (!delegationId) {
      return NextResponse.json(
        { error: 'Delegation ID is required' },
        { status: 400 }
      );
    }

    const history = await executeQuery(async () => {
      return await sql`
        SELECT *
        FROM delegation_revision_history
        WHERE delegation_id = ${parseInt(delegationId)}
        ORDER BY created_at DESC
      `;
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
