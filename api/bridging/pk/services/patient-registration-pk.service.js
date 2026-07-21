/**
 * Patient Registration PK Service
 * Business logic for patient registration (PK)
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const patientRepository = require('../repositories/patient-pk.repository');

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
            // Get selected pemeriksaan (only template_laboratorium that are actually selected/requested)
            let selectedPemeriksaan = await patientRepository.getSelectedPemeriksaan(conn, result.noorder);

            // Some Khanza installations only store requested actions in
            // permintaan_pemeriksaan_lab without rows in the detail table.
            if (selectedPemeriksaan.length === 0) {
                const requestedTindakan = await patientRepository.getRequestedTindakan(conn, result.noorder);
                const fallbackPemeriksaan = await Promise.all(
                    requestedTindakan.map(tindakan => (
                        patientRepository.getPemeriksaanByTindakan(conn, tindakan.kd_jenis_prw)
                    ))
                );
                selectedPemeriksaan = fallbackPemeriksaan.flat();
            }

            // Format pemeriksaan list (deduplicate by name to avoid duplicates)
            const allPemeriksaan = [];
            const pemeriksaanSet = new Set(); // Track unique pemeriksaan by name to avoid duplicates
            
            selectedPemeriksaan.forEach(pemeriksaan => {
                // Normalize nama_pemeriksaan for comparison (trim and lowercase)
                const namaNormalized = (pemeriksaan.nama_pemeriksaan || "-").trim().toLowerCase();
                
                // Only add if nama_pemeriksaan not already exists (deduplicate by name)
                if (!pemeriksaanSet.has(namaNormalized)) {
                    pemeriksaanSet.add(namaNormalized);
                    allPemeriksaan.push({
                        nama_pemeriksaan: pemeriksaan.nama_pemeriksaan || "-",
                        kode_pemeriksaan: pemeriksaan.kode_pemeriksaan || "-"
                    });
                }
            });

            // Get diagnosa
            const diagnosaResults = await patientRepository.getDiagnosa(conn, result.no_rawat);

            // Determine dokter pengirim (prioritize dokter_perujuk)
            const dokterPengirim = {
                nama: result.nm_dokter_perujuk || result.nm_dokter || "-",
                kode: result.dokter_perujuk || result.kd_dokter || "-"
            };

            // Determine unit asal based on timing
            // If order was created BEFORE patient admission to ranap, use poli
            // If order was created AFTER patient admission to ranap, use bangsal
            let unitAsal = {
                nama: result.nm_poli || "IGD",
                kode: result.kd_poli || "0301"
            };

            // Check if patient has ranap data and order time
            if (result.nm_bangsal && result.tgl_masuk_ranap && result.jam_masuk_ranap) {
                try {
                    // Construct datetime strings for comparison
                    const orderDateTime = new Date(`${result.tgl_permintaan.toISOString().split('T')[0]} ${result.jam_permintaan}`);
                    const ranapDateTime = new Date(`${result.tgl_masuk_ranap.toISOString().split('T')[0]} ${result.jam_masuk_ranap}`);

                    // If order was created AFTER ranap admission, use bangsal
                    if (orderDateTime >= ranapDateTime) {
                        unitAsal = {
                            nama: result.nm_bangsal,
                            kode: result.kd_bangsal
                        };
                    }
                } catch (error) {
                    // If datetime comparison fails, fallback to poli
                    console.error('Error comparing datetime:', error);
                }
            }

            // Format registration data
            const registrationData = {
                no_registrasi: result.noorder,
                waktu_registrasi: result.waktu_registrasi_formatted,
                diagnosa_awal: result.diagnosa_klinis,
                keterangan_klinis: result.informasi_tambahan || "-",
                kodeRS: process.env.KODE_RS || 'N02',
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
                icdt: diagnosaResults.length > 0
                    ? { nama: diagnosaResults[0].nm_penyakit || "-", kode: diagnosaResults[0].kd_penyakit || "-" }
                    : { nama: "-", kode: "-" }
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
