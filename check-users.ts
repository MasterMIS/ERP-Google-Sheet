import postgres from "postgres";
import bcrypt from "bcryptjs";

async function checkUsers() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Checking users in database...');
    
    // Get all users
    const users = await sql`SELECT id, username, email, password, role_id FROM users`;
    
    console.log(`\nFound ${users.length} users:`);
    users.forEach(user => {
      const isHashed = user.password.startsWith('$2');
      console.log(`- ${user.username} (${user.email}) - Password hashed: ${isHashed}`);
    });
    
    if (users.length === 0) {
      console.log('\nNo users found! Inserting default users...');
      
      // Get admin role
      const roles = await sql`SELECT id FROM roles WHERE role_name = 'Admin'`;
      const adminRoleId = roles[0]?.id;
      
      const managerRoles = await sql`SELECT id FROM roles WHERE role_name = 'Manager'`;
      const managerRoleId = managerRoles[0]?.id;
      
      // Hash passwords
      const hashedPassword1 = await bcrypt.hash('admin123', 10);
      const hashedPassword2 = await bcrypt.hash('user123', 10);
      
      await sql`
        INSERT INTO users (username, email, password, role_id, full_name, phone, address) VALUES 
          ('admin', 'admin@erp.com', ${hashedPassword1}, ${adminRoleId}, 'Admin User', '9876543210', '123 Admin Street'),
          ('john_doe', 'john@erp.com', ${hashedPassword2}, ${managerRoleId}, 'John Doe', '9876543211', '456 Manager Ave')
      `;
      
      console.log('✓ Users inserted successfully!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkUsers();
