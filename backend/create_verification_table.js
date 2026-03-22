/**
 * Migration Script — Property Verification + Realtime Assignment Features
 * 
 * Creates/updates:
 * - bookings assignment/status columns
 * - property_verification_requests
 * - verification_request_agent_responses
 * - notifications
 * - admin_activity_log
 * - platform_settings
 * 
 * Usage: node create_verification_table.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const TABLES = [
    {
        name: 'bookings_verification_columns',
        sql: `
            ALTER TABLE bookings
                ALTER COLUMN agent_id DROP NOT NULL;

            ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

            ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

            ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

            CREATE INDEX IF NOT EXISTS idx_bookings_verification_status
                ON bookings(verification_status);

            CREATE INDEX IF NOT EXISTS idx_bookings_assigned_agent_id
                ON bookings(assigned_agent_id);
        `
    },
    {
        name: 'property_verification_requests',
        sql: `
            CREATE TABLE IF NOT EXISTS property_verification_requests (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                property_id UUID REFERENCES listings(id) ON DELETE CASCADE,
                property_name TEXT NOT NULL,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                user_name TEXT,
                user_email TEXT NOT NULL,
                user_phone TEXT,
                payment_status TEXT DEFAULT 'paid',
                verification_status TEXT DEFAULT 'pending',
                booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
                assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
                accepted_at TIMESTAMPTZ,
                request_date TIMESTAMPTZ DEFAULT NOW(),
                reviewed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            ALTER TABLE property_verification_requests
                ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

            ALTER TABLE property_verification_requests
                ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

            ALTER TABLE property_verification_requests
                ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
        `
    },
    {
        name: 'verification_request_agent_responses',
        sql: `
            CREATE TABLE IF NOT EXISTS verification_request_agent_responses (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
                listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                response_status TEXT DEFAULT 'pending'
                    CHECK (response_status IN ('pending', 'accepted', 'rejected', 'blocked')),
                responded_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE (booking_id, agent_id)
            );

            CREATE INDEX IF NOT EXISTS idx_verif_responses_booking_id
                ON verification_request_agent_responses(booking_id);

            CREATE INDEX IF NOT EXISTS idx_verif_responses_agent_id
                ON verification_request_agent_responses(agent_id);
        `
    },
    {
        name: 'notifications',
        sql: `
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
                listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
                ON notifications(user_id, created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
                ON notifications(user_id, is_read);
        `
    },
    {
        name: 'admin_activity_log',
        sql: `
            CREATE TABLE IF NOT EXISTS admin_activity_log (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                admin_id UUID,
                admin_name TEXT DEFAULT 'Admin',
                action TEXT NOT NULL,
                target_type TEXT,
                target_id TEXT,
                details TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    },
    {
        name: 'platform_settings',
        sql: `
            CREATE TABLE IF NOT EXISTS platform_settings (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value TEXT DEFAULT '',
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            INSERT INTO platform_settings (key, value)
            VALUES 
                ('platform_enabled', 'true'),
                ('registrations_enabled', 'true'),
                ('listings_enabled', 'true'),
                ('announcement', '')
            ON CONFLICT (key) DO NOTHING;
        `
    }
];

async function createTables() {
    console.log('Creating tables...\n');
    let pgClient = null;

    for (const table of TABLES) {
        const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
        let fallbackError = null;

        if (error && error.message.includes('Could not find the function public.exec_sql(sql)')) {
            if (!process.env.DATABASE_URL) {
                fallbackError = new Error('DATABASE_URL not configured for fallback execution');
            } else {
                try {
                    if (!pgClient) {
                        pgClient = new Client({ connectionString: process.env.DATABASE_URL });
                        await pgClient.connect();
                    }
                    await pgClient.query(table.sql);
                    console.log(`✅ ${table.name} created (fallback via pg)`);
                    continue;
                } catch (pgErr) {
                    fallbackError = pgErr;
                }
            }
        }

        if (error || fallbackError) {
            const reason = fallbackError ? `${error.message}. Fallback failed: ${fallbackError.message}` : error.message;
            console.log(`⚠️  ${table.name} creation via RPC failed: ${reason}`);
            console.log(`   Create manually in Supabase SQL Editor:\n${table.sql}\n`);
        } else {
            console.log(`✅ ${table.name} created`);
        }
    }

    if (pgClient) {
        await pgClient.end();
    }

    console.log('\nDone! If any tables failed, copy the SQL into Supabase SQL Editor.');
}

createTables().catch(console.error);
