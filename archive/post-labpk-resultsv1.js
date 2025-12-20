/**
 * POST Lab Results API
 * Endpoint: POST /api/adam-lis/bridging/:noorder
 */

const { getDbConnection, closeDbConnection } = require('../config/database');

/**
 * Get lab request info by noorder
 * @param {string} noorder - Lab order number
 * @returns {Promise<string|null>} no_rawat or null
 */
async function getLabRequestInfo(noorder) {
    const conn = await getDbConnection();
    
    try {
        const query = "SELECT no_rawat FROM permintaan_lab WHERE noorder = ?";
        const [results] = await conn.execute(query, [noorder]);
        
        return results.length > 0 ? results[0].no_rawat : null;
    } catch (error) {
        console.error('❌ Error getting lab request info:', error);
        return null;
    } finally {
        await closeDbConnection(conn);
    }
}

/**
 * Get template ID by kd_jenis_prw and pemeriksaan
 * @param {string} kd_jenis_prw - Lab procedure code
 * @param {string} pemeriksaan - Lab examination name
 * @returns {Promise<string|null>} template ID or null
 */
async function getTemplateId(kd_jenis_prw, pemeriksaan) {
    const conn = await getDbConnection();
    
    try {
        const query = `
            SELECT id_template FROM template_laboratorium 
            WHERE kd_jenis_prw = ? AND Pemeriksaan = ?
        `;
        const [results] = await conn.execute(query, [kd_jenis_prw, pemeriksaan]);
        
        return results.length > 0 ? results[0].id_template : null;
    } catch (error) {
        console.error('❌ Error getting template ID:', error);
        return null;
    } finally {
        await closeDbConnection(conn);
    }
}


/**
 * Get tarif tindakan from jns_perawatan_lab
 * @param {string} kd_jenis_prw - Lab procedure code
 * @returns {Promise<Object|null>} Tarif data or null
 */
async function getTarifTindakan(kd_jenis_prw) {
    const conn = await getDbConnection();
    
    try {
        const query = `
            SELECT kd_jenis_prw, nm_perawatan, total_byr, bagian_rs, bhp, 
                   tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas, 
                   kso, menejemen, kategori, status
            FROM jns_perawatan_lab WHERE kd_jenis_prw = ?
        `;
        const [results] = await conn.execute(query, [kd_jenis_prw]);
        
        if (results.length > 0) {
            return {
                kd_jenis_prw: results[0].kd_jenis_prw,
                nm_perawatan: results[0].nm_perawatan,
                biaya_tindakan: parseFloat(results[0].total_byr) || 0,
                bagian_rs: parseFloat(results[0].bagian_rs) || 0,
                bhp: parseFloat(results[0].bhp) || 0,
                tarif_perujuk: parseFloat(results[0].tarif_perujuk) || 0,
                tarif_tindakan_dokter: parseFloat(results[0].tarif_tindakan_dokter) || 0,
                tarif_tindakan_petugas: parseFloat(results[0].tarif_tindakan_petugas) || 0,
                kso: parseFloat(results[0].kso) || 0,
                menejemen: parseFloat(results[0].menejemen) || 0,
                kategori: results[0].kategori,
                status: results[0].status
            };
        }
        return null;
    } catch (error) {
        console.error('❌ Error getting tarif tindakan:', error);
        return null;
    } finally {
        await closeDbConnection(conn);
    }
}

/**
 * Bulk get template data for multiple kode_pemeriksaan
 * @param {Object} conn - Database connection
 * @param {Array} kodePemeriksaanArray - Array of kode_pemeriksaan
 * @returns {Promise<Array>} Template data array
 */
async function bulkGetTemplateData(conn, kodePemeriksaanArray) {
    if (!kodePemeriksaanArray || kodePemeriksaanArray.length === 0) return [];
    
    const query = `
        SELECT id_template, kd_jenis_prw, Pemeriksaan as nama_pemeriksaan,
               satuan, nilai_rujukan_ld, nilai_rujukan_la, 
               nilai_rujukan_pd, nilai_rujukan_pa, urut
        FROM template_laboratorium
        WHERE id_template IN (${kodePemeriksaanArray.map(() => '?').join(',')})
        ORDER BY kd_jenis_prw, urut
    `;
    const [results] = await conn.execute(query, kodePemeriksaanArray);
    return results;
}

/**
 * Bulk get tarif data for multiple kode_tindakan
 * @param {Object} conn - Database connection
 * @param {Array} kodeTindakanArray - Array of kode_tindakan
 * @returns {Promise<Object>} Tarif data map
 */
async function bulkGetTarifData(conn, kodeTindakanArray) {
    if (!kodeTindakanArray || kodeTindakanArray.length === 0) return {};
    
    const query = `
        SELECT kd_jenis_prw, nm_perawatan, total_byr, bagian_rs, bhp,
               tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas,
               kso, menejemen, kategori, status
        FROM jns_perawatan_lab
        WHERE kd_jenis_prw IN (${kodeTindakanArray.map(() => '?').join(',')})
    `;
    const [results] = await conn.execute(query, kodeTindakanArray);
    
    const tarifMap = {};
    results.forEach(row => {
        tarifMap[row.kd_jenis_prw] = {
            kd_jenis_prw: row.kd_jenis_prw,
            nm_perawatan: row.nm_perawatan,
            biaya_tindakan: parseFloat(row.total_byr) || 0,
            bagian_rs: parseFloat(row.bagian_rs) || 0,
            bhp: parseFloat(row.bhp) || 0,
            tarif_perujuk: parseFloat(row.tarif_perujuk) || 0,
            tarif_tindakan_dokter: parseFloat(row.tarif_tindakan_dokter) || 0,
            tarif_tindakan_petugas: parseFloat(row.tarif_tindakan_petugas) || 0,
            kso: parseFloat(row.kso) || 0,
            menejemen: parseFloat(row.menejemen) || 0,
            kategori: row.kategori,
            status: row.status
        };
    });
    return tarifMap;
}

/**
 * Select appropriate nilai rujukan based on gender and age
 * @param {Object} template - Template data
 * @param {string} gender - Patient gender (L/P)
 * @param {number} age - Patient age
 * @returns {string} Nilai rujukan
 */
function selectNilaiRujukan(template, gender, age) {
    if (!template) return "-";
    const isAdult = age >= 18;
    if (gender === 'L') {
        return isAdult ? (template.nilai_rujukan_ld || "-") : (template.nilai_rujukan_la || "-");
    } else if (gender === 'P') {
        return isAdult ? (template.nilai_rujukan_pd || "-") : (template.nilai_rujukan_pa || "-");
    }
    return template.nilai_rujukan_ld || "-";
}

/**
 * Calculate age from birth date
 * @param {string|Date} birthDate - Birth date
 * @returns {number|null} Age in years
 */
function calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

/**
 * POST lab results to database
 * @param {string} noorder - Lab order number
 * @param {Object} labData - Complete lab data object
 * @returns {Promise<Object>} API response
 */
async function postLabResults(noorder, labData) {
    const conn = await getDbConnection();
    
    try {
        // Start transaction
        await conn.beginTransaction();
        
        // Get no_rawat from permintaan_lab
        const no_rawat = await getLabRequestInfo(noorder);
        if (!no_rawat) {
            return {
                success: false,
                message: `No lab request found for noorder: ${noorder}`,
                payload: []
            };
        }
        
        
        // Extract data from labData
        const {
            pemeriksaan, // Array of pemeriksaan objects (flat structure)
            dokter_pj,
            petugas,
            dokter_perujuk,
            tgl_periksa,
            jam_periksa,
            kesan,
            saran
        } = labData;
        
        // Validate pemeriksaan
        if (!pemeriksaan || !Array.isArray(pemeriksaan) || pemeriksaan.length === 0) {
            return {
                success: false,
                message: 'Pemeriksaan array is required and cannot be empty',
                payload: []
            };
        }

        // Get patient data untuk smart nilai rujukan
        const patientQuery = `
            SELECT p.jk, p.tgl_lahir
            FROM reg_periksa rp
            JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
            WHERE rp.no_rawat = ?
        `;
        const [patientResults] = await conn.execute(patientQuery, [no_rawat]);

        let patientGender = 'L';
        let patientAge = 30;
        if (patientResults.length > 0) {
            patientGender = patientResults[0].jk || 'L';
            patientAge = calculateAge(patientResults[0].tgl_lahir) || 30;
        }

        // Use provided kode dokter and NIP petugas directly
        const petugasNip = petugas; // Assuming petugas is already NIP
        const dokterCode = dokter_pj; // Assuming dokter_pj is already kode dokter
        
        // Bulk get template data
        const kodePemeriksaanArray = pemeriksaan.map(p => p.kode_pemeriksaan);
        const templateDataArray = await bulkGetTemplateData(conn, kodePemeriksaanArray);

        if (templateDataArray.length === 0) {
            await conn.rollback();
            return {
                success: false,
                message: 'No template data found for provided kode_pemeriksaan',
                payload: []
            };
        }

        // Map template data
        const templateMap = {};
        templateDataArray.forEach(template => {
            templateMap[template.id_template] = template;
        });

        // Validate all exist
        const missingTemplates = [];
        pemeriksaan.forEach(p => {
            if (!templateMap[p.kode_pemeriksaan]) {
                missingTemplates.push(p.kode_pemeriksaan);
            }
        });

        if (missingTemplates.length > 0) {
            await conn.rollback();
            return {
                success: false,
                message: `Template not found for ${missingTemplates.length} kode_pemeriksaan`,
                payload: [{ noorder, missing_templates: missingTemplates }]
            };
        }

        // Auto-generate kode_tindakan and grouping
        const tindakanMap = {};

        pemeriksaan.forEach(p => {
            const template = templateMap[p.kode_pemeriksaan];
            const kode_tindakan = template.kd_jenis_prw;
            
            if (!tindakanMap[kode_tindakan]) {
                tindakanMap[kode_tindakan] = {
                    kode_tindakan: kode_tindakan,
                    pemeriksaan: []
                };
            }
            
            tindakanMap[kode_tindakan].pemeriksaan.push({
                kode_pemeriksaan: p.kode_pemeriksaan,
                nama_pemeriksaan: template.nama_pemeriksaan,
                hasil: p.hasil,
                satuan: template.satuan || "-",
                nilai_rujukan: selectNilaiRujukan(template, patientGender, patientAge),
                keterangan: p.keterangan || ""
            });
        });

        const tindakanArray = Object.values(tindakanMap);

        // Bulk get tarif data
        const kodeTindakanArray = tindakanArray.map(t => t.kode_tindakan);
        const tarifMap = await bulkGetTarifData(conn, kodeTindakanArray);

        const missingTarif = [];
        kodeTindakanArray.forEach(kode => {
            if (!tarifMap[kode]) {
                missingTarif.push(kode);
            }
        });

        if (missingTarif.length > 0) {
            await conn.rollback();
            return {
                success: false,
                message: `Tarif not found for ${missingTarif.length} kode_tindakan`,
                payload: [{ noorder, missing_tarif: missingTarif }]
            };
        }

        // Variables for auto-generated biaya
        let totalBiayaPeriksa = 0;
        
        // Optional: Validate if kode dokter exists (can be disabled for testing)
        const validateDokterQuery = "SELECT kd_dokter FROM dokter WHERE kd_dokter = ?";
        const [dokterResults] = await conn.execute(validateDokterQuery, [dokterCode]);
        
        if (dokterResults.length === 0) {
            console.log(`⚠️ Dokter code not found: ${dokterCode}, but continuing...`);
        }
        
        // Optional: Validate if NIP petugas exists (can be disabled for testing)
        const validatePetugasQuery = "SELECT nip FROM petugas WHERE nip = ?";
        const [petugasResults] = await conn.execute(validatePetugasQuery, [petugasNip]);
        
        if (petugasResults.length === 0) {
            console.log(`⚠️ Petugas NIP not found: ${petugasNip}, but continuing...`);
        }
        
        // Delete old data from detail_periksa_lab
        const deleteDetailQuery = "DELETE FROM detail_periksa_lab WHERE no_rawat = ?";
        await conn.execute(deleteDetailQuery, [no_rawat]);
        
        // Delete old data from periksa_lab
        const deletePeriksaQuery = "DELETE FROM periksa_lab WHERE no_rawat = ?";
        await conn.execute(deletePeriksaQuery, [no_rawat]);
        
        // Insert lab results to detail_periksa_lab
        const insertDetailQuery = `
            INSERT INTO detail_periksa_lab 
            (no_rawat, kd_jenis_prw, tgl_periksa, jam, id_template, nilai, nilai_rujukan, keterangan, 
             bagian_rs, bhp, bagian_perujuk, bagian_dokter, bagian_laborat, kso, menejemen, biaya_item)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Insert periksa_lab query
        const insertPeriksaQuery = `
            INSERT INTO periksa_lab 
            (no_rawat, nip, kd_jenis_prw, tgl_periksa, jam, dokter_perujuk, bagian_rs, bhp, 
             tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas, kso, menejemen, 
             biaya, kd_dokter, status, kategori)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        let insertedDetailCount = 0;
        let insertedPeriksaCount = 0;
        const allResults = [];
        
        // Process each tindakan
        for (const tindakan of tindakanArray) {
            const tarifData = tarifMap[tindakan.kode_tindakan];
            totalBiayaPeriksa += tarifData.biaya_tindakan;
            
            // Insert periksa_lab for this tindakan
            await conn.execute(insertPeriksaQuery, [
                no_rawat,           // no_rawat
                petugasNip,         // nip (from petugas name)
                tindakan.kode_tindakan,      // kd_jenis_prw
                tgl_periksa,        // tgl_periksa
                jam_periksa,        // jam
                dokter_perujuk,     // dokter_perujuk
                tarifData.bagian_rs,                // bagian_rs
                tarifData.bhp,                // bhp
                tarifData.tarif_perujuk,                // tarif_perujuk
                tarifData.tarif_tindakan_dokter,                // tarif_tindakan_dokter
                tarifData.tarif_tindakan_petugas,                // tarif_tindakan_petugas
                tarifData.kso,                // kso
                tarifData.menejemen,                // menejemen
                tarifData.biaya_tindakan, // biaya
                dokterCode,         // kd_dokter
                tarifData.status || 'Ralan',            // status
                tarifData.kategori || 'PK'                // kategori
            ]);
            insertedPeriksaCount++;
            
            // Process pemeriksaan for this tindakan
            for (const item of tindakan.pemeriksaan) {
                const template = templateMap[item.kode_pemeriksaan];
                
                // Insert data
                await conn.execute(insertDetailQuery, [
                    no_rawat,
                    tindakan.kode_tindakan,
                    tgl_periksa,
                    jam_periksa,
                    item.kode_pemeriksaan,
                    item.hasil,
                    item.nilai_rujukan,
                    item.keterangan,
                    tarifData.bagian_rs,  // bagian_rs
                    tarifData.bhp,  // bhp
                    tarifData.tarif_perujuk,  // bagian_perujuk
                    tarifData.tarif_tindakan_dokter,  // bagian_dokter
                    tarifData.tarif_tindakan_petugas,  // bagian_laborat
                    tarifData.kso,  // kso
                    tarifData.menejemen,  // menejemen
                    0.0   // biaya_item
                ]);
                insertedDetailCount++;
            }
            
            // Add to results for response
            allResults.push({
                no_urut: allResults.length + 1,
                kode_jenis_perawatan: tindakan.kode_tindakan,
                nama_perawatan: tarifData.nm_perawatan,
                dokter_pj: dokter_pj,
                petugas: petugas,
                dokter_perujuk: dokter_perujuk,
                tgl_periksa: tgl_periksa,
                jam_periksa: jam_periksa,
                no_rawat: no_rawat,
                biaya_tindakan: tarifData.biaya_tindakan,
                breakdown_biaya: {
                    total: tarifData.biaya_tindakan,
                    bagian_rs: tarifData.bagian_rs,
                    bhp: tarifData.bhp,
                    tarif_perujuk: tarifData.tarif_perujuk,
                    tarif_tindakan_dokter: tarifData.tarif_tindakan_dokter,
                    tarif_tindakan_petugas: tarifData.tarif_tindakan_petugas,
                    kso: tarifData.kso,
                    menejemen: tarifData.menejemen
                },
                detail_pemeriksaan: tindakan.pemeriksaan.map((item, index) => ({
                    kode_pemeriksaan: item.kode_pemeriksaan,
                    nama_pemeriksaan: item.nama_pemeriksaan,
                    hasil: item.hasil,
                    satuan: item.satuan,
                    nilai_rujukan: item.nilai_rujukan,
                    keterangan: item.keterangan,
                    status: getStatusFromKeterangan(item.keterangan)
                }))
            });
        }
        
        // Check if any tarif were missing
        if (missingTarif.length > 0) {
            await conn.rollback();
            return {
                success: false,
                message: `Tarif not found for ${missingTarif.length} tindakan`,
                payload: [{ noorder, missing_tarif: missingTarif }]
            };
        }
        
        
        // Update permintaan_lab with tgl_hasil and jam_hasil
        const updatePermintaanQuery = `
            UPDATE permintaan_lab 
            SET tgl_hasil = ?, jam_hasil = ?
            WHERE noorder = ?
        `;
        await conn.execute(updatePermintaanQuery, [tgl_periksa, jam_periksa, noorder]);
        
        // Insert saran dan kesan if provided
        if (kesan || saran) {
            const insertSaranKesanQuery = `
                INSERT INTO saran_kesan_lab 
                (no_rawat, tgl_periksa, jam, kesan, saran)
                VALUES (?, ?, ?, ?, ?)
            `;
            await conn.execute(insertSaranKesanQuery, [
                no_rawat,
                tgl_periksa,
                jam_periksa,
                kesan || '',
                saran || ''
            ]);
        }
        
        // Commit transaction
        await conn.commit();
        
        // Return response in same format as GET
        const response = {
            success: true,
            message: `Lab results posted successfully for noorder: ${noorder}`,
            summary: {
                noorder, 
                no_rawat, 
                total_tindakan: insertedPeriksaCount,
                total_pemeriksaan: insertedDetailCount,
                tgl_periksa, 
                jam_periksa
            },
            biaya_periksa: {
                total: totalBiayaPeriksa,
                mata_uang: "IDR",
                formatted: `Rp ${totalBiayaPeriksa.toLocaleString('id-ID')}`,
                breakdown: allResults.map(r => ({
                    kode_tindakan: r.kode_jenis_perawatan,
                    nama_tindakan: r.nama_perawatan,
                    biaya: r.biaya_tindakan,
                    detail: r.breakdown_biaya
                }))
            },
            payload: allResults
        };
        
        // Add saran dan kesan
        if (kesan || saran) {
            response.saran_kesan = {
                kesan: kesan || "",
                saran: saran || ""
            };
        }
        
        return response;
        
    } catch (error) {
        // Rollback transaction on error
        await conn.rollback();
        return {
            success: false,
            message: `Database error: ${error.message}`,
            payload: []
        };
    } finally {
        await closeDbConnection(conn);
    }
}

/**
 * Get status from keterangan field
 * @param {string} keterangan - Keterangan field (L, H, T, or empty)
 * @returns {string} Status description
 */
function getStatusFromKeterangan(keterangan) {
    switch (keterangan?.toLowerCase()) {
        case 'l':
            return 'Low (Rendah)';
        case 'h':
            return 'High (Tinggi)';
        case 't':
            return 'Abnormal';
        default:
            return 'Normal';
    }
}

module.exports = {
    postLabResults
};
