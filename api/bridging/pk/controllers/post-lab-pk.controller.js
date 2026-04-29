/**
 * POST Lab PK Controller
 * Handle HTTP requests for posting lab results (PK)
 */

const postLabService = require('../services/post-lab-pk.service');
const responseHelper = require('../../shared/helpers/response.helper');
const { logPostError } = require('../../../../utils/logger');

function getCurrentDateTime() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23'
    }).formatToParts(new Date()).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        time: `${parts.hour}:${parts.minute}:${parts.second}`
    };
}

function normalizeAdamLisPemeriksaan(item) {
    const hasil = item.hasil && typeof item.hasil === 'object' ? item.hasil : {};

    return {
        ...item,
        kode_pemeriksaan: item.kode_pemeriksaan || item.id_template || item.kode_tindakan_simrs || item.kode_pemeriksaan_lis,
        hasil: item.hasil,
        nilai_rujukan: item.nilai_rujukan || hasil.nilai_rujukan || '',
        keterangan: item.keterangan || hasil.flag_kode || item.flag_kode || ''
    };
}

function normalizeLabData(labData) {
    const noorder = labData.noorder || labData.no_registrasi;
    if (noorder && !labData.noorder) labData.noorder = noorder;

    if (Array.isArray(labData.pemeriksaan)) {
        labData.pemeriksaan = labData.pemeriksaan.map(normalizeAdamLisPemeriksaan);
    }

    const defaultDokter = process.env.DEFAULT_LAB_DOKTER_KD || '-';
    const defaultPetugas = process.env.DEFAULT_LAB_PETUGAS_NIP || '-';

    if (!labData.dokter_pj && labData.dokter_pengirim?.kode) labData.dokter_pj = labData.dokter_pengirim.kode;
    if (!labData.dokter_pj && labData.kode_dokter_pj) labData.dokter_pj = labData.kode_dokter_pj;
    if (!labData.dokter_pj) labData.dokter_pj = labData.dokter_perujuk || defaultDokter;

    if (!labData.dokter_perujuk && labData.dokter_pengirim?.kode) labData.dokter_perujuk = labData.dokter_pengirim.kode;
    if (!labData.dokter_perujuk && labData.kode_dokter_pengirim) labData.dokter_perujuk = labData.kode_dokter_pengirim;
    if (!labData.dokter_perujuk) labData.dokter_perujuk = labData.dokter_pj || defaultDokter;

    if (!labData.petugas && labData.kode_pegawai) labData.petugas = labData.kode_pegawai;
    if (!labData.petugas && labData.nip_petugas) labData.petugas = labData.nip_petugas;
    if (!labData.petugas) labData.petugas = defaultPetugas;

    if (!labData.tgl_periksa && labData.waktu_selesai) {
        const s = String(labData.waktu_selesai).trim();
        if (s.length >= 10) {
            labData.tgl_periksa = s.slice(0, 10);
            labData.jam_periksa = s.length >= 19 ? s.slice(11, 19) : (labData.jam_periksa || '00:00:00');
        }
    }

    if (!labData.tgl_periksa && labData.waktu_hasil) {
        const s = String(labData.waktu_hasil).trim();
        if (s.length >= 10) {
            labData.tgl_periksa = s.slice(0, 10);
            labData.jam_periksa = s.length >= 19 ? s.slice(11, 19) : (labData.jam_periksa || '00:00:00');
        }
    }

    if (!labData.tgl_periksa || !labData.jam_periksa) {
        const now = getCurrentDateTime();
        labData.tgl_periksa = labData.tgl_periksa || now.date;
        labData.jam_periksa = labData.jam_periksa || now.time;
    }

    return noorder;
}

function hasRequiredLabData(labData, noorder) {
    return noorder && labData.pemeriksaan && Array.isArray(labData.pemeriksaan) && labData.pemeriksaan.length > 0 &&
        labData.dokter_pj && labData.petugas && labData.dokter_perujuk &&
        labData.tgl_periksa && labData.jam_periksa;
}

/**
 * POST lab results
 * POST /adam-lis/bridging/pk
 */
async function postLabResults(req, res) {
    try {
        const labData = req.body;
        const noorder = normalizeLabData(labData);

        // Validate input (basic check)
        if (!hasRequiredLabData(labData, noorder)) {
            
            // Log validation error
            logPostError({
                error: new Error("Required fields missing: noorder, pemeriksaan (array), dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa"),
                noorder: labData?.noorder || 'UNKNOWN',
                requestBody: labData,
                endpoint: req.originalUrl || req.path || '/adam-lis/bridging/',
                method: req.method
            });
            
            return responseHelper.badRequest(
                res, 
                "Required fields: noorder, pemeriksaan (array), dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa"
            );
        }

        // Validate format pemeriksaan
        for (const pemeriksaan of labData.pemeriksaan) {
            if (!pemeriksaan.kode_pemeriksaan || !pemeriksaan.hasil) {
                // Log validation error
                logPostError({
                    error: new Error("Each pemeriksaan must have kode_pemeriksaan and hasil"),
                    noorder,
                    requestBody: labData,
                    endpoint: req.originalUrl || req.path || '/adam-lis/bridging/',
                    method: req.method
                });
                
                return responseHelper.badRequest(
                    res, 
                    "Each pemeriksaan must have kode_pemeriksaan and hasil"
                );
            }
        }

        console.log(`🔬 [PK] Posting lab results for noorder: ${noorder}`);
        console.log(`📊 [PK] Pemeriksaan count: ${labData.pemeriksaan.length}`);

        // Call service
        const result = await postLabService.postLabResults(noorder, labData);

        // Return response
        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);

    } catch (error) {
        console.error('❌ [PK] Controller Error:', error);
        
        // Log POST error with detailed information
        logPostError({
            error,
            noorder: req.body?.noorder || 'UNKNOWN',
            requestBody: req.body,
            endpoint: req.originalUrl || req.path || '/adam-lis/bridging/',
            method: req.method,
            user: req.user || null // If user info is available from auth middleware
        });
        
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

/**
 * POST update hasil pemeriksaan from Adam LIS
 * POST /adam-lis/bridging/update-hasil
 */
async function updateHasil(req, res) {
    try {
        const labData = req.body;
        const noorder = normalizeLabData(labData);

        if (!hasRequiredLabData(labData, noorder)) {
            logPostError({
                error: new Error("Required fields missing: no_registrasi/noorder and pemeriksaan (array)"),
                noorder: labData?.noorder || labData?.no_registrasi || 'UNKNOWN',
                requestBody: labData,
                endpoint: req.originalUrl || req.path || '/adam-lis/bridging/update-hasil',
                method: req.method
            });

            return res.status(400).json({
                success: false,
                message: 'Data gagal disimpan karena no_registrasi/noorder dan pemeriksaan wajib diisi'
            });
        }

        for (const pemeriksaan of labData.pemeriksaan) {
            const hasilValue = pemeriksaan.hasil && typeof pemeriksaan.hasil === 'object'
                ? pemeriksaan.hasil.nilai_hasil
                : pemeriksaan.hasil;

            if (!pemeriksaan.kode_pemeriksaan || hasilValue === null || hasilValue === undefined || String(hasilValue).trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Data gagal disimpan karena setiap pemeriksaan wajib memiliki kode dan hasil'
                });
            }
        }

        console.log(`ðŸ”¬ [PK] Update hasil from Adam LIS for noorder: ${noorder}`);

        const result = await postLabService.postLabResults(noorder, labData);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: `Data gagal disimpan karena ${result.message || 'terjadi kesalahan'}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Data berhasil Disimpan',
            payload: 'Message from simrs'
        });

    } catch (error) {
        console.error('âŒ [PK] Update Hasil Error:', error);
        logPostError({
            error,
            noorder: req.body?.noorder || req.body?.no_registrasi || 'UNKNOWN',
            requestBody: req.body,
            endpoint: req.originalUrl || req.path || '/adam-lis/bridging/update-hasil',
            method: req.method,
            user: req.user || null
        });

        return res.status(400).json({
            success: false,
            message: `Data gagal disimpan karena ${error.message}`
        });
    }
}

module.exports = {
    postLabResults,
    updateHasil
};

