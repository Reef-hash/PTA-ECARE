const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('users').select('id, ic_number, full_name, email, status, email_verified, auth_provider').eq('ic_number', '020116110329');
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
