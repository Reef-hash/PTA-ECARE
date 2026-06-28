require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function run() {
    const token = jwt.sign({
        id: 'f24300bb-41bb-4573-adfc-04471f0dd3a5',
        role: 'main_technician',
        username: 'technicianasign@gmail.com'
    }, process.env.JWT_SECRET);
    try {
        const res = await axios.get('http://localhost:5000/api/complaints?status=incomplete', {
            headers: { Authorization: 'Bearer ' + token }
        });
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
run();
