/**
 * Patient Registration API
 * Endpoint: GET /api/adam-lis/bridging/:noorder
 */

const { getDbConnection, closeDbConnection } = require('../config/database');

/**
 * Search patient registration by noorder
 * @param {string} noorder - Registration number (partial or complete)
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Object>} API response
 */
async function searchPatientRegistration(noorder, limit = 10) {
    const conn = await getDbConnection();
    
    try {
        // Buat query yang berbeda berdasarkan apakah ada noorder atau tidak
        let query, queryParams;
        
        if (noorder && noorder.trim() !== '') {
            // Jika ada noorder, gunakan LIKE search
            query = `
                SELECT 
                    pl.noorder,
                    pl.no_rawat,
                    pl.tgl_permintaan,
                    pl.jam_permintaan,
                    CONCAT(pl.tgl_permintaan, ' ', pl.jam_permintaan) as waktu_registrasi_formatted,
                    pl.tgl_sampel,
                    pl.jam_sampel,
                    pl.tgl_hasil,
                    pl.jam_hasil,
                    pl.dokter_perujuk,
                    pl.status,
                    pl.informasi_tambahan,
                    pl.diagnosa_klinis,
                    p.nm_pasien,
                    p.no_rkm_medis,
                    p.jk,
                    p.tmp_lahir,
                    p.tgl_lahir,
                    p.alamat,
                    p.no_tlp,
                    p.no_ktp,
                    p.kd_prop,
                    p.kd_kab,
                    p.kd_kec,
                    p.kabupatenpj,
                    p.kecamatanpj,
                    p.propinsipj,
                    rp.tgl_registrasi,
                    rp.kd_poli,
                    rp.kd_dokter,
                    d.nm_dokter,
                    pol.nm_poli,
                    rp.kd_pj,
                    penjab.png_jawab
                FROM permintaan_lab pl
                LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
                LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
                LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
                LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
                LEFT JOIN penjab ON rp.kd_pj = penjab.kd_pj
                WHERE pl.noorder LIKE ?
                ORDER BY pl.tgl_permintaan DESC, pl.jam_permintaan DESC
                LIMIT ?
            `;
            queryParams = [`%${noorder}%`, limit];
        } else {
            // Jika tidak ada noorder, ambil semua data terbaru
            query = `
                SELECT 
                    pl.noorder,
                    pl.no_rawat,
                    pl.tgl_permintaan,
                    pl.jam_permintaan,
                    CONCAT(pl.tgl_permintaan, ' ', pl.jam_permintaan) as waktu_registrasi_formatted,
                    pl.tgl_sampel,
                    pl.jam_sampel,
                    pl.tgl_hasil,
                    pl.jam_hasil,
                    pl.dokter_perujuk,
                    pl.status,
                    pl.informasi_tambahan,
                    pl.diagnosa_klinis,
                    p.nm_pasien,
                    p.no_rkm_medis,
                    p.jk,
                    p.tmp_lahir,
                    p.tgl_lahir,
                    p.alamat,
                    p.no_tlp,
                    p.no_ktp,
                    p.kd_prop,
                    p.kd_kab,
                    p.kd_kec,
                    p.kabupatenpj,
                    p.kecamatanpj,
                    p.propinsipj,
                    rp.tgl_registrasi,
                    rp.kd_poli,
                    rp.kd_dokter,
                    d.nm_dokter,
                    pol.nm_poli,
                    rp.kd_pj,
                    penjab.png_jawab
                FROM permintaan_lab pl
                LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
                LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
                LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
                LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
                LEFT JOIN penjab ON rp.kd_pj = penjab.kd_pj
                ORDER BY pl.tgl_permintaan DESC, pl.jam_permintaan DESC
                LIMIT ?
            `;
            queryParams = [limit];
        }

        const [results] = await conn.execute(query, queryParams);

        if (results.length === 0) {
            const message = noorder && noorder.trim() !== '' 
                ? `No registration data found for: ${noorder}`
                : 'No registration data found';
            return {
                success: false,
                message: message,
                payload: []
            };
        }

        // Format response
        const response = {
            success: true,
            message: noorder && noorder.trim() !== '' 
                ? `Found ${results.length} registration records for search: ${noorder}`
                : `Found ${results.length} latest registration records`,
            payload: []
        };

        for (const result of results) {
            // Ambil semua kode_tindakan yang diminta untuk noorder ini
            const requestedTindakanQuery = `
                SELECT DISTINCT 
                    pdpl.kd_jenis_prw,
                    jpl.nm_perawatan
                FROM permintaan_detail_permintaan_lab pdpl
                LEFT JOIN jns_perawatan_lab jpl ON pdpl.kd_jenis_prw = jpl.kd_jenis_prw
                WHERE pdpl.noorder = ?
                ORDER BY pdpl.kd_jenis_prw
            `;

            const [requestedTindakanResults] = await conn.execute(requestedTindakanQuery, [result.noorder]);

            // Ambil SEMUA pemeriksaan yang tersedia untuk semua kode_tindakan yang diminta
            const allPemeriksaan = [];
            
            for (const tindakan of requestedTindakanResults) {
                // Ambil SEMUA pemeriksaan yang tersedia untuk kode_tindakan ini
                const allPemeriksaanQuery = `
                    SELECT 
                        tl.id_template as kode_pemeriksaan,
                        tl.Pemeriksaan as nama_pemeriksaan
                    FROM template_laboratorium tl
                    WHERE tl.kd_jenis_prw = ?
                    ORDER BY tl.urut, tl.id_template
                `;

                const [pemeriksaanResults] = await conn.execute(allPemeriksaanQuery, [tindakan.kd_jenis_prw]);

                // Tambahkan semua pemeriksaan ke array (kecuali kode 3362 - hitung jenis)
                pemeriksaanResults.forEach(pemeriksaan => {
                    // Skip pemeriksaan dengan kode 3362 (bisa string atau integer)
                    if (pemeriksaan.kode_pemeriksaan === 3362 || pemeriksaan.kode_pemeriksaan === '3362') {
                        return;
                    }

                    allPemeriksaan.push({
                        nama_pemeriksaan: pemeriksaan.nama_pemeriksaan || "-",
                        kode_pemeriksaan: pemeriksaan.kode_pemeriksaan || "-"
                    });
                });
            }

            // Ambil semua diagnosa untuk noorder ini
            const diagnosaQuery = `
                SELECT 
                    dp.kd_penyakit,
                    pen.nm_penyakit
                FROM diagnosa_pasien dp
                LEFT JOIN penyakit pen ON dp.kd_penyakit = pen.kd_penyakit
                WHERE dp.no_rawat = ?
                ORDER BY dp.kd_penyakit
            `;

            const [diagnosaResults] = await conn.execute(diagnosaQuery, [result.no_rawat]);

            // Format data registrasi pasien sesuai dengan Python script
            const registrationData = {
                no_registrasi: result.noorder,
                waktu_registrasi: result.waktu_registrasi_formatted,
                diagnosa_awal: result.diagnosa_klinis,
                keterangan_klinis: result.informasi_tambahan || "-",
                kodeRS: "E29",
                pasien: {
                    no_rm: result.no_rkm_medis,
                    nama: result.nm_pasien,
                    jenis_kelamin: result.jk,
                    alamat: result.alamat || "-",
                    tanggal_lahir: result.tgl_lahir ? result.tgl_lahir.toISOString().split('T')[0] : "-",
                    no_telphone: result.no_tlp || "-",
                    nik: result.no_ktp || "-",
                    ras: "Hitam/Putih",
                    berat_badan: "-",
                    jenis_registrasi: result.status === 'ralan' ? "Reguler" : "Cito",
                    m_provinsi_id: result.propinsipj || "Jawa Timur",
                    m_kabupaten_id: result.kabupatenpj || "Mojokerto",
                    m_kecamatan_id: result.kecamatanpj || "-"
                },
                dokter_pengirim: {
                    nama: result.nm_dokter || "-",
                    kode: result.dokter_perujuk
                },
                unit_asal: {
                    nama: result.nm_poli || "IGD",
                    kode: result.kd_poli || "0301"
                },
                pemeriksaan: allPemeriksaan,
                penjamin: {
                    nama: result.png_jawab || "UMUM",
                    kode: result.kd_pj || "0001"
                },
                icdt: diagnosaResults.length > 0 ? diagnosaResults.map(diagnosa => ({
                    nama: diagnosa.nm_penyakit || "null",
                    kode: diagnosa.kd_penyakit || "null"
                })) : []
            };

            response.payload.push(registrationData);
        }

        return response;

    } catch (error) {
        return {
            success: false,
            message: `Database error: ${error.message}`,
            payload: []
        };
    } finally {
        await closeDbConnection(conn);
    }
}

module.exports = {
    searchPatientRegistration
};
