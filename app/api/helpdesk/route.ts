import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET - Fetch all helpdesk tickets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    let query;
    
    if (status) {
      query = sql`
        SELECT * FROM helpdesk_tickets 
        WHERE status = ${status}
        ORDER BY created_at DESC
      `;
    } else if (assignedTo) {
      query = sql`
        SELECT * FROM helpdesk_tickets 
        WHERE assigned_to = ${parseInt(assignedTo)}
        ORDER BY created_at DESC
      `;
    } else if (userId) {
      query = sql`
        SELECT * FROM helpdesk_tickets 
        WHERE raised_by = ${parseInt(userId)} OR assigned_to = ${parseInt(userId)}
        ORDER BY created_at DESC
      `;
    } else {
      query = sql`
        SELECT * FROM helpdesk_tickets 
        ORDER BY created_at DESC
      `;
    }

    const tickets = await query;

    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    console.error('Error fetching helpdesk tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch helpdesk tickets' },
      { status: 500 }
    );
  }
}

// POST - Create a new helpdesk ticket
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      raisedBy,
      raisedByName,
      category,
      priority,
      subject,
      description,
      assignedTo,
      assignedToName,
      accountablePerson,
      accountablePersonName,
      desiredDate,
      attachments
    } = body;

    // Validate required fields
    if (!raisedBy || !raisedByName || !category || !priority || !subject || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate ticket number (format: TKT-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${dateStr}-${randomNum}`;

    const result = await sql`
      INSERT INTO helpdesk_tickets (
        ticket_number,
        raised_by,
        raised_by_name,
        category,
        priority,
        subject,
        description,
        assigned_to,
        assigned_to_name,
        accountable_person,
        accountable_person_name,
        desired_date,
        status,
        attachments
      )
      VALUES (
        ${ticketNumber},
        ${raisedBy},
        ${raisedByName},
        ${category},
        ${priority},
        ${subject},
        ${description},
        ${assignedTo || null},
        ${assignedToName || null},
        ${accountablePerson || null},
        ${accountablePersonName || null},
        ${desiredDate || null},
        'raised',
        ${attachments ? JSON.stringify(attachments) : null}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating helpdesk ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create helpdesk ticket' },
      { status: 500 }
    );
  }
}

// PUT - Update a helpdesk ticket
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      assignedTo,
      assignedToName,
      accountablePerson,
      accountablePersonName,
      desiredDate,
      remarks,
      resolvedAt
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(assignedTo);
    }
    if (assignedToName !== undefined) {
      updates.push(`assigned_to_name = $${paramIndex++}`);
      values.push(assignedToName);
    }
    if (accountablePerson !== undefined) {
      updates.push(`accountable_person = $${paramIndex++}`);
      values.push(accountablePerson);
    }
    if (accountablePersonName !== undefined) {
      updates.push(`accountable_person_name = $${paramIndex++}`);
      values.push(accountablePersonName);
    }
    if (desiredDate !== undefined) {
      updates.push(`desired_date = $${paramIndex++}`);
      values.push(desiredDate);
    }
    if (remarks !== undefined) {
      updates.push(`remarks = $${paramIndex++}`);
      values.push(remarks);
    }
    if (resolvedAt !== undefined) {
      updates.push(`resolved_at = $${paramIndex++}`);
      values.push(resolvedAt);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await sql`
      UPDATE helpdesk_tickets
      SET ${sql(updates.join(', '))}
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error('Error updating helpdesk ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update helpdesk ticket' },
      { status: 500 }
    );
  }
}
