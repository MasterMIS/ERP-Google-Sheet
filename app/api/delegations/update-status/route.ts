import { sql, executeQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { delegationId, status, revisedDueDate, remark, userId } = await request.json();

    if (!delegationId || !status || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await executeQuery(async () => {
      // Get current delegation data
      const currentDelegation = await sql`
        SELECT status, due_date FROM delegations WHERE id = ${delegationId}
      `;

      if (currentDelegation.length === 0) {
        throw new Error('Delegation not found');
      }

      const oldStatus = currentDelegation[0].status;
      const oldDueDate = currentDelegation[0].due_date;
      const newDueDate = revisedDueDate || oldDueDate;

      // Update delegation
      await sql`
        UPDATE delegations
        SET status = ${status},
            due_date = ${newDueDate},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${delegationId}
      `;

      // Create revision history record
      await sql`
        INSERT INTO delegation_revision_history (
          delegation_id,
          old_status,
          new_status,
          old_due_date,
          new_due_date,
          reason
        ) VALUES (
        ${delegationId},
        ${oldStatus},
        ${status},
        ${oldDueDate},
        ${newDueDate},
        ${remark || null}
      )
    `;

      // Add remark if provided
      if (remark) {
        await sql`
          INSERT INTO delegation_remarks (delegation_id, user_id, remark)
          VALUES (${delegationId}, ${userId}, ${remark})
        `;
      }

      return true;
    });

    return NextResponse.json({ message: 'Status updated successfully' });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: `Failed to update status: ${error.message}` },
      { status: 500 }
    );
  }
}
