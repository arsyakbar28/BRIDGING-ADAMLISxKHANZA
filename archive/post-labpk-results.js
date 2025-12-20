/**
 * POST Lab Results API - REQUIRED nilai_rujukan Version
 * Endpoint: POST /api/adam-lis/bridging/:noorder
 * 
 * CHANGES:
 * - nilai_rujukan is now REQUIRED in pemeriksaan input
 * - NO auto-generation - must be provided by client
 * - Validation added to ensure nilai_rujukan is present
 * 
 * OPTIMIZATIONS:
 * - Uses connection pooling (no new connection per request)
 * - Reuses single connection throughout transaction
 * - Prevents duplicate connection overhead
 * 
 * VALIDATIONS (Fail-fast before database):
 * - Required fields: noorder, dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa
 * - Date format: YYYY-MM-DD
 * - Time format: HH:MM:SS
 * - Pemeriksaan array must not be empty
 * - Each pemeriksaan must have: kode_pemeriksaan, hasil, nilai_rujukan
 * - Kode dokter, petugas, and dokter_perujuk validated against database
 * 
 * ERROR HANDLING:
 * - User-friendly error messages (no database technical details)
 * - Specific error messages for invalid codes (dokter, petugas, pemeriksaan)
 * - Technical errors logged server-side for debugging
 */

const { getDbConnection, closeDbConnection } = require('../config/database');

/**
 * Get lab request info by noorder
 * @param {Object} conn - Database connection (reuse existing connection)
 * @param {string} noorder - Lab order number
 * @returns {Promise<string|null>} no_rawat or null
 */
async function getLabRequestInfo(conn, noorder) {
    try {
        const query = "SELECT no_rawat FROM permintaan_lab WHERE noorder = ?";
        const [results] = await conn.execute(query, [noorder]);
        
        return results.length > 0 ? results[0].no_rawat : null;
    } catch (error) {
        console.error('❌ Error getting lab request info:', error);
        return null;
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
               satuan, urut
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
 * Validate that nilai_rujukan is provided
 * @param {string|null} nilaiRujukan - Nilai rujukan value
 * @returns {boolean} True if valid
 */
function validateNilaiRujukan(nilaiRujukan) {
    // nilai_rujukan must be provided and not empty
    if (nilaiRujukan === null || nilaiRujukan === undefined) {
        return false;
    }
    
    const trimmed = nilaiRujukan.toString().trim();
    if (trimmed === '') {
        return false;
    }
    
    return true;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {Object} {valid: boolean, message: string}
 */
function validateDateFormat(dateString) {
    if (!dateString) {
        return { valid: false, message: 'Date is required' };
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        return { valid: false, message: 'Date must be in format YYYY-MM-DD' };
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return { valid: false, message: 'Invalid date value' };
    }
    
    return { valid: true, message: '' };
}

/**
 * Validate time format (HH:MM:SS)
 * @param {string} timeString - Time string to validate
 * @returns {Object} {valid: boolean, message: string}
 */
function validateTimeFormat(timeString) {
    if (!timeString) {
        return { valid: false, message: 'Time is required' };
    }
    
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(timeString)) {
        return { valid: false, message: 'Time must be in format HH:MM:SS (e.g., 15:30:00)' };
    }
    
    return { valid: true, message: '' };
}

/**
 * Validate keterangan value
 * @param {string} keterangan - Keterangan value (L, H, T, N, or empty)
 * @returns {Object} {valid: boolean, message: string}
 */
function validateKeterangan(keterangan) {
    if (!keterangan || keterangan.trim() === '') {
        return { valid: true, message: '' }; // Empty is valid
    }
    
    const validValues = ['L', 'H', 'T', 'N', 'l', 'h', 't', 'n'];
    if (!validValues.includes(keterangan)) {
        return { valid: false, message: 'Keterangan must be L (Low), H (High), T (Abnormal), N (Normal), or empty' };
    }
    
    return { valid: true, message: '' };
}

/**
 * Comprehensive validation of lab data BEFORE database operations
 * @param {Object} labData - Lab data to validate
 * @returns {Object} {valid: boolean, errors: Array}
 */
function validateLabData(labData) {
    const errors = [];
    
    // 1. Validate required root fields
    if (!labData.noorder || labData.noorder.trim() === '') {
        errors.push({ field: 'noorder', message: 'noorder is required and cannot be empty' });
    }
    
    if (!labData.dokter_pj || labData.dokter_pj.trim() === '') {
        errors.push({ field: 'dokter_pj', message: 'dokter_pj is required and cannot be empty' });
    }
    
    if (!labData.petugas || labData.petugas.trim() === '') {
        errors.push({ field: 'petugas', message: 'petugas is required and cannot be empty' });
    }
    
    if (!labData.dokter_perujuk || labData.dokter_perujuk.trim() === '') {
        errors.push({ field: 'dokter_perujuk', message: 'dokter_perujuk is required and cannot be empty' });
    }
    
    // 2. Validate date format
    const dateValidation = validateDateFormat(labData.tgl_periksa);
    if (!dateValidation.valid) {
        errors.push({ field: 'tgl_periksa', message: dateValidation.message });
    }
    
    // 3. Validate time format
    const timeValidation = validateTimeFormat(labData.jam_periksa);
    if (!timeValidation.valid) {
        errors.push({ field: 'jam_periksa', message: timeValidation.message });
    }
    
    // 4. Validate pemeriksaan array
    if (!labData.pemeriksaan || !Array.isArray(labData.pemeriksaan)) {
        errors.push({ field: 'pemeriksaan', message: 'pemeriksaan must be an array' });
        return { valid: false, errors }; // Stop here if pemeriksaan is not array
    }
    
    if (labData.pemeriksaan.length === 0) {
        errors.push({ field: 'pemeriksaan', message: 'pemeriksaan array cannot be empty' });
        return { valid: false, errors };
    }
    
    // 5. Validate each pemeriksaan item
    labData.pemeriksaan.forEach((item, index) => {
        const prefix = `pemeriksaan[${index}]`;
        
        // Validate kode_pemeriksaan
        if (!item.kode_pemeriksaan || item.kode_pemeriksaan.toString().trim() === '') {
            errors.push({ 
                field: `${prefix}.kode_pemeriksaan`, 
                message: 'kode_pemeriksaan is required and cannot be empty',
                index: index
            });
        }
        
        // Validate hasil
        if (item.hasil === null || item.hasil === undefined || item.hasil.toString().trim() === '') {
            errors.push({ 
                field: `${prefix}.hasil`, 
                message: 'hasil is required and cannot be empty',
                index: index
            });
        }
        
        // Validate nilai_rujukan
        if (!validateNilaiRujukan(item.nilai_rujukan)) {
            errors.push({ 
                field: `${prefix}.nilai_rujukan`, 
                message: 'nilai_rujukan is required and cannot be empty',
                index: index,
                kode_pemeriksaan: item.kode_pemeriksaan
            });
        }
        
        // Validate keterangan (optional but must be valid if provided)
        // if (item.keterangan !== undefined && item.keterangan !== null) {
        //     const keteranganValidation = validateKeterangan(item.keterangan);
        //     if (!keteranganValidation.valid) {
        //         errors.push({ 
        //             field: `${prefix}.keterangan`, 
        //             message: keteranganValidation.message,
        //             index: index,
        //             value: item.keterangan
        //         });
        //     }
        // }
    });
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * POST lab results to database
 * @param {string} noorder - Lab order number
 * @param {Object} labData - Complete lab data object
 * @returns {Promise<Object>} API response
 */
async function postLabResults(noorder, labData) {
    // ✅ VALIDATE INPUT BEFORE DATABASE CONNECTION
    // Perform all validations before opening connection (fail-fast)
    const validation = validateLabData(labData);
    if (!validation.valid) {
        return {
            success: false,
            message: `Validation failed: Found ${validation.errors.length} error(s)`,
            errors: validation.errors,
            payload: []
        };
    }
    
    // Now safe to open database connection
    const conn = await getDbConnection();
    
    try {
        // Start transaction
        await conn.beginTransaction();
        
        // Get no_rawat from permintaan_lab (reuse connection)
        const no_rawat = await getLabRequestInfo(conn, noorder);
        if (!no_rawat) {
            await conn.rollback();
            return {
                success: false,
                message: `No lab request found for noorder: ${noorder}`,
                payload: []
            };
        }
        
        // Extract data from labData (already validated)
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
            
            // ✅ USE nilai_rujukan from input directly (already validated)
            tindakanMap[kode_tindakan].pemeriksaan.push({
                kode_pemeriksaan: p.kode_pemeriksaan,
                nama_pemeriksaan: template.nama_pemeriksaan,
                hasil: p.hasil,
                satuan: template.satuan || "-",
                nilai_rujukan: p.nilai_rujukan.toString().trim(),  // ✅ From input parameter
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
        
        // ✅ VALIDATE: Check if kode dokter exists (fail-fast)
        const validateDokterQuery = "SELECT kd_dokter FROM dokter WHERE kd_dokter = ?";
        const [dokterResults] = await conn.execute(validateDokterQuery, [dokterCode]);
        
        if (dokterResults.length === 0) {
            await conn.rollback();
            return {
                success: false,
                message: `Kode dokter tidak valid: "${dokterCode}". Pastikan kode dokter terdaftar di sistem.`,
                payload: []
            };
        }
        
        // ✅ VALIDATE: Check if NIP petugas exists (fail-fast)
        const validatePetugasQuery = "SELECT nip FROM petugas WHERE nip = ?";
        const [petugasResults] = await conn.execute(validatePetugasQuery, [petugasNip]);
        
        if (petugasResults.length === 0) {
            await conn.rollback();
            return {
                success: false,
                message: `Kode petugas tidak valid: "${petugasNip}". Pastikan kode petugas terdaftar di sistem.`,
                payload: []
            };
        }
        
        // ✅ VALIDATE: Check if dokter_perujuk exists (fail-fast)
        const [dokterPerujukResults] = await conn.execute(validateDokterQuery, [dokter_perujuk]);
        
        if (dokterPerujukResults.length === 0) {
            await conn.rollback();
            return {
                success: false,
                message: `Kode dokter perujuk tidak valid: "${dokter_perujuk}". Pastikan kode dokter terdaftar di sistem.`,
                payload: []
            };
        }
        
        // Delete old data (order matters: detail -> periksa -> saran_kesan)
        // 1. Delete detail_periksa_lab first (child table)
        const deleteDetailQuery = "DELETE FROM detail_periksa_lab WHERE no_rawat = ?";
        await conn.execute(deleteDetailQuery, [no_rawat]);
        
        // 2. Delete periksa_lab
        const deletePeriksaQuery = "DELETE FROM periksa_lab WHERE no_rawat = ?";
        await conn.execute(deletePeriksaQuery, [no_rawat]);
        
        // 3. Delete saran_kesan_lab (prevent duplicate on re-insert)
        const deleteSaranKesanQuery = "DELETE FROM saran_kesan_lab WHERE no_rawat = ?";
        await conn.execute(deleteSaranKesanQuery, [no_rawat]);
        
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
                    item.nilai_rujukan,  // ✅ From input parameter
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
                    nilai_rujukan: item.nilai_rujukan,  // ✅ From input
                    keterangan: item.keterangan,
                    status: getStatusFromKeterangan(item.keterangan)
                }))
            });
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
        
        // Parse error to user-friendly message
        const userMessage = parseDatabaseError(error, {
            petugas: labData.petugas,
            dokter_pj: labData.dokter_pj,
            dokter_perujuk: labData.dokter_perujuk
        });
        
        // Log technical error for debugging (server-side only)
        console.error('❌ Database Error Details:', error.message);
        
        return {
            success: false,
            message: userMessage,
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
        case 'n':
            return 'Normal';
        default:
            return 'Normal';
    }
}

/**
 * Parse database error to user-friendly message
 * @param {Error} error - Database error object
 * @param {Object} context - Context data (dokter_pj, petugas, etc)
 * @returns {string} User-friendly error message
 */
function parseDatabaseError(error, context = {}) {
    const errorMessage = error.message || '';
    
    // Foreign key constraint errors
    if (errorMessage.includes('foreign key constraint fails')) {
        
        // Check for petugas NIP error
        if (errorMessage.includes('`petugas`') || errorMessage.includes('(`nip`)')) {
            const nipValue = context.petugas || 'tidak diketahui';
            return `Kode petugas tidak valid: "${nipValue}". Pastikan kode petugas terdaftar di sistem.`;
        }
        
        // Check for dokter error
        if (errorMessage.includes('`dokter`') || errorMessage.includes('(`kd_dokter`)')) {
            const dokterValue = context.dokter_pj || context.dokter_perujuk || 'tidak diketahui';
            return `Kode dokter tidak valid: "${dokterValue}". Pastikan kode dokter terdaftar di sistem.`;
        }
        
        // Check for template/pemeriksaan error
        if (errorMessage.includes('`template_laboratorium`')) {
            return `Kode pemeriksaan tidak valid. Pastikan kode pemeriksaan terdaftar di sistem.`;
        }
        
        // Generic foreign key error
        return 'Data referensi tidak valid. Pastikan semua kode (dokter, petugas, pemeriksaan) sudah terdaftar di sistem.';
    }
    
    // Duplicate entry errors
    if (errorMessage.includes('Duplicate entry')) {
        if (errorMessage.includes('PRIMARY')) {
            return 'Data sudah ada untuk kombinasi no_rawat, tanggal, dan jam ini. Gunakan tanggal/jam yang berbeda untuk update.';
        }
        return 'Data duplikat terdeteksi. Periksa kembali data yang dikirim.';
    }
    
    // Data too long errors
    if (errorMessage.includes('Data too long')) {
        return 'Data terlalu panjang untuk salah satu field. Periksa panjang karakter input.';
    }
    
    // Connection errors
    if (errorMessage.includes('connect') || errorMessage.includes('connection')) {
        return 'Gagal terhubung ke database. Silakan coba lagi atau hubungi administrator.';
    }
    
    // Transaction errors
    if (errorMessage.includes('transaction') || errorMessage.includes('deadlock')) {
        return 'Terjadi konflik data. Silakan coba lagi.';
    }
    
    // Default: return generic message without technical details
    return 'Terjadi kesalahan saat memproses data. Silakan periksa kembali data yang dikirim.';
}

module.exports = {
    postLabResults
};