require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 5005;
const HOST = 'localhost';
const BASE_URL = `/adam-lis/bridging`;

// ─── CONFIG ───────────────────────────────────────────────────────────
const LIMIT = process.argv[2] || '10';
const NOORDER = process.argv[3] || '';

// ─── HELPER ───────────────────────────────────────────────────────────
function request(path, token) {
    return new Promise((resolve) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve({ raw: data });
                }
            });
        });

        req.on('error', (err) => resolve({ error: err.message }));
        req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'Timeout' }); });
        req.end();
    });
}

// ─── LOGIN ────────────────────────────────────────────────────────────
function login() {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            username: process.env.AUTH_USERNAME,
            password: process.env.AUTH_PASSWORD
        });
        const options = {
            hostname: HOST,
            port: PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.success) resolve(json.payload.token);
                    else { console.log('Login gagal:', json.message); resolve(null); }
                } catch { resolve(null); }
            });
        });

        req.on('error', (err) => { console.log('Server tidak bisa diakses:', err.message); resolve(null); });
        req.write(body);
        req.end();
    });
}

// ─── MAIN ─────────────────────────────────────────────────────────────
(async () => {
    console.log(`\n=== GET PK (Patologi Klinis) ===`);
    console.log(`Server : http://${HOST}:${PORT}`);
    console.log(`Limit  : ${LIMIT}`);
    console.log(`Noorder: ${NOORDER || '(semua)'}\n`);

    const token = await login();
    if (!token) return;
    console.log('Token  : OK\n');

    // 1. Patient Registration
    console.log('--- [1] Patient Registration ---');
    const noorderParam = NOORDER ? encodeURIComponent(NOORDER) : '%25';
    const patient = await request(`${BASE_URL}/${LIMIT}/${noorderParam}`, token);
    console.log(JSON.stringify(patient, null, 2));

    // 2. Lab Results PK
    console.log('\n--- [2] Lab Results PK ---');
    const labResults = await request(`${BASE_URL}/lab-results-pk/${LIMIT}/${noorderParam}`, token);
    console.log(JSON.stringify(labResults, null, 2));

    console.log('\n=== SELESAI ===\n');
})();
