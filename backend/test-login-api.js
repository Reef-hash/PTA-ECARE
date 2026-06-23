const fetch = require('node-fetch');

async function testLogin() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        ic_number: '901234567890', // from the screenshot
        password: 'password123' // assuming this or we can test an arbitrary IC
      })
    });
    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', json);
  } catch (err) {
    console.error(err);
  }
}
testLogin();
