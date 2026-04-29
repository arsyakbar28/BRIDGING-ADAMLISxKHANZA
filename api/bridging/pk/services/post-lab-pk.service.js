/**
 * POST Lab PK Service
 * Business logic for posting lab results (PK)
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const postLabRepository = require('../repositories/post-lab-pk.repository');
const labValidator = require('../validators/lab-results-pk.validator');
const errorParser = require('../../shared/helpers/error-parser.helper');
const statusMapper = require('../../shared/helpers/status-mapper.helper');
const { normalizeStringForDb } = require('../../shared/helpers/db-string.helper');
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
            endpoint: '/adam-lis/bridging/pk',
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
        
        // Get no_rawat and visit status from permintaan_lab
        const labRequestInfo = await postLabRepository.getLabRequestInfo(conn, noorder);
        if (!labRequestInfo) {
            await conn.rollback();
            
            // Log error: noorder not found
            logPostError({
                error: new Error(`No lab request found for noorder: ${noorder}`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/pk',
                method: 'POST'
            });
            
            return {
                success: false,
                message: `No lab request found for noorder: ${noorder}`,
                payload: []
            };
        }

        const no_rawat = labRequestInfo.no_rawat;
        const periksaLabStatus = statusMapper.getPeriksaLabStatus(labRequestInfo.status);
        
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
        
        // Kode untuk lookup: prioritaskan id_template numerik (dari keterangan atau kode_pemeriksaan)
        const resolveIdTemplate = (p) => {
            const k = p.kode_pemeriksaan;
            const ket = p.keterangan;
            const numKet = ket != null && String(ket).trim() !== '' && !isNaN(Number(ket)) ? Number(ket) : null;
            if (numKet != null) return numKet;
            if (typeof k === 'number' && !isNaN(k)) return k;
            if (typeof k === 'string' && k.trim() !== '' && !isNaN(Number(k))) return Number(k);
            return k;
        };
        const kodePemeriksaanArray = pemeriksaan.map(resolveIdTemplate).filter(v => v !== undefined && v !== null && v !== '');
        const templateDataArray = await postLabRepository.bulkGetTemplateData(conn, kodePemeriksaanArray);

        if (templateDataArray.length === 0) {
            await conn.rollback();
            
            // Log error: no template data found
            logPostError({
                error: new Error('No template data found for provided kode_pemeriksaan'),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/pk',
                method: 'POST'
            });
            
            return {
                success: false,
                message: 'No template data found for provided kode_pemeriksaan',
                payload: []
            };
        }

        // Map template data (dukung lookup by number atau string, sesuai id_template di DB)
        const templateMap = {};
        templateDataArray.forEach(template => {
            const id = template.id_template;
            templateMap[id] = template;
            templateMap[String(id)] = template;
        });

        // Helper: ambil template (kode_pemeriksaan bisa number atau string dari client)
        const getTemplate = (kode) => templateMap[kode] ?? templateMap[Number(kode)];

        // Validate all templates exist (pakai id yang sudah di-resolve)
        const missingTemplates = [];
        pemeriksaan.forEach(p => {
            const resolvedId = resolveIdTemplate(p);
            if (!getTemplate(resolvedId)) {
                missingTemplates.push(p.kode_pemeriksaan ?? resolvedId);
            }
        });

        if (missingTemplates.length > 0) {
            await conn.rollback();
            
            // Log error: missing templates
            logPostError({
                error: new Error(`Template not found for ${missingTemplates.length} kode_pemeriksaan: ${missingTemplates.join(', ')}`),
                noorder,
                requestBody: labData,
                endpoint: '/adam-lis/bridging/pk',
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

        // Normalisasi hasil: bisa string atau objek Adam LIS { nilai_hasil, satuan, nilai_rujukan, ... }
        const normalizeHasil = (hasil) => {
            if (hasil === null || hasil === undefined) return '';
            if (typeof hasil === 'string' || typeof hasil === 'number') return String(hasil).trim();
            if (typeof hasil === 'object' && hasil !== null && 'nilai_hasil' in hasil) return String(hasil.nilai_hasil ?? '').trim();
            return String(hasil);
        };

        const normalizeNilaiRujukan = (p, template) => {
            if (p.nilai_rujukan !== null && p.nilai_rujukan !== undefined && p.nilai_rujukan.toString().trim() !== '') return p.nilai_rujukan.toString().trim();
            if (typeof p.hasil === 'object' && p.hasil !== null && p.hasil.nilai_rujukan != null) return String(p.hasil.nilai_rujukan).trim();
            return '';
        };

        pemeriksaan.forEach(p => {
            const resolvedId = resolveIdTemplate(p);
            const template = getTemplate(resolvedId);
            if (!template) return;
            const kode_tindakan = template.kd_jenis_prw;
            
            if (!tindakanMap[kode_tindakan]) {
                tindakanMap[kode_tindakan] = {
                    kode_tindakan: kode_tindakan,
                    pemeriksaan: []
                };
            }

            const hasilStr = normalizeHasil(p.hasil);
            const nilaiRujukanStr = normalizeNilaiRujukan(p, template);
            // Normalisasi untuk DB: ganti simbol Unicode (≤, ≥, dll) ke ASCII agar tidak error charset
            tindakanMap[kode_tindakan].pemeriksaan.push({
                kode_pemeriksaan: template.id_template,
                nama_pemeriksaan: template.nama_pemeriksaan,
                hasil: normalizeStringForDb(hasilStr),
                satuan: template.satuan || "-",
                nilai_rujukan: normalizeStringForDb(nilaiRujukanStr),
                keterangan: normalizeStringForDb((p.keterangan != null && p.keterangan !== '') ? String(p.keterangan).trim() : "")
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
                endpoint: '/adam-lis/bridging/pk',
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
                endpoint: '/adam-lis/bridging/pk',
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
                endpoint: '/adam-lis/bridging/pk',
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
                endpoint: '/adam-lis/bridging/pk',
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
                status: periksaLabStatus,
                kategori: tarifData.kategori || 'PK'
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
        
        // Update permintaan_lab
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
            endpoint: '/adam-lis/bridging/pk',
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
        console.error('❌ [PK] Database Error Details:', error.message);
        
        // Log POST error with detailed information
        logPostError({
            error,
            noorder,
            requestBody: labData,
            endpoint: '/adam-lis/bridging/pk',
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

