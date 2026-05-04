const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const repo = require('../repositories/post-lab-pa.repository');
const validator = require('../validators/lab-results-pa.validator');
const errorParser = require('../../shared/helpers/error-parser.helper');
const { normalizeStringForDb } = require('../../shared/helpers/db-string.helper');
const { logPostError, logPostSuccess } = require('../../../../utils/logger');

function clip(value, max) {
    const s = normalizeStringForDb(value || '');
    return s.length > max ? s.slice(0, max) : s;
}

function mapStatus(status) {
    return String(status || '').toLowerCase() === 'ranap' ? 'Ranap' : 'Ralan';
}

async function postLabResults(noorder, labData) {
    const validation = validator.validateLabData(labData);
    if (!validation.valid) {
        logPostError({ error: new Error('Validation failed'), noorder: labData?.noorder || 'UNKNOWN', requestBody: labData, endpoint: '/adam-lis/bridging/pa', method: 'POST' });
        return { success: false, message: `Validation failed: Found ${validation.errors.length} error(s)`, errors: validation.errors, payload: [] };
    }

    const conn = await getDbConnection();
    try {
        await conn.beginTransaction();

        const requestInfo = await repo.getLabRequestInfo(conn, noorder);
        if (!requestInfo) {
            await conn.rollback();
            return { success: false, message: `No PA lab request found for noorder: ${noorder}`, payload: [] };
        }

        const tindakan = await repo.getRequestedTindakan(conn, noorder);
        if (!tindakan) {
            await conn.rollback();
            return { success: false, message: `No PA tindakan found for noorder: ${noorder}`, payload: [] };
        }

        if (tindakan.kategori !== 'PA') {
            await conn.rollback();
            return { success: false, message: `Tindakan ${tindakan.kd_jenis_prw} is not PA category`, payload: [] };
        }

        const { dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa, hasil_pa } = labData;

        if (!(await repo.validateDokter(conn, dokter_pj))) {
            await conn.rollback();
            return { success: false, message: `Kode dokter tidak valid: "${dokter_pj}". Pastikan kode dokter terdaftar di sistem.`, payload: [] };
        }
        if (!(await repo.validatePetugas(conn, petugas))) {
            await conn.rollback();
            return { success: false, message: `Kode petugas tidak valid: "${petugas}". Pastikan kode petugas terdaftar di sistem.`, payload: [] };
        }
        if (!(await repo.validateDokter(conn, dokter_perujuk))) {
            await conn.rollback();
            return { success: false, message: `Kode dokter perujuk tidak valid: "${dokter_perujuk}". Pastikan kode dokter terdaftar di sistem.`, payload: [] };
        }

        const no_rawat = requestInfo.no_rawat;
        const totalBiaya = parseFloat(tindakan.total_byr) || 0;
        const status = mapStatus(requestInfo.status);

        await repo.deleteOldLabData(conn, no_rawat, tgl_periksa, jam_periksa);

        await repo.insertPeriksaLab(conn, {
            no_rawat,
            nip: petugas,
            kd_jenis_prw: tindakan.kd_jenis_prw,
            tgl_periksa,
            jam: jam_periksa,
            dokter_perujuk,
            bagian_rs: parseFloat(tindakan.bagian_rs) || 0,
            bhp: parseFloat(tindakan.bhp) || 0,
            tarif_perujuk: parseFloat(tindakan.tarif_perujuk) || 0,
            tarif_tindakan_dokter: parseFloat(tindakan.tarif_tindakan_dokter) || 0,
            tarif_tindakan_petugas: parseFloat(tindakan.tarif_tindakan_petugas) || 0,
            kso: parseFloat(tindakan.kso) || 0,
            menejemen: parseFloat(tindakan.menejemen) || 0,
            biaya: totalBiaya,
            kd_dokter: dokter_pj,
            status,
            kategori: 'PA'
        });

        const normalizedHasil = {
            diagnosa_klinik: clip(hasil_pa.diagnosa_klinik, 50),
            makroskopik: clip(hasil_pa.makroskopik, 1024),
            mikroskopik: clip(hasil_pa.mikroskopik, 1024),
            kesimpulan: clip(hasil_pa.kesimpulan, 300),
            kesan: clip(hasil_pa.kesan, 300)
        };

        await repo.insertDetailPeriksaLabPa(conn, {
            no_rawat,
            kd_jenis_prw: tindakan.kd_jenis_prw,
            tgl_periksa,
            jam: jam_periksa,
            ...normalizedHasil
        });

        await repo.updatePermintaanLabPa(conn, noorder, tgl_periksa, jam_periksa);

        const rootKesan = labData.kesan || normalizedHasil.kesan;
        const rootSaran = labData.saran || '';
        if (rootKesan || rootSaran) {
            await repo.insertSaranKesanLab(conn, no_rawat, tgl_periksa, jam_periksa, rootKesan, rootSaran);
        }

        await conn.commit();

        const response = {
            success: true,
            message: `PA lab results posted successfully for noorder: ${noorder}`,
            summary: { noorder, no_rawat, total_tindakan: 1, tgl_periksa, jam_periksa },
            biaya_periksa: {
                total: totalBiaya,
                mata_uang: 'IDR',
                formatted: `Rp ${totalBiaya.toLocaleString('id-ID')}`
            },
            payload: [{
                kode_jenis_perawatan: tindakan.kd_jenis_prw,
                nama_perawatan: tindakan.nm_perawatan,
                dokter_pj,
                petugas,
                dokter_perujuk,
                tgl_periksa,
                jam_periksa,
                no_rawat,
                hasil_pa: normalizedHasil
            }]
        };
        if (rootKesan || rootSaran) response.saran_kesan = { kesan: rootKesan, saran: rootSaran };

        logPostSuccess({ noorder, endpoint: '/adam-lis/bridging/pa', summary: response.summary });
        return response;
    } catch (error) {
        await conn.rollback();
        console.error('❌ [PA] Database Error Details:', error.message);
        logPostError({ error, noorder, requestBody: labData, endpoint: '/adam-lis/bridging/pa', method: 'POST' });
        return { success: false, message: errorParser.parseDatabaseError(error, labData), payload: [] };
    } finally {
        await closeDbConnection(conn);
    }
}

module.exports = { postLabResults };
