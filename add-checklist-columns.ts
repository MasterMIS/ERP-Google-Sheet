import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function addChecklistColumns() {
  try {
    console.log('Adding weekly_days and selected_dates columns to checklists table...');

    // Add weekly_days column (JSONB to store array of day indices)
    await sql`
      ALTER TABLE checklists 
      ADD COLUMN IF NOT EXISTS weekly_days JSONB DEFAULT NULL
    `;
    console.log('✓ Added weekly_days column');

    // Add selected_dates column (JSONB to store array of date strings)
    await sql`
      ALTER TABLE checklists 
      ADD COLUMN IF NOT EXISTS selected_dates JSONB DEFAULT NULL
    `;
    console.log('✓ Added selected_dates column');

    console.log('✅ Successfully added new columns to checklists table!');
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  }
}

addChecklistColumns()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
