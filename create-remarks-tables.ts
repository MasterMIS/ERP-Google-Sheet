import { neon } from "@neondatabase/serverless";

async function createRemarksAndHistoryTables() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    console.log('Creating remarks and revision history tables...');
    
    // Create delegation_remarks table
    await sql`
      CREATE TABLE IF NOT EXISTS delegation_remarks (
        id SERIAL PRIMARY KEY,
        delegation_id INTEGER NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        remark TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ delegation_remarks table created');
    
    // Create delegation_revision_history table
    await sql`
      CREATE TABLE IF NOT EXISTS delegation_revision_history (
        id SERIAL PRIMARY KEY,
        delegation_id INTEGER NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        old_due_date TIMESTAMP,
        new_due_date TIMESTAMP,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ delegation_revision_history table created');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_remarks_delegation ON delegation_remarks(delegation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_history_delegation ON delegation_revision_history(delegation_id)`;
    
    console.log('\n✓ All tables and indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createRemarksAndHistoryTables();
