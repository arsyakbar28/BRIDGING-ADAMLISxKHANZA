require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectTimeout: 5000
        });
        console.log('✅ DB CONNECTED\n');

        // 1. Cek tabel permintaan_lab ada atau tidak
        console.log('--- [1] Cek tabel permintaan_lab ---');
        const [tables] = await conn.execute(`SHOW TABLES LIKE 'permintaan_lab'`);
        if (tables.length === 0) {
            console.log('❌ Tabel permintaan_lab TIDAK ADA di database!');
        } else {
            console.log('✅ Tabel permintaan_lab ADA');

            // 2. Cek total data
            const [[count]] = await conn.execute(`SELECT COUNT(*) as total FROM permintaan_lab`);
            console.log(`   Total data: ${count.total}`);

            // 3. Lihat 3 data terbaru
            console.log('\n--- [2] 3 Data terbaru di permintaan_lab ---');
            const [rows] = await conn.execute(
                `SELECT noorder, no_rawat, tgl_permintaan, jam_permintaan, status FROM permintaan_lab ORDER BY tgl_permintaan DESC, jam_permintaan DESC LIMIT 3`
            );
            console.log(rows.length > 0 ? rows : 'KOSONG - tidak ada data');
        }

        // 4. Cek tabel periksa_lab dan filter kategori PK
        console.log('\n--- [3] Cek periksa_lab dengan kategori PK ---');
        const [pk] = await conn.execute(
            `SELECT COUNT(*) as total FROM periksa_lab WHERE kategori = 'PK'`
        );
        console.log(`   Total periksa_lab kategori PK: ${pk[0].total}`);

        // 5. Cek kategori yang ada di periksa_lab
        console.log('\n--- [4] Kategori yang ada di periksa_lab ---');
        const [kategoris] = await conn.execute(
            `SELECT DISTINCT kategori, COUNT(*) as total FROM periksa_lab GROUP BY kategori`
        );
        console.log(kategoris.length > 0 ? kategoris : 'KOSONG');

    } catch (err) {
        console.log(`❌ ERROR: ${err.message}`);
    } finally {
        if (conn) await conn.end();
        console.log('\n=== SELESAI ===');
    }
}

main();
