const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const password = 'password123';
  const password_hash = await bcrypt.hash(password, 10);
  
  const { error } = await supabase.from('users').update({ password_hash }).eq('ic_number', '020116110329');
  if (error) {
    console.error('Update error:', error);
    return;
  }
  console.log('Password reset to:', password);

  // Now try to login
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'user',
      ic_number: '020116110329',
      password: password
    })
  });
  
  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Response:', json);
}
run();
