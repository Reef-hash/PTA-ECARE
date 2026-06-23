const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const ic_number = '123123123123';
  const password = 'password123';
  const password_hash = await bcrypt.hash(password, 10);
  
  const { data: existing } = await supabase.from('users').select('*').eq('ic_number', ic_number);
  if (existing && existing.length > 0) {
    await supabase.from('users').delete().eq('ic_number', ic_number);
  }

  const { data: newUser, error } = await supabase.from('users').insert({
    ic_number,
    full_name: 'Test No Email',
    password_hash,
    status: 'Active',
    contact_no: '0123456789'
  }).select().single();
  
  if (error) {
    console.error('Insert error:', error);
    return;
  }
  console.log('User created:', newUser.id);

  // Now try to login via the API
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'user',
      ic_number: ic_number,
      password: password
    })
  });
  const json = await res.json();
  console.log('Login response:', json);
}
run();
