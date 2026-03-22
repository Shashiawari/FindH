require('dotenv').config();
const supabase = require('./utils/supabaseClient');

async function checkBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    console.log('Buckets:', data?.map(b => b.name));
    console.log('Error:', error);
}

checkBuckets();
