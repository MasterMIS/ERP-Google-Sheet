-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO posts (title, content) VALUES 
  ('Welcome to Neon!', 'This is your first post stored in a Neon PostgreSQL database. Neon provides serverless Postgres with instant provisioning, autoscaling, and branching.'),
  ('Getting Started with Next.js', 'Next.js is a powerful React framework that makes building web applications a breeze. Combined with Neon, you get a fantastic full-stack experience.'),
  ('Serverless Databases', 'Serverless databases like Neon scale automatically based on your usage, so you only pay for what you use. Perfect for modern applications!');

-- Create delegations table with all form fields
CREATE TABLE IF NOT EXISTS delegations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  delegation_name VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to VARCHAR(255) NOT NULL,
  doer_name VARCHAR(255),
  department VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  due_date TIMESTAMP,
  voice_note_url TEXT,
  reference_docs JSONB,
  evidence_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_delegations_user_id ON delegations(user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON delegations(status);
CREATE INDEX IF NOT EXISTS idx_delegations_due_date ON delegations(due_date);

