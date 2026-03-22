require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const query = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address1 TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
    `;

        await client.query(query);
        console.log('Successfully added columns to users table if they were missing.');
    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

run();
