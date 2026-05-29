/**
 * Debug Lab Structure
 * Analyze database structure for lab examinations
 * Direct connection using .env variables
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDirectConnection() {
    return await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
}

async function debugLabStructure(noorder) {
    let conn;

    try {
        console.log(`🔍 Debugging lab structure for noorder: ${noorder}`);
        console.log(`📡 Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);

        conn = await createDirectConnection();

        // 1. Check permintaan_lab
        console.log('1️⃣ Permintaan Lab:');
        console.log('='.repeat(50));
        const [permintaan] = await conn.execute(
            "SELECT * FROM permintaan_lab WHERE noorder = ?",
            [noorder]
        );

        if (permintaan.length > 0) {
            console.table(permintaan);
        } else {
            console.log('❌ No data found in permintaan_lab');
        }
        console.log('');

        // 2. Check permintaan_detail_permintaan_lab
        console.log('2️⃣ Detail Permintaan Lab:');
        console.log('='.repeat(50));
        const [detail] = await conn.execute(
            "SELECT * FROM permintaan_detail_permintaan_lab WHERE noorder = ?",
            [noorder]
        );

        if (detail.length > 0) {
            console.table(detail);
        } else {
            console.log('❌ No data found in permintaan_detail_permintaan_lab');
        }
        console.log('');

        // 3. Check template_laboratorium for requested templates
        if (detail.length > 0) {
            console.log('3️⃣ Template Laboratorium (Requested):');
            console.log('='.repeat(50));
            const templateIds = detail.map(d => d.id_template);
            const [templates] = await conn.execute(
                `SELECT * FROM template_laboratorium WHERE id_template IN (${templateIds.map(() => '?').join(',')}) ORDER BY urut`,
                templateIds
            );

            if (templates.length > 0) {
                console.table(templates);

                // 4. Check related templates in same kd_jenis_prw
                const kdJenisPrwList = [...new Set(templates.map(t => t.kd_jenis_prw))];
                for (const kdJenisPrw of kdJenisPrwList) {
                    console.log(`\n4️⃣ All Templates in Group (kd_jenis_prw: ${kdJenisPrw}):`);
                    console.log('='.repeat(50));
                    const [groupTemplates] = await conn.execute(
                        "SELECT id_template, Pemeriksaan, kd_jenis_prw, satuan, urut FROM template_laboratorium WHERE kd_jenis_prw = ? ORDER BY urut",
                        [kdJenisPrw]
                    );
                    console.table(groupTemplates);

                    // 5. Check jns_perawatan_lab for this group
                    console.log(`\n5️⃣ Jenis Perawatan Lab (${kdJenisPrw}):`);
                    console.log('='.repeat(50));
                    const [jenis] = await conn.execute(
                        "SELECT kd_jenis_prw, nm_perawatan, total_byr, kategori, status FROM jns_perawatan_lab WHERE kd_jenis_prw = ?",
                        [kdJenisPrw]
                    );

                    if (jenis.length > 0) {
                        console.table(jenis);
                    } else {
                        console.log(`❌ No jns_perawatan_lab found for ${kdJenisPrw}`);
                    }
                }
            } else {
                console.log('❌ No templates found for requested IDs');
            }
        }

        // 6. Summary analysis
        console.log('\n📊 ANALYSIS SUMMARY:');
        console.log('='.repeat(50));
        if (detail.length > 0 && permintaan.length > 0) {
            console.log(`✅ Lab request found: ${permintaan[0].noorder}`);
            console.log(`✅ Patient: ${permintaan[0].no_rawat}`);
            console.log(`✅ Requested examinations: ${detail.length}`);
            detail.forEach((d, index) => {
                console.log(`   ${index + 1}. Template ID: ${d.id_template}, Group: ${d.kd_jenis_prw}`);
            });
        } else {
            console.log(`❌ No lab request found for noorder: ${noorder}`);
        }

    } catch (error) {
        console.error('❌ Error debugging lab structure:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (conn) {
            await conn.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// CLI usage
if (require.main === module) {
    const noorder = process.argv[2];

    if (!noorder) {
        console.log('❌ Usage: node scripts/debug-lab-structure.js <noorder>');
        console.log('📝 Example: node scripts/debug-lab-structure.js PK202605290004');
        process.exit(1);
    }

    // Validate env variables
    const requiredEnvs = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = requiredEnvs.filter(env => !process.env[env]);

    if (missing.length > 0) {
        console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
        console.error('💡 Check your .env file');
        process.exit(1);
    }

    debugLabStructure(noorder)
        .then(() => {
            console.log('\n✅ Debug completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Debug failed:', error.message);
            process.exit(1);
        });
}

module.exports = { debugLabStructure };