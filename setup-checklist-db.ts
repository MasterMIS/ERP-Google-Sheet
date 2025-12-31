import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const sql = postgres(process.env.DATABASE_URL!);

async function setupChecklistTables() {
  try {
    console.log('🔄 Setting up checklist tables...');

    // Create checklists table
    await sql`
      CREATE TABLE IF NOT EXISTS checklists (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        assignee VARCHAR(255) NOT NULL,
        doer_name VARCHAR(255),
        priority VARCHAR(50) DEFAULT 'medium',
        department VARCHAR(255),
        verification_required BOOLEAN DEFAULT false,
        verifier_name VARCHAR(255),
        attachment_required BOOLEAN DEFAULT false,
        frequency VARCHAR(50) NOT NULL,
        from_date DATE NOT NULL,
        due_date DATE NOT NULL,
        weekly_days JSONB,
        selected_dates JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ Checklists table created successfully');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_checklists_assignee ON checklists(assignee)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_checklists_status ON checklists(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_checklists_due_date ON checklists(due_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_checklists_frequency ON checklists(frequency)`;

    console.log('✅ Indexes created successfully');
    console.log('🎉 Checklist database setup completed!');

  } catch (error) {
    console.error('❌ Error setting up checklist tables:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

setupChecklistTables()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
