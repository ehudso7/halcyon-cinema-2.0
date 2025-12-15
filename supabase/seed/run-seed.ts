/**
 * Seed Runner
 * Runs database seed files for demo data
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function runSeed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Running database seeds...\n');

  // First, create the demo user if it doesn't exist
  console.log('Creating demo user...');
  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const demoUser = existingUser?.users?.find(u => u.email === 'demo@halcyon.cinema');

  if (!demoUser) {
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: 'demo@halcyon.cinema',
      password: 'demo-password-change-in-production',
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo User',
      },
    });

    if (userError) {
      console.error('Failed to create demo user:', userError.message);
      process.exit(1);
    }
    console.log('Demo user created:', newUser.user?.id);
  } else {
    console.log('Demo user already exists:', demoUser.id);
  }

  // Run SQL seed file
  console.log('\nRunning SQL seed...');
  const seedPath = path.join(__dirname, 'demo-data.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf-8');

  // Execute via RPC or direct query
  const { error: seedError } = await supabase.rpc('exec_sql', { sql: seedSql }).single();

  if (seedError) {
    // If RPC doesn't exist, try direct approach
    console.log('Note: For full seed execution, run the SQL directly in Supabase dashboard.');
    console.log('Seed file location:', seedPath);
  } else {
    console.log('Seed data inserted successfully!');
  }

  console.log('\nSeed process complete.');
  console.log('Demo credentials:');
  console.log('  Email: demo@halcyon.cinema');
  console.log('  Password: demo-password-change-in-production');
}

runSeed().catch(console.error);
