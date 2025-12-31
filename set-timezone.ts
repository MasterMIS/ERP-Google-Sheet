import postgres from "postgres";

async function setTimezone() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Setting database timezone to Asia/Kolkata (Mumbai)...');
    
    // Set timezone for this session
    await sql`SET TIME ZONE 'Asia/Kolkata'`;
    console.log('✓ Timezone set to Asia/Kolkata');
    
    // Get current database time
    const result = await sql`SELECT NOW() as current_time, CURRENT_TIMESTAMP as current_timestamp`;
    console.log('\nCurrent database time:', result[0].current_time);
    console.log('Current timestamp:', result[0].current_timestamp);
    
    // Show timezone info
    const tzResult = await sql`SHOW TIME ZONE`;
    console.log('Current timezone setting:', tzResult[0].TimeZone);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

setTimezone();
