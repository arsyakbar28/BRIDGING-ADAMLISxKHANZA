/**
 * POST Lab MB Service
 * Business logic for posting lab results (MB - Mikrobiologi)
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const postLabRepository = require('../repositories/post-lab-mb.repository');
const labValidator = require('../validators/lab-results-mb.validator');
const errorParser = require('../../shared/helpers/error-parser.helper');
const statusMapper = require('../../shared/helpers/status-mapper.helper');
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
            endpoint: '/adam-lis/bridging/mb',
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
        
        // Get no_rawat from permintaan_labmb
        const no_rawat = await postLabRepository.getLabRequestInfo(conn, noorder);
        if (!no_rawat) {
            await conn.rollback();
            
            // Log error: noorder not found
            logPostError({
                error: new Error(`No lab request found for noorder: ${noorder}`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/mb',
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
            pemeriksaan,
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
        
        // Bulk get template data
        const kodePemeriksaanArray = pemeriksaan.map(p => p.kode_pemeriksaan);
        const templateDataArray = await postLabRepository.bulkGetTemplateData(conn, kodePemeriksaanArray);

        if (templateDataArray.length === 0) {
            await conn.rollback();
            
            // Log error: no template data found
            logPostError({
                error: new Error('No template data found for provided kode_pemeriksaan'),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/mb',
                method: 'POST'
            });
            
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

        // Validate all templates exist
        const missingTemplates = [];
        pemeriksaan.forEach(p => {
            if (!templateMap[p.kode_pemeriksaan]) {
                missingTemplates.push(p.kode_pemeriksaan);
            }
        });

        if (missingTemplates.length > 0) {
            await conn.rollback();
            
            // Log error: missing templates
            logPostError({
                error: new Error(`Template not found for ${missingTemplates.length} kode_pemeriksaan: ${missingTemplates.join(', ')}`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/mb',
                method: 'POST'
            });
            
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
                nilai_rujukan: (p.nilai_rujukan === null || p.nilai_rujukan === undefined) 
                    ? "" 
                    : p.nilai_rujukan.toString().trim(),
                keterangan: p.keterangan || ""
            });
        });

        const tindakanArray = Object.values(tindakanMap);

        // Bulk get tarif data
        const kodeTindakanArray = tindakanArray.map(t => t.kode_tindakan);
        const tarifMap = await postLabRepository.bulkGetTarifData(conn, kodeTindakanArray);

        const missingTarif = [];
        kodeTindakanArray.forEach(kode => {
            if (!tarifMap[kode]) {
                missingTarif.push(kode);
            }
        });

        if (missingTarif.length > 0) {
            await conn.rollback();
            
            // Log error: missing tarif
            logPostError({
                error: new Error(`Tarif not found for ${missingTarif.length} kode_tindakan: ${missingTarif.join(', ')}`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/mb',
                method: 'POST'
            });
            
            return {
                success: false,
                message: `Tarif not found for ${missingTarif.length} kode_tindakan`,
                payload: [{ noorder, missing_tarif: missingTarif }]
            };
        }

        let totalBiayaPeriksa = 0;
        
        // ✅ VALIDATE: Check if kode dokter exists
        const dokterExists = await postLabRepository.validateDokter(conn, dokterCode);
        if (!dokterExists) {
            await conn.rollback();
            
            // Log error: invalid dokter code
            logPostError({
                error: new Error(`Kode dokter tidak valid: "${dokterCode}"`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/mb',
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
                endpoint: '/adam-lis/bridging/mb',
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
                endpoint: '/adam-lis/bridging/mb',
                method: 'POST'
            });
            
            return {
                success: false,
                message: `Kode dokter perujuk tidak valid: "${dokter_perujuk}". Pastikan kode dokter terdaftar di sistem.`,
                payload: []
            };
        }
        
        // Delete old data for this specific order (no_rawat + tgl_periksa + jam)
        // This ensures multiple orders for the same patient on the same day don't interfere
        await postLabRepository.deleteOldLabData(conn, no_rawat, tgl_periksa, jam_periksa);
        
        let insertedDetailCount = 0;
        let insertedPeriksaCount = 0;
        const allResults = [];
        
        // Process each tindakan
        for (const tindakan of tindakanArray) {
            const tarifData = tarifMap[tindakan.kode_tindakan];
            totalBiayaPeriksa += tarifData.biaya_tindakan;
            
            // Insert periksa_lab
            await postLabRepository.insertPeriksaLab(conn, {
                no_rawat,
                nip: petugasNip,
                kd_jenis_prw: tindakan.kode_tindakan,
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
                kategori: tarifData.kategori || 'MB'
            });
            insertedPeriksaCount++;
            
            // Insert detail pemeriksaan
            for (const item of tindakan.pemeriksaan) {
                await postLabRepository.insertDetailPeriksaLab(conn, {
                    no_rawat,
                    kd_jenis_prw: tindakan.kode_tindakan,
                    tgl_periksa,
                    jam: jam_periksa,
                    id_template: item.kode_pemeriksaan,
                    nilai: item.hasil,
                    nilai_rujukan: item.nilai_rujukan,
                    keterangan: item.keterangan,
                    bagian_rs: tarifData.bagian_rs,
                    bhp: tarifData.bhp,
                    bagian_perujuk: tarifData.tarif_perujuk,
                    bagian_dokter: tarifData.tarif_tindakan_dokter,
                    bagian_laborat: tarifData.tarif_tindakan_petugas,
                    kso: tarifData.kso,
                    menejemen: tarifData.menejemen,
                    biaya_item: 0.0
                });
                insertedDetailCount++;
            }
            
            // Add to results
            allResults.push({
                no_urut: allResults.length + 1,
                kode_jenis_perawatan: tindakan.kode_tindakan,
                nama_perawatan: tarifData.nm_perawatan,
                dokter_pj,
                petugas,
                dokter_perujuk,
                tgl_periksa,
                jam_periksa,
                no_rawat,
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
                detail_pemeriksaan: tindakan.pemeriksaan.map((item) => ({
                    kode_pemeriksaan: item.kode_pemeriksaan,
                    nama_pemeriksaan: item.nama_pemeriksaan,
                    hasil: item.hasil,
                    satuan: item.satuan,
                    nilai_rujukan: item.nilai_rujukan,
                    keterangan: item.keterangan,
                    status: statusMapper.getStatusFromKeterangan(item.keterangan)
                }))
            });
        }
        
        // Update permintaan_labmb
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
        
        if (kesan || saran) {
            response.saran_kesan = {
                kesan: kesan || "",
                saran: saran || ""
            };
        }
        
        // Log successful POST request
        logPostSuccess({
            noorder,
            endpoint: '/adam-lis/bridging/mb',
            summary: {
                total_tindakan: insertedPeriksaCount,
                total_pemeriksaan: insertedDetailCount,
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
        console.error('❌ [MB] Database Error Details:', error.message);
        
        // Log POST error with detailed information
        logPostError({
            error,
            noorder,
            requestBody: labData,
            endpoint: '/adam-lis/bridging/mb',
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
