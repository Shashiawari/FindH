require('dotenv').config();
const supabase = require('./utils/supabaseClient');

const path = 'listings/123/room_image_0.webp';
const { data } = supabase.storage.from('room-images').getPublicUrl(path);
console.log('Public URL:', data?.publicUrl);
