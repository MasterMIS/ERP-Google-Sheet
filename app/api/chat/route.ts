import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    
    const messages = await sql`
      SELECT 
        cm.id,
        cm.sender_id,
        u.username as sender_name,
        cm.receiver_id,
        cm.message,
        cm.message_type,
        cm.attachment_url,
        cm.attachment_type,
        cm.duration_ms,
        cm.is_read,
        cm.read_at,
        cm.created_at
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      ORDER BY cm.created_at ASC
      LIMIT 300
    `;

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {

    const { senderId, message, receiverId, messageType, attachmentUrl, attachmentType, durationMs } = await request.json();

    if (!senderId || (!message && !attachmentUrl)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO chat_messages (sender_id, receiver_id, message, message_type, attachment_url, attachment_type, duration_ms)
      VALUES (${senderId}, ${receiverId || null}, ${message || ''}, ${messageType || 'text'}, ${attachmentUrl || null}, ${attachmentType || null}, ${durationMs || null})
      RETURNING id, sender_id, receiver_id, message, message_type, attachment_url, attachment_type, duration_ms, is_read, read_at, created_at
    `;

    return NextResponse.json({ message: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
