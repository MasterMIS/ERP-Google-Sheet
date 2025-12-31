import postgres from "postgres";

async function fixDelegationHistoryTable() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Fixing delegation_revision_history table columns...');
    
    // Drop the old table and recreate with correct columns
    await sql`DROP TABLE IF EXISTS delegation_revision_history CASCADE`;
    console.log('✓ Old table dropped');
    
    // Create delegation_revision_history table with correct schema
    await sql`
      CREATE TABLE delegation_revision_history (
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
    console.log('✓ delegation_revision_history table recreated with correct columns');
    
    // Create index
    await sql`CREATE INDEX idx_delegation_revision_history_delegation_id ON delegation_revision_history(delegation_id)`;
    console.log('✓ Index created');
    
    console.log('\n✅ delegation_revision_history table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

fixDelegationHistoryTable();
