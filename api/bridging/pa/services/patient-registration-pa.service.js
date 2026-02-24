/**
 * Patient Registration PA Service
 * Business logic for patient registration (PA - Patologi Anatomi)
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const patientRepository = require('../repositories/patient-pa.repository');

/**
 * Format date to local date string (YYYY-MM-DD) without timezone conversion
 * @param {Date} date - Date object
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
function formatDateLocal(date) {
    if (!date) return null;
    
    // If already a Date object, use it directly
    const d = date instanceof Date ? date : new Date(date);
    
    // Get local date components (not UTC)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Search patient registration by noorder
 * @param {string} noorder - Order number (partial or complete)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Object>} Service response
 */
async function searchPatientRegistration(noorder, limit = 10) {
    const conn = await getDbConnection();
    
    try {
        // Get patient data
        const results = await patientRepository.searchPatientByNoorder(conn, noorder, limit);

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
        const payload = [];

        for (const result of results) {
            // Get requested pemeriksaan (for PA, this might be jenis perawatan only)
            const requestedPemeriksaan = await patientRepository.getRequestedPemeriksaan(conn, result.noorder);

            // Format pemeriksaan list
            const allPemeriksaan = requestedPemeriksaan.map(p => ({
                nama_pemeriksaan: p.nama_pemeriksaan || "-",
                kode_pemeriksaan: p.kode_pemeriksaan || "-"
            }));

            // Get diagnosa
            const diagnosaResults = await patientRepository.getDiagnosa(conn, result.no_rawat);

            // Determine dokter pengirim (prioritize dokter_perujuk)
            const dokterPengirim = {
                nama: result.nm_dokter_perujuk || result.nm_dokter || "-",
                kode: result.dokter_perujuk || result.kd_dokter || "-"
            };

            // Determine unit asal based on timing
            let unitAsal = {
                nama: result.nm_poli || "IGD",
                kode: result.kd_poli || "0301"
            };

            // Check if patient has ranap data and order time
            if (result.nm_bangsal && result.tgl_masuk_ranap && result.jam_masuk_ranap) {
                try {
                    const orderDateTime = new Date(`${result.tgl_permintaan.toISOString().split('T')[0]} ${result.jam_permintaan}`);
                    const ranapDateTime = new Date(`${result.tgl_masuk_ranap.toISOString().split('T')[0]} ${result.jam_masuk_ranap}`);

                    if (orderDateTime >= ranapDateTime) {
                        unitAsal = {
                            nama: result.nm_bangsal,
                            kode: result.kd_bangsal
                        };
                    }
                } catch (error) {
                    console.error('Error comparing datetime:', error);
                }
            }

            // Build PA-specific fields
            const paSpecific = {
                pengambilan_bahan: result.pengambilan_bahan ? formatDateLocal(result.pengambilan_bahan) : "-",
                diperoleh_dengan: result.diperoleh_dengan || "-",
                lokasi_jaringan: result.lokasi_jaringan || "-",
                diawetkan_dengan: result.diawetkan_dengan || "-"
            };

            // Add previous PA info if exists
            if (result.pernah_dilakukan_di || result.nomor_pa_sebelumnya) {
                paSpecific.pa_sebelumnya = {
                    pernah_dilakukan_di: result.pernah_dilakukan_di || "-",
                    tanggal: result.tanggal_pa_sebelumnya ? formatDateLocal(result.tanggal_pa_sebelumnya) : "-",
                    nomor: result.nomor_pa_sebelumnya || "-",
                    diagnosa: result.diagnosa_pa_sebelumnya || "-"
                };
            }

            // Format registration data
            const registrationData = {
                no_registrasi: result.noorder,
                waktu_registrasi: result.waktu_registrasi_formatted,
                diagnosa_awal: result.diagnosa_klinis,
                keterangan_klinis: result.informasi_tambahan || "-",
                kodeRS: "N02",
                pasien: {
                    no_rm: result.no_rkm_medis,
                    nama: result.nm_pasien,
                    jenis_kelamin: result.jk,
                    alamat: result.alamat || "-",
                    tanggal_lahir: result.tgl_lahir ? formatDateLocal(result.tgl_lahir) : "-",
                    no_telphone: result.no_tlp || "-",
                    nik: result.no_ktp || "-",
                    ras: "Hitam/Putih",
                    berat_badan: "-",
                    jenis_registrasi: "Reguler",
                    m_provinsi_id: result.propinsipj || "Jawa Timur",
                    m_kabupaten_id: result.kabupatenpj || "Mojokerto",
                    m_kecamatan_id: result.kecamatanpj || "-"
                },
                dokter_pengirim: dokterPengirim,
                unit_asal: unitAsal,
                pemeriksaan: allPemeriksaan,
                penjamin: {
                    nama: result.png_jawab || "UMUM",
                    kode: result.kd_pj || "0001"
                },
                icdt: diagnosaResults.length > 0 ? diagnosaResults.map(diagnosa => ({
                    nama: diagnosa.nm_penyakit || "null",
                    kode: diagnosa.kd_penyakit || "null"
                })) : [],
                pa_specific: paSpecific
            };

            payload.push(registrationData);
        }

        return {
            success: true,
            message: noorder && noorder.trim() !== '' 
                ? `Found ${results.length} registration records for search: ${noorder}`
                : `Found ${results.length} latest registration records`,
            payload
        };

    } catch (error) {
        console.error('❌ Service Error:', error);
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
