import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function setupHelpdeskTable() {
  try {
    console.log('Creating helpdesk_tickets table...');

    await sql`
      CREATE TABLE IF NOT EXISTS helpdesk_tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(50) UNIQUE NOT NULL,
        raised_by INTEGER REFERENCES users(id),
        raised_by_name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        assigned_to INTEGER REFERENCES users(id),
        assigned_to_name VARCHAR(255),
        accountable_person INTEGER REFERENCES users(id),
        accountable_person_name VARCHAR(255),
        desired_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'raised',
        attachments JSONB,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `;

    console.log('✅ helpdesk_tickets table created successfully');

    // Create index for faster queries
    await sql`CREATE INDEX IF NOT EXISTS idx_helpdesk_status ON helpdesk_tickets(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_helpdesk_raised_by ON helpdesk_tickets(raised_by)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_helpdesk_assigned_to ON helpdesk_tickets(assigned_to)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_helpdesk_created_at ON helpdesk_tickets(created_at)`;

    console.log('✅ Indexes created successfully');

    // Create ticket remarks table for follow-ups
    await sql`
      CREATE TABLE IF NOT EXISTS helpdesk_remarks (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        user_name VARCHAR(255) NOT NULL,
        remark TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ helpdesk_remarks table created successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error setting up helpdesk table:', error);
    process.exit(1);
  }
}

setupHelpdeskTable();
