/**
 * Find Examination Templates
 * Search for specific examination templates in database
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

async function findExaminationTemplates(searchTerms = []) {
    let conn;

    try {
        console.log(`🔍 Searching for examination templates...`);
        console.log(`📡 Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);

        conn = await createDirectConnection();

        // Default search terms if none provided
        const terms = searchTerms.length > 0 ? searchTerms : [
            'Eritrosit', 'Leukosit', 'Trombosit', 'Kesan', 'Saran',
            'Hemoglobin', 'Hematokrit', 'RBC', 'WBC', 'PLT'
        ];

        for (const term of terms) {
            console.log(`🔍 Searching for: "${term}"`);
            console.log('='.repeat(50));

            const [results] = await conn.execute(
                `SELECT id_template, Pemeriksaan, kd_jenis_prw, satuan, urut
                 FROM template_laboratorium
                 WHERE Pemeriksaan LIKE ? OR Pemeriksaan LIKE ?
                 ORDER BY kd_jenis_prw, urut`,
                [`%${term}%`, `%${term.toLowerCase()}%`]
            );

            if (results.length > 0) {
                console.table(results);
            } else {
                console.log(`❌ No templates found for "${term}"`);
            }
            console.log('');
        }

        // Show hematology related examinations
        console.log(`🩸 All HEMATOLOGI related examinations:`);
        console.log('='.repeat(50));
        const [hematology] = await conn.execute(
            `SELECT tl.id_template, tl.Pemeriksaan, tl.kd_jenis_prw, jpl.nm_perawatan, tl.satuan, tl.urut
             FROM template_laboratorium tl
             LEFT JOIN jns_perawatan_lab jpl ON tl.kd_jenis_prw = jpl.kd_jenis_prw
             WHERE jpl.nm_perawatan LIKE '%HEMATOLOGI%'
             OR tl.Pemeriksaan LIKE '%eritrosit%'
             OR tl.Pemeriksaan LIKE '%leukosit%'
             OR tl.Pemeriksaan LIKE '%trombosit%'
             OR tl.Pemeriksaan LIKE '%hemoglobin%'
             ORDER BY tl.kd_jenis_prw, tl.urut`
        );

        if (hematology.length > 0) {
            console.table(hematology);
        } else {
            console.log('❌ No hematology examinations found');
        }

    } catch (error) {
        console.error('❌ Error searching examination templates:', error.message);
    } finally {
        if (conn) {
            await conn.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// CLI usage
if (require.main === module) {
    const searchTerms = process.argv.slice(2);

    // Validate env variables
    const requiredEnvs = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = requiredEnvs.filter(env => !process.env[env]);

    if (missing.length > 0) {
        console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
        console.error('💡 Check your .env file');
        process.exit(1);
    }

    console.log('📝 Usage: node scripts/find-examination-templates.js [search_term1] [search_term2] ...');
    console.log('📝 Example: node scripts/find-examination-templates.js Eritrosit Leukosit');
    console.log('📝 If no terms provided, will search for common hematology examinations\n');

    findExaminationTemplates(searchTerms)
        .then(() => {
            console.log('\n✅ Search completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Search failed:', error.message);
            process.exit(1);
        });
}

module.exports = { findExaminationTemplates };