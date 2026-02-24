/**
 * POST Lab PA Service
 * Business logic for posting lab results (PA - Patologi Anatomi)
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const postLabRepository = require('../repositories/post-lab-pa.repository');
const labValidator = require('../validators/lab-results-pa.validator');
const errorParser = require('../../shared/helpers/error-parser.helper');
const { logPostError, logPostSuccess } = require('../../../../utils/logger');

/**
 * POST lab results to database
 * @param {string} noorder - Lab order number
 * @param {Object} labData - Complete lab data object
 * @returns {Promise<Object>} Service response
 */
async function postLabResults(noorder, labData) {
    // ✅ VALIDATE INPUT BEFORE DATABASE CONNECTION
    const validation = labValidator.validateLabData(labData);
    if (!validation.valid) {
        // Log validation error
        logPostError({
            error: new Error(`Validation failed: ${validation.errors.map(e => e.message || e).join(', ')}`),
            noorder: labData?.noorder || 'UNKNOWN',
            requestBody: labData,
            endpoint: '/adam-lis/bridging/pa',
            method: 'POST'
        });
        
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
        
        // Get no_rawat from permintaan_labpa
        const no_rawat = await postLabRepository.getLabRequestInfo(conn, noorder);
        if (!no_rawat) {
            await conn.rollback();
            
            // Log error: noorder not found
            logPostError({
                error: new Error(`No lab request found for noorder: ${noorder}`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/pa',
                method: 'POST'
            });
            
            return {
                success: false,
                message: `No lab request found for noorder: ${noorder}`,
                payload: []
            };
        }
        
        // Extract data from labData
        const {
            kd_jenis_prw,
            hasil_pa,
            dokter_pj,
            petugas,
            dokter_perujuk,
            tgl_periksa,
            jam_periksa,
            kesan,
            saran
        } = labData;
        
        const petugasNip = petugas;
        const dokterCode = dokter_pj;
        
        // Get tarif data
        const tarifData = await postLabRepository.getTarifData(conn, kd_jenis_prw);
        if (!tarifData) {
            await conn.rollback();
            
            // Log error: no tarif data found
            logPostError({
                error: new Error(`Tarif not found for kd_jenis_prw: ${kd_jenis_prw}`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/pa',
                method: 'POST'
            });
            
            return {
                success: false,
                message: `Tarif not found for kd_jenis_prw: ${kd_jenis_prw}`,
                payload: []
            };
        }
        
        // ✅ VALIDATE: Check if kode dokter exists
        const dokterExists = await postLabRepository.validateDokter(conn, dokterCode);
        if (!dokterExists) {
            await conn.rollback();
            
            // Log error: invalid dokter code
            logPostError({
                error: new Error(`Kode dokter tidak valid: "${dokterCode}"`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/pa',
                method: 'POST'
            });
            
            return {
                success: false,
                message: `Kode dokter tidak valid: "${dokterCode}". Pastikan kode dokter terdaftar di sistem.`,
                payload: []
            };
        }
        
        // ✅ VALIDATE: Check if NIP petugas exists
        const petugasExists = await postLabRepository.validatePetugas(conn, petugasNip);
        if (!petugasExists) {
            await conn.rollback();
            
            // Log error: invalid petugas code
            logPostError({
                error: new Error(`Kode petugas tidak valid: "${petugasNip}"`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/pa',
                method: 'POST'
            });
            
            return {
                success: false,
                message: `Kode petugas tidak valid: "${petugasNip}". Pastikan kode petugas terdaftar di sistem.`,
                payload: []
            };
        }
        
        // ✅ VALIDATE: Check if dokter_perujuk exists
        const dokterPerujukExists = await postLabRepository.validateDokter(conn, dokter_perujuk);
        if (!dokterPerujukExists) {
            await conn.rollback();
            
            // Log error: invalid dokter perujuk code
            logPostError({
                error: new Error(`Kode dokter perujuk tidak valid: "${dokter_perujuk}"`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/pa',
                method: 'POST'
            });
            
            return {
                success: false,
                message: `Kode dokter perujuk tidak valid: "${dokter_perujuk}". Pastikan kode dokter terdaftar di sistem.`,
                payload: []
            };
        }
        
        // Delete old data for this specific order (no_rawat + tgl_periksa + jam)
        await postLabRepository.deleteOldLabData(conn, no_rawat, tgl_periksa, jam_periksa);
        
        // Insert periksa_lab
        await postLabRepository.insertPeriksaLab(conn, {
            no_rawat,
            nip: petugasNip,
            kd_jenis_prw: kd_jenis_prw,
            tgl_periksa,
            jam: jam_periksa,
            dokter_perujuk,
            bagian_rs: tarifData.bagian_rs,
            bhp: tarifData.bhp,
            tarif_perujuk: tarifData.tarif_perujuk,
            tarif_tindakan_dokter: tarifData.tarif_tindakan_dokter,
            tarif_tindakan_petugas: tarifData.tarif_tindakan_petugas,
            kso: tarifData.kso,
            menejemen: tarifData.menejemen,
            biaya: tarifData.biaya_tindakan,
            kd_dokter: dokterCode,
            status: tarifData.status || 'Ralan',
            kategori: tarifData.kategori || 'PA'
        });
        
        // Insert detail_periksa_labpa (PA specific - narrative format)
        await postLabRepository.insertDetailPeriksaLabPA(conn, {
            no_rawat,
            kd_jenis_prw: kd_jenis_prw,
            tgl_periksa,
            jam: jam_periksa,
            diagnosa_klinik: hasil_pa.diagnosa_klinik || '',
            makroskopik: hasil_pa.makroskopik || '',
            mikroskopik: hasil_pa.mikroskopik || '',
            kesimpulan: hasil_pa.kesimpulan || '',
            kesan: hasil_pa.kesan || ''
        });
        
        // Update permintaan_labpa
        await postLabRepository.updatePermintaanLab(conn, noorder, tgl_periksa, jam_periksa);
        
        // Insert saran kesan if provided
        if (kesan || saran) {
            await postLabRepository.insertSaranKesanLab(conn, no_rawat, tgl_periksa, jam_periksa, kesan, saran);
        }
        
        // Commit transaction
        await conn.commit();
        
        // Build response
        const response = {
            success: true,
            message: `Lab results posted successfully for noorder: ${noorder}`,
            summary: {
                noorder, 
                no_rawat, 
                kd_jenis_prw: kd_jenis_prw,
                tgl_periksa, 
                jam_periksa
            },
            biaya_periksa: {
                total: tarifData.biaya_tindakan,
                mata_uang: "IDR",
                formatted: `Rp ${tarifData.biaya_tindakan.toLocaleString('id-ID')}`,
                breakdown: {
                    kode_tindakan: kd_jenis_prw,
                    nama_tindakan: tarifData.nm_perawatan,
                    biaya: tarifData.biaya_tindakan,
                    detail: {
                        bagian_rs: tarifData.bagian_rs,
                        bhp: tarifData.bhp,
                        tarif_perujuk: tarifData.tarif_perujuk,
                        tarif_tindakan_dokter: tarifData.tarif_tindakan_dokter,
                        tarif_tindakan_petugas: tarifData.tarif_tindakan_petugas,
                        kso: tarifData.kso,
                        menejemen: tarifData.menejemen
                    }
                }
            },
            payload: [{
                no_urut: 1,
                kode_jenis_perawatan: kd_jenis_prw,
                nama_perawatan: tarifData.nm_perawatan,
                dokter_pj,
                petugas,
                dokter_perujuk,
                tgl_periksa,
                jam_periksa,
                no_rawat,
                biaya_tindakan: tarifData.biaya_tindakan,
                hasil_pa: {
                    diagnosa_klinik: hasil_pa.diagnosa_klinik || '',
                    makroskopik: hasil_pa.makroskopik || '',
                    mikroskopik: hasil_pa.mikroskopik || '',
                    kesimpulan: hasil_pa.kesimpulan || '',
                    kesan: hasil_pa.kesan || ''
                }
            }]
        };
        
        if (kesan || saran) {
            response.saran_kesan = {
                kesan: kesan || "",
                saran: saran || ""
            };
        }
        
        // Log successful POST request
        logPostSuccess({
            noorder,
            endpoint: '/adam-lis/bridging/pa',
            summary: {
                kd_jenis_prw: kd_jenis_prw,
                tgl_periksa,
                jam_periksa
            }
        });
        
        return response;
        
    } catch (error) {
        // Rollback transaction on error
        await conn.rollback();
        
        // Parse error to user-friendly message
        const userMessage = errorParser.parseDatabaseError(error, {
            petugas: labData.petugas,
            dokter_pj: labData.dokter_pj,
            dokter_perujuk: labData.dokter_perujuk
        });
        
        // Log technical error for debugging (server-side only)
        console.error('❌ [PA] Database Error Details:', error.message);
        
        // Log POST error with detailed information
        logPostError({
            error,
            noorder,
            requestBody: labData,
            endpoint: '/adam-lis/bridging/pa',
            method: 'POST'
        });
        
        return {
            success: false,
            message: userMessage,
            payload: []
        };
    } finally {
        await closeDbConnection(conn);
    }
}

module.exports = {
    postLabResults
};
