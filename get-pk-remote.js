require('dotenv').config();
const http = require('http');

const HOST = '192.168.10.202';
const PORT = 5005;
const LIMIT = process.argv[2] || '10';
const NOORDER = process.argv[3] || '';

function httpRequest(options, body = null) {
    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', (err) => resolve({ status: 0, error: err.message }));
        req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, error: 'Timeout' }); });
        if (body) req.write(body);
        req.end();
    });
}

async function login() {
    const body = JSON.stringify({
        username: process.env.AUTH_USERNAME,
        password: process.env.AUTH_PASSWORD
    });
    const res = await httpRequest({
        hostname: HOST, port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, body);

    if (res.body?.success) return res.body.payload.token;
    console.log('Login gagal:', res.body?.message || res.error);
    return null;
}

(async () => {
    console.log(`\n=== GET PK Patient Registration ===`);
    console.log(`Server  : http://${HOST}:${PORT}`);
    console.log(`Endpoint: /adam-lis/bridging/${LIMIT}/${NOORDER || '<noorder>'}`);
    console.log(`Limit   : ${LIMIT}`);
    console.log(`Noorder : ${NOORDER || '(tidak diisi)'}\n`);

    if (!NOORDER) {
        console.log('Usage: node get-pk-remote.js <limit> <noorder>');
        console.log('Contoh: node get-pk-remote.js 10 2026051200001\n');
    }

    const token = await login();
    if (!token) return;
    console.log('Token   : OK\n');

    const noorder = NOORDER || '2026';
    const res = await httpRequest({
        hostname: HOST, port: PORT,
        path: `/adam-lis/bridging/${LIMIT}/${noorder}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.error) {
        console.log('ERROR:', res.error);
        return;
    }

    console.log(`HTTP Status: ${res.status}`);
    console.log('Response:\n');
    console.log(JSON.stringify(res.body, null, 2));
    console.log('\n=== SELESAI ===\n');
})();
