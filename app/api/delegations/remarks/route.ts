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

    const remarks = await executeQuery(async () => {
      return await sql`
        SELECT r.*, u.username 
        FROM delegation_remarks r
        JOIN users u ON r.user_id = u.id
        WHERE r.delegation_id = ${parseInt(delegationId)}
        ORDER BY r.created_at DESC
      `;
    });

    return NextResponse.json({ remarks });
  } catch (error) {
    console.error('Error fetching remarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remarks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { delegationId, userId, remark } = await request.json();

    if (!delegationId || !userId || !remark) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await executeQuery(async () => {
      return await sql`
        INSERT INTO delegation_remarks (delegation_id, user_id, remark)
        VALUES (${delegationId}, ${userId}, ${remark})
        RETURNING *
      `;
    });

    return NextResponse.json({ remark: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Error adding remark:', error);
    return NextResponse.json(
      { error: 'Failed to add remark' },
      { status: 500 }
    );
  }
}
