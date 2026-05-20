require('dotenv').config();
const http = require('http');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
const USERNAME = process.env.AUTH_USERNAME;
const PASSWORD = process.env.AUTH_PASSWORD;

// ─── DB CONNECTION CHECK ───────────────────────────────────────────────
async function checkDB() {
    console.log('\n=== CEK KONEKSI DATABASE ===');
    console.log(`Host    : ${process.env.DB_HOST}`);
    console.log(`Port    : ${process.env.DB_PORT}`);
    console.log(`DB Name : ${process.env.DB_NAME}`);
    console.log(`User    : ${process.env.DB_USER}`);

    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectTimeout: 5000
        });
        await conn.ping();
        console.log('STATUS  : CONNECTED OK');
        await conn.end();
    } catch (err) {
        console.log(`STATUS  : FAILED - ${err.message}`);
    }
}

// ─── GET TOKEN ────────────────────────────────────────────────────────
function getToken() {
    return new Promise((resolve) => {
        console.log('\n=== GET TOKEN ===');
        console.log(`URL      : http://${HOST}:${PORT}/api/auth/login`);
        console.log(`Username : ${USERNAME}`);
        console.log(`Password : ${PASSWORD}`);

        const body = JSON.stringify({ username: USERNAME, password: PASSWORD });
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
                    if (json.success) {
                        console.log('STATUS   : SUCCESS');
                        console.log(`TOKEN    : ${json.payload.token}`);
                        console.log(`EXPIRES  : ${json.payload.expiresIn}`);
                    } else {
                        console.log(`STATUS   : FAILED - ${json.message}`);
                    }
                } catch (e) {
                    console.log(`STATUS   : FAILED - Response tidak valid: ${data}`);
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`STATUS   : FAILED - ${err.message}`);
            console.log('HINT     : Pastikan server sudah jalan (pm2 status)');
            resolve();
        });

        req.setTimeout(5000, () => {
            console.log('STATUS   : FAILED - Timeout (server tidak merespons)');
            req.destroy();
            resolve();
        });

        req.write(body);
        req.end();
    });
}

// ─── MAIN ─────────────────────────────────────────────────────────────
(async () => {
    await checkDB();
    await getToken();
    console.log('\n=== SELESAI ===\n');
})();
