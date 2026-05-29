/**
 * Database Schema Checker
 * Helper script untuk cek column limits di DB Khanza
 * Jalankan: node scripts/check-db-limits.js
 */

const { getDbConnection, closeDbConnection } = require('../config/database');

async function checkDatabaseLimits() {
    const conn = await getDbConnection();

    try {
        console.log('🔍 Checking database column limits for Khanza tables...\n');

        // Query untuk cek schema kolom yang berkaitan dengan lab results
        const tables = [
            { table: 'detail_periksa_lab', columns: ['nilai', 'nilai_rujukan', 'keterangan'] },
            { table: 'saran_kesan_lab', columns: ['kesan', 'saran'] }
        ];

        for (const { table, columns } of tables) {
            console.log(`📋 Table: ${table}`);
            console.log('----------------------------------------');

            for (const column of columns) {
                const query = `
                    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
                `;

                const [result] = await conn.execute(query, [process.env.DB_NAME, table, column]);

                if (result.length > 0) {
                    const col = result[0];
                    const maxLength = col.CHARACTER_MAXIMUM_LENGTH || 'No limit';
                    console.log(`  ${column}: ${col.DATA_TYPE} (max: ${maxLength})`);
                } else {
                    console.log(`  ${column}: Column not found`);
                }
            }
            console.log('');
        }

        // Suggest .env configuration
        console.log('💡 Suggested .env configuration based on your DB schema:');
        console.log('='.repeat(60));
        console.log('# Copy values above to your .env file');
        console.log('# Set 0 to disable validation (let DB handle)');
        console.log('DB_LIMIT_HASIL_PEMERIKSAAN=0    # nilai column in detail_periksa_lab');
        console.log('DB_LIMIT_NILAI_RUJUKAN=0        # nilai_rujukan column');
        console.log('DB_LIMIT_KETERANGAN=0           # keterangan column');
        console.log('DB_LIMIT_KESAN=0                # kesan column in saran_kesan_lab');
        console.log('DB_LIMIT_SARAN=0                # saran column in saran_kesan_lab');
        console.log('');
        console.log('✅ Schema check completed!');

    } catch (error) {
        console.error('❌ Error checking database schema:', error.message);
    } finally {
        await closeDbConnection(conn);
    }
}

// Run if called directly
if (require.main === module) {
    checkDatabaseLimits();
}

module.exports = { checkDatabaseLimits };