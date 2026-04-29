/**
 * Shared Lab Registration Service
 * Business logic for MB and PA patient registration/order lookup.
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const labRegistrationRepository = require('../repositories/lab-registration.repository');

function formatDateLocal(value) {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);

    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toDateTime(dateValue, timeValue) {
    const date = formatDateLocal(dateValue);
    if (!date || !timeValue) return null;
    const value = new Date(`${date} ${timeValue}`);
    return isNaN(value.getTime()) ? null : value;
}

function getUnitAsal(result) {
    let unitAsal = {
        nama: result.nm_poli || 'IGD',
        kode: result.kd_poli || '0301'
    };

    if (result.nm_bangsal && result.tgl_masuk_ranap && result.jam_masuk_ranap) {
        const orderDateTime = toDateTime(result.tgl_permintaan, result.jam_permintaan);
        const ranapDateTime = toDateTime(result.tgl_masuk_ranap, result.jam_masuk_ranap);

        if (orderDateTime && ranapDateTime && orderDateTime >= ranapDateTime) {
            unitAsal = {
                nama: result.nm_bangsal,
                kode: result.kd_bangsal
            };
        }
    }

    return unitAsal;
}

function formatPemeriksaan(pemeriksaanRows) {
    const allPemeriksaan = [];
    const pemeriksaanSet = new Set();

    pemeriksaanRows.forEach((pemeriksaan) => {
        const nama = pemeriksaan.nama_pemeriksaan || pemeriksaan.nm_perawatan || '-';
        const namaNormalized = nama.trim().toLowerCase();

        if (!pemeriksaanSet.has(namaNormalized)) {
            pemeriksaanSet.add(namaNormalized);
            allPemeriksaan.push({
                nama_pemeriksaan: nama,
                kode_pemeriksaan: pemeriksaan.kode_pemeriksaan || pemeriksaan.kd_jenis_prw || '-',
                kode_tindakan: pemeriksaan.kd_jenis_prw || pemeriksaan.kode_pemeriksaan || '-',
                nama_tindakan: pemeriksaan.nm_perawatan || nama
            });
        }
    });

    return allPemeriksaan;
}

function formatPaMetadata(result) {
    return {
        pengambilan_bahan: result.pengambilan_bahan ? formatDateLocal(result.pengambilan_bahan) : null,
        diperoleh_dengan: result.diperoleh_dengan || '-',
        lokasi_jaringan: result.lokasi_jaringan || '-',
        diawetkan_dengan: result.diawetkan_dengan || '-',
        pernah_dilakukan_di: result.pernah_dilakukan_di || '-',
        tanggal_pa_sebelumnya: result.tanggal_pa_sebelumnya ? formatDateLocal(result.tanggal_pa_sebelumnya) : null,
        nomor_pa_sebelumnya: result.nomor_pa_sebelumnya || '-',
        diagnosa_pa_sebelumnya: result.diagnosa_pa_sebelumnya || '-'
    };
}

async function searchLabRegistration(labType, noorder, limit = 10) {
    const conn = await getDbConnection();
    const labTypeUpper = String(labType).toUpperCase();

    try {
        const results = await labRegistrationRepository.searchRegistration(conn, labType, noorder, limit);

        if (results.length === 0) {
            return {
                success: false,
                message: noorder && noorder.trim() !== ''
                    ? `No ${labTypeUpper} registration data found for: ${noorder}`
                    : `No ${labTypeUpper} registration data found`,
                payload: []
            };
        }

        const payload = [];

        for (const result of results) {
            const selectedPemeriksaan = await labRegistrationRepository.getSelectedPemeriksaan(conn, labType, result.noorder);
            const diagnosaResults = await labRegistrationRepository.getDiagnosa(conn, result.no_rawat);

            const registrationData = {
                jenis_laboratorium: labTypeUpper,
                no_registrasi: result.noorder,
                waktu_registrasi: result.waktu_registrasi_formatted,
                diagnosa_awal: result.diagnosa_klinis,
                keterangan_klinis: result.informasi_tambahan || '-',
                kodeRS: 'N02',
                pasien: {
                    no_rm: result.no_rkm_medis,
                    nama: result.nm_pasien,
                    jenis_kelamin: result.jk,
                    alamat: result.alamat || '-',
                    tanggal_lahir: result.tgl_lahir ? formatDateLocal(result.tgl_lahir) : '-',
                    no_telphone: result.no_tlp || '-',
                    nik: result.no_ktp || '-',
                    ras: 'Hitam/Putih',
                    berat_badan: '-',
                    jenis_registrasi: 'Reguler',
                    m_provinsi_id: result.propinsipj || 'Jawa Timur',
                    m_kabupaten_id: result.kabupatenpj || 'Mojokerto',
                    m_kecamatan_id: result.kecamatanpj || '-'
                },
                dokter_pengirim: {
                    nama: result.nm_dokter_perujuk || result.nm_dokter || '-',
                    kode: result.dokter_perujuk || result.kd_dokter || '-'
                },
                unit_asal: getUnitAsal(result),
                pemeriksaan: formatPemeriksaan(selectedPemeriksaan),
                penjamin: {
                    nama: result.png_jawab || 'UMUM',
                    kode: result.kd_pj || '0001'
                },
                icdt: diagnosaResults.length > 0 ? diagnosaResults.map(diagnosa => ({
                    nama: diagnosa.nm_penyakit || 'null',
                    kode: diagnosa.kd_penyakit || 'null'
                })) : []
            };

            if (String(labType).toLowerCase() === 'pa') {
                registrationData.data_pa = formatPaMetadata(result);
            }

            payload.push(registrationData);
        }

        return {
            success: true,
            message: noorder && noorder.trim() !== ''
                ? `Found ${results.length} ${labTypeUpper} registration records for search: ${noorder}`
                : `Found ${results.length} latest ${labTypeUpper} registration records`,
            payload
        };
    } catch (error) {
        console.error(`❌ [${labTypeUpper}] Service Error:`, error);
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
    searchLabRegistration
};
