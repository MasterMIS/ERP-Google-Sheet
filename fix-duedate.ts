import { neon } from "@neondatabase/serverless";

async function fixDueDateColumn() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    console.log('Fixing due_date column type...');
    
    await sql`ALTER TABLE delegations ALTER COLUMN due_date TYPE TIMESTAMP USING due_date::timestamp`;
    
    console.log('✓ Changed due_date from DATE to TIMESTAMP');
    console.log('✓ Now the due_date column can store both date and time!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDueDateColumn();
