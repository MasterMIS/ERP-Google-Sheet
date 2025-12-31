import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    
    const users = await sql`
      SELECT u.id, u.username, u.email, u.password, u.phone, u.role_id, u.image_url, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `;

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, phone, roleId, imageUrl } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO users (username, email, password, role_id, phone, image_url)
      VALUES (${username}, ${email}, ${password}, ${roleId || 3}, ${phone || null}, ${imageUrl || null})
      RETURNING id, username, email, phone, role_id, image_url
    `;

    return NextResponse.json({ user: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, username, email, phone, roleId, imageUrl, password } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let result;
    // Only update password if provided
    if (password) {
      result = await sql`
        UPDATE users SET 
          email = ${email},
          role_id = ${roleId || 3},
          phone = ${phone || null},
          image_url = ${imageUrl || null},
          password = ${password}
        WHERE id = ${parseInt(id)}
        RETURNING id, username, email, phone, role_id, image_url
      `;
    } else {
      result = await sql`
        UPDATE users SET 
          email = ${email},
          role_id = ${roleId || 3},
          phone = ${phone || null},
          image_url = ${imageUrl || null}
        WHERE id = ${parseInt(id)}
        RETURNING id, username, email, phone, role_id, image_url
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: result[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`DELETE FROM users WHERE id = ${parseInt(id)} RETURNING id`;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
