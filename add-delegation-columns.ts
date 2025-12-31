import postgres from "postgres";

async function addDelegationColumns() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Adding missing columns to delegations table...');
    
    // Add doer_name column if it doesn't exist
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS doer_name VARCHAR(255)`;
    console.log('✓ doer_name column added');
    
    // Add department column if it doesn't exist
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS department VARCHAR(255)`;
    console.log('✓ department column added');
    
    // Add priority column if it doesn't exist
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium'`;
    console.log('✓ priority column added');
    
    // Change due_date from DATE to TIMESTAMP if needed
    await sql`ALTER TABLE delegations ALTER COLUMN due_date TYPE TIMESTAMP USING due_date::timestamp`;
    console.log('✓ due_date changed to TIMESTAMP');
    
    // Add voice_note_url column if it doesn't exist
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS voice_note_url TEXT`;
    console.log('✓ voice_note_url column added');
    
    // Add reference_docs column if it doesn't exist
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS reference_docs JSONB`;
    console.log('✓ reference_docs column added');
    
    // Add evidence_required column if it doesn't exist
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN DEFAULT false`;
    console.log('✓ evidence_required column added');
    
    console.log('\n✅ All delegation columns updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

addDelegationColumns();
