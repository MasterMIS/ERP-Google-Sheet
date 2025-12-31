import { neon } from "@neondatabase/serverless";

async function migrateDelegationsTable() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    console.log('Migrating delegations table...');
    
    // Add missing columns if they don't exist
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS doer_name VARCHAR(255)`;
    console.log('✓ Added doer_name column');
    
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS department VARCHAR(255)`;
    console.log('✓ Added department column');
    
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium'`;
    console.log('✓ Added priority column');
    
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS voice_note_url TEXT`;
    console.log('✓ Added voice_note_url column');
    
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS reference_docs JSONB`;
    console.log('✓ Added reference_docs column');
    
    await sql`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN DEFAULT false`;
    console.log('✓ Added evidence_required column');
    
    // Verify the columns
    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'delegations'
      ORDER BY ordinal_position
    `;
    
    console.log('\n✓ Migration complete! Current delegations table structure:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.column_default ? ' (default: ' + col.column_default + ')' : ''}`);
    });
    
  } catch (error) {
    console.error('Error migrating table:', error);
    process.exit(1);
  }
}

migrateDelegationsTable();
