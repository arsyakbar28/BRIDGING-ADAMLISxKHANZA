/**
 * Get PK Order Info
 * Retrieve PK order/permintaan details for a specific noorder
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

async function getPKOrderInfo(noorder) {
    let conn;

    try {
        console.log(`🔍 Getting PK order info for noorder: ${noorder}`);
        console.log(`📡 Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);

        conn = await createDirectConnection();

        // 1. Get basic lab request info
        console.log('1️⃣ Lab Request Info (permintaan_lab):');
        console.log('='.repeat(60));
        const [labInfo] = await conn.execute(
            `SELECT noorder, no_rawat, tgl_permintaan, jam_permintaan,
                    tgl_sampel, jam_sampel, tgl_hasil, jam_hasil,
                    dokter_perujuk, status, informasi_tambahan, diagnosa_klinis
             FROM permintaan_lab WHERE noorder = ?`,
            [noorder]
        );

        if (labInfo.length > 0) {
            console.table(labInfo);
        } else {
            console.log('❌ No lab request found');
            return;
        }
        console.log('');

        // 2. Get permintaan detail
        console.log('2️⃣ Requested Examinations (permintaan_detail_permintaan_lab):');
        console.log('='.repeat(60));
        const [detailPermintaan] = await conn.execute(
            `SELECT pdpl.noorder, pdpl.kd_jenis_prw, pdpl.id_template, pdpl.stts_bayar,
                    tl.Pemeriksaan as nama_pemeriksaan, tl.satuan, tl.urut,
                    jpl.nm_perawatan as grup_perawatan
             FROM permintaan_detail_permintaan_lab pdpl
             LEFT JOIN template_laboratorium tl ON pdpl.id_template = tl.id_template
             LEFT JOIN jns_perawatan_lab jpl ON pdpl.kd_jenis_prw = jpl.kd_jenis_prw
             WHERE pdpl.noorder = ?
             ORDER BY tl.urut`,
            [noorder]
        );

        if (detailPermintaan.length > 0) {
            console.table(detailPermintaan);
        } else {
            console.log('❌ No examination details found');
            return;
        }
        console.log('');

        // 3. Get all examinations in the same group(s)
        console.log('3️⃣ All Available Examinations in Requested Group(s):');
        console.log('='.repeat(60));

        const uniqueGroups = [...new Set(detailPermintaan.map(d => d.kd_jenis_prw))];

        for (const group of uniqueGroups) {
            console.log(`\n🔍 Group: ${group}`);
            console.log('-'.repeat(40));

            const [allInGroup] = await conn.execute(
                `SELECT tl.id_template, tl.Pemeriksaan, tl.kd_jenis_prw, tl.satuan, tl.urut,
                        jpl.nm_perawatan,
                        CASE
                            WHEN pdpl.id_template IS NOT NULL THEN '✅ REQUESTED'
                            ELSE '❌ Available'
                        END as status
                 FROM template_laboratorium tl
                 LEFT JOIN jns_perawatan_lab jpl ON tl.kd_jenis_prw = jpl.kd_jenis_prw
                 LEFT JOIN permintaan_detail_permintaan_lab pdpl ON tl.id_template = pdpl.id_template AND pdpl.noorder = ?
                 WHERE tl.kd_jenis_prw = ?
                 ORDER BY tl.urut`,
                [noorder, group]
            );

            console.table(allInGroup);
        }
        console.log('');

        // 4. Patient info
        console.log('4️⃣ Patient Info:');
        console.log('='.repeat(60));
        const [patientInfo] = await conn.execute(
            `SELECT rp.no_rawat, rp.no_rkm_medis, p.nm_pasien, p.jk, p.tgl_lahir,
                    rp.tgl_registrasi, rp.kd_poli, pol.nm_poli,
                    rp.kd_dokter, d.nm_dokter, rp.status_lanjut
             FROM reg_periksa rp
             LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
             LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
             LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
             WHERE rp.no_rawat = ?`,
            [labInfo[0].no_rawat]
        );

        if (patientInfo.length > 0) {
            console.table(patientInfo);
        } else {
            console.log('❌ No patient info found');
        }
        console.log('');

        // 5. JSON format for submission
        console.log('5️⃣ Correct JSON Format for Submission:');
        console.log('='.repeat(60));

        const correctJson = {
            noorder: noorder,
            dokter_pj: labInfo[0].dokter_perujuk || "D0000004",
            petugas: "-",
            dokter_perujuk: labInfo[0].dokter_perujuk || "D0000004",
            tgl_periksa: "2026-05-29", // Current date or desired date
            jam_periksa: "14:00:00", // Desired time
            kesan: null,
            saran: null,
            pemeriksaan: detailPermintaan.map(detail => ({
                nama_pemeriksaan: detail.nama_pemeriksaan,
                kode_pemeriksaan: detail.id_template,
                hasil: "Sample result value", // Replace with actual result
                keterangan: null,
                nilai_rujukan: null
            }))
        };

        console.log(JSON.stringify(correctJson, null, 2));

        // 6. Summary
        console.log('\n6️⃣ Summary:');
        console.log('='.repeat(60));
        console.log(`📋 Noorder: ${noorder}`);
        console.log(`👤 Patient: ${labInfo[0].no_rawat}`);
        console.log(`👨‍⚕️ Doctor: ${labInfo[0].dokter_perujuk}`);
        console.log(`📅 Request Date: ${labInfo[0].tgl_permintaan} ${labInfo[0].jam_permintaan}`);
        console.log(`🧪 Requested Examinations: ${detailPermintaan.length}`);

        detailPermintaan.forEach((exam, index) => {
            console.log(`   ${index + 1}. ${exam.nama_pemeriksaan} (ID: ${exam.id_template})`);
        });

        console.log(`🏥 Groups: ${uniqueGroups.join(', ')}`);
        console.log(`💰 Payment Status: ${detailPermintaan[0].stts_bayar}`);

    } catch (error) {
        console.error('❌ Error getting PK order info:', error.message);
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
        console.log('❌ Usage: node scripts/get-lab-results.js <noorder>');
        console.log('📝 Example: node scripts/get-lab-results.js PK202605290004');
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

    getPKOrderInfo(noorder)
        .then(() => {
            console.log('\n✅ PK order info retrieval completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ PK order info retrieval failed:', error.message);
            process.exit(1);
        });
}

module.exports = { getPKOrderInfo };