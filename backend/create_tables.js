/**
 * Supabase Migration Script
 * 
 * Run this script to create the contact_queries and support_tickets tables.
 * 
 * Usage: node create_tables.js
 * 
 * Make sure your .env file has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function createTables() {
    console.log('Creating tables...\n');

    // Create contact_queries table
    const { error: e1 } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS contact_queries (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (e1) {
        console.log('⚠️  contact_queries table creation via RPC failed:', e1.message);
        console.log('   You may need to create this table manually in Supabase SQL editor:');
        console.log(`
    CREATE TABLE IF NOT EXISTS contact_queries (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
        `);
    } else {
        console.log('✅ contact_queries table created');
    }

    // Create support_tickets table
    const { error: e2 } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS support_tickets (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                category TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (e2) {
        console.log('⚠️  support_tickets table creation via RPC failed:', e2.message);
        console.log('   You may need to create this table manually in Supabase SQL editor:');
        console.log(`
    CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
        `);
    } else {
        console.log('✅ support_tickets table created');
    }

    console.log('\nDone! If any tables failed, copy the SQL above into the Supabase SQL Editor.');
}

createTables().catch(console.error);
