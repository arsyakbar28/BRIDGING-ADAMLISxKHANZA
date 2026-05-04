/**
 * Patient Registration PA Service
 * Business logic for patient registration (PA)
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const patientRepository = require('../repositories/patient-pa.repository');

function formatDateLocal(date) {
    if (!date) return '-';
    if (typeof date === 'string') return date.slice(0, 10);
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function valueOrDash(value) {
    return value === null || value === undefined || value === '' ? '-' : value;
}

function getJenisRegistrasi(status) {
    return String(status || '').toLowerCase() === 'cito' ? 'cito' : 'reguler';
}

async function searchPatientRegistration(noorder, limit = 10) {
    const conn = await getDbConnection();

    try {
        const results = await patientRepository.searchPatientByNoorder(conn, noorder, limit);

        if (results.length === 0) {
            return {
                success: false,
                message: noorder && noorder.trim() !== ''
                    ? `No registration data found for: ${noorder}`
                    : 'No registration data found',
                payload: []
            };
        }

        const payload = [];

        for (const result of results) {
            const diagnosaResults = await patientRepository.getDiagnosa(conn, result.no_rawat);
            const tindakanResults = await patientRepository.getTindakan(conn, result.noorder);
            const tindakan = tindakanResults[0] || {};

            const dokterPengirim = {
                kode: valueOrDash(result.dokter_perujuk || result.kd_dokter),
                nama: valueOrDash(result.nm_dokter_perujuk || result.nm_dokter)
            };

            let unitAsal = {
                kode: valueOrDash(result.kd_poli || '0301'),
                nama: valueOrDash(result.nm_poli || 'IGD')
            };

            if (result.nm_bangsal && result.tgl_masuk_ranap && result.jam_masuk_ranap) {
                try {
                    const orderDate = formatDateLocal(result.tgl_permintaan);
                    const ranapDate = formatDateLocal(result.tgl_masuk_ranap);
                    const orderDateTime = new Date(`${orderDate} ${result.jam_permintaan}`);
                    const ranapDateTime = new Date(`${ranapDate} ${result.jam_masuk_ranap}`);

                    if (orderDateTime >= ranapDateTime) {
                        unitAsal = {
                            kode: valueOrDash(result.kd_bangsal),
                            nama: valueOrDash(result.nm_bangsal)
                        };
                    }
                } catch (error) {
                    console.error('Error comparing datetime:', error);
                }
            }

            payload.push({
                registrasi: {
                    no_reg_rs: result.noorder,
                    diagnosa_awal: valueOrDash(result.diagnosa_klinis),
                    keterangan_klinis: valueOrDash(result.informasi_tambahan),
                    organ: 'no field',
                    lokalisasi: valueOrDash(result.lokasi_jaringan),
                    bahan: 'no field',
                    jenis_registrasi: getJenisRegistrasi(result.status),
                    kode_rs: process.env.KODE_RS || 'N02'
                },
                pasien: {
                    no_rm: valueOrDash(result.no_rkm_medis),
                    nama: valueOrDash(result.nm_pasien),
                    tanggal_lahir: formatDateLocal(result.tgl_lahir),
                    jenis_identitas: result.no_ktp ? 'KTP' : 'Lainnya',
                    no_identitas: valueOrDash(result.no_ktp),
                    jenis_kelamin: valueOrDash(result.jk),
                    no_telphone: valueOrDash(result.no_tlp),
                    alamat: valueOrDash(result.alamat),
                    m_provinsi_id: valueOrDash(result.propinsipj || 'Jawa Timur'),
                    m_kabupaten_id: valueOrDash(result.kabupatenpj || 'Mojokerto'),
                    m_kecamatan_id: valueOrDash(result.kecamatanpj)
                },
                dokter_pengirim: dokterPengirim,
                unit_asal: unitAsal,
                penjamin: {
                    kode: valueOrDash(result.kd_pj || '0001'),
                    nama: valueOrDash(result.png_jawab || 'UMUM')
                },
                icdt: {
                    kode: diagnosaResults.length > 0 ? valueOrDash(diagnosaResults[0].kd_penyakit) : '-'
                },
                tindakan: {
                    kode_tindakan: valueOrDash(tindakan.kode_tindakan),
                    nama_tindakan: valueOrDash(tindakan.nama_tindakan)
                }
            });
        }

        return {
            success: true,
            message: 'Registrasi Pasien - Patologi Anatomi berhasil ditampilkan',
            payload
        };
    } catch (error) {
        console.error('❌ [PA] Service Error:', error);
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
