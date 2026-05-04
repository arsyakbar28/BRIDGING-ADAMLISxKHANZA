const postLabService = require('../services/post-lab-pa.service');
const responseHelper = require('../../shared/helpers/response.helper');
const { logPostError } = require('../../../../utils/logger');

async function postLabResults(req, res) {
    try {
        const labData = req.body;
        const noorder = labData.noorder || labData.no_registrasi || labData.no_reg_rs;
        if (noorder && !labData.noorder) labData.noorder = noorder;
        if (!labData.hasil_pa && labData.hasil) labData.hasil_pa = labData.hasil;
        if (!labData.dokter_pj && labData.dokter_pengirim?.kode) labData.dokter_pj = labData.dokter_pengirim.kode;
        if (!labData.dokter_pj && labData.kode_dokter) labData.dokter_pj = labData.kode_dokter;
        if (!labData.dokter_perujuk && labData.dokter_pengirim?.kode) labData.dokter_perujuk = labData.dokter_pengirim.kode;
        if (!labData.dokter_perujuk && labData.kode_dokter) labData.dokter_perujuk = labData.kode_dokter;
        if (!labData.petugas && labData.kode_pegawai) labData.petugas = labData.kode_pegawai;
        if (!labData.tgl_periksa && labData.waktu_selesai) {
            const s = String(labData.waktu_selesai).trim();
            if (s.length >= 10) {
                labData.tgl_periksa = s.slice(0, 10);
                labData.jam_periksa = s.length >= 19 ? s.slice(11, 19) : (labData.jam_periksa || '00:00:00');
            }
        }

        if (!labData.noorder || !labData.dokter_pj || !labData.petugas || !labData.dokter_perujuk || !labData.tgl_periksa || !labData.jam_periksa || !labData.hasil_pa) {
            logPostError({ error: new Error('Required PA fields missing'), noorder: labData?.noorder || 'UNKNOWN', requestBody: labData, endpoint: req.originalUrl || req.path || '/adam-lis/bridging/pa', method: req.method });
            return responseHelper.badRequest(res, 'Required fields: noorder, dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa, hasil_pa');
        }

        console.log(`🔬 [PA] Posting lab results for noorder: ${labData.noorder}`);
        const result = await postLabService.postLabResults(labData.noorder, labData);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('❌ [PA] Controller Error:', error);
        logPostError({ error, noorder: req.body?.noorder || 'UNKNOWN', requestBody: req.body, endpoint: req.originalUrl || req.path || '/adam-lis/bridging/pa', method: req.method, user: req.user || null });
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

module.exports = { postLabResults };
