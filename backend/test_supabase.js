require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('users').select('name, email, phone, address1, city, state, country, postal_code').limit(1);
    console.log('Users select result:', { data, error });
}
run();
