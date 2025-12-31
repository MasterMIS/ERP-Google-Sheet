import postgres from "postgres";

async function resetPasswords() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Resetting passwords to plain text...');
    
    // Update admin password to plain text
    await sql`
      UPDATE users 
      SET password = 'admin123' 
      WHERE username = 'admin'
    `;
    
    // Update john_doe password to plain text
    await sql`
      UPDATE users 
      SET password = 'user123' 
      WHERE username = 'john_doe'
    `;
    
    console.log('✓ Passwords reset successfully!');
    
    // Verify the update
    const users = await sql`SELECT username, password FROM users`;
    console.log('\nCurrent users and passwords:');
    users.forEach(user => {
      console.log(`- ${user.username}: ${user.password}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

resetPasswords();
