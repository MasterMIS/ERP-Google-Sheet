import postgres from "postgres";

async function createDelegationTables() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Creating delegation support tables...');
    
    // Create delegation_remarks table
    await sql`
      CREATE TABLE IF NOT EXISTS delegation_remarks (
        id SERIAL PRIMARY KEY,
        delegation_id INTEGER NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
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
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ delegation_revision_history table created');
    
    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_delegation_remarks_delegation_id ON delegation_remarks(delegation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_delegation_revision_history_delegation_id ON delegation_revision_history(delegation_id)`;
    
    console.log('✓ Indexes created');
    
    console.log('\n✅ All delegation support tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

createDelegationTables();
