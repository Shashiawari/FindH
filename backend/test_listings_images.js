require('dotenv').config();
const supabase = require('./utils/supabaseClient');

async function checkListings() {
    const { data, error } = await supabase.from('listings').select('id, title, property_images').not('property_images', 'is', null).limit(5);
    console.log('Listings Data with images:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
}

checkListings();
