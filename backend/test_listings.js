require('dotenv').config();
const supabase = require('./utils/supabaseClient');

async function checkListings() {
    const { data, error } = await supabase.from('listings').select('id, title, property_images').order('created_at', { ascending: false }).limit(5);
    console.log('Listings Data:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
}

checkListings();
