const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('users').select('id, ic_number, password_hash').eq('ic_number', '020116110329');
  console.log('Error:', error);
  console.log('Data:', data);
  if (data && data.length > 0) {
    const hash = data[0].password_hash;
    console.log('Comparing "123456" with hash:', await bcrypt.compare('123456', hash));
    console.log('Comparing "12345678" with hash:', await bcrypt.compare('12345678', hash));
    console.log('Comparing "password" with hash:', await bcrypt.compare('password', hash));
    console.log('Comparing "password123" with hash:', await bcrypt.compare('password123', hash));
  }
}
run();
