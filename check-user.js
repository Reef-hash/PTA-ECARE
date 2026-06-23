const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function run() {
  const { data, error } = await supabase.from('users').select('*').eq('ic_number', '020116110329');
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
