/**
 * PA Bridging Service
 * Implements Patologi Anatomi payload shapes from Adam LIS PA bridging spec.
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const paRepository = require('../repositories/pa.repository');
const labRegistrationRepository = require('../../shared/repositories/lab-registration.repository');
const statusMapper = require('../../shared/helpers/status-mapper.helper');
const { normalizeStringForDb } = require('../../shared/helpers/db-string.helper');

function limitText(value, maxLength, fallback = '-') {
    const normalized = normalizeStringForDb(value ?? fallback);
    return normalized.slice(0, maxLength);
}

function formatDateLocal(value) {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);

    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTimeLocal(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '00:00:00';

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

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

function isValidResultDate(date, time) {
    return date && date !== '0000-00-00' && time && time !== '00:00:00';
}

function getPaLocation(registrasi = {}) {
    const lokasi = registrasi.lokasi || {};
    const organ = lokasi.organ || registrasi.organ || registrasi.lokasi_jaringan || '-';
    const lokalisasi = lokasi.lokasi || registrasi.lokalisasi || registrasi.lokasi_jaringan || organ;
    return {
        organ: limitText(organ, 40),
        lokalisasi: limitText(lokalisasi, 40)
    };
}

function mapRegistrationStatus(statusLanjut) {
    return String(statusLanjut).toLowerCase() === 'ranap' ? 'ranap' : 'ralan';
}

function buildPaRegistrationPayload(result, pemeriksaanRows, diagnosaRows) {
    const tindakan = pemeriksaanRows[0] || {};
    const firstDiagnosa = diagnosaRows[0] || {};

    return {
        registrasi: {
            no_reg_rs: result.noorder,
            diagnosa_awal: result.diagnosa_klinis || '-',
            keterangan_klinis: result.informasi_tambahan || '-',
            organ: result.lokasi_jaringan || '-',
            lokalisasi: result.lokasi_jaringan || '-',
            bahan: result.diperoleh_dengan || '-',
            jenis_registrasi: 'reguler',
            kode_rs: 'N02'
        },
        pasien: {
            no_rm: result.no_rkm_medis,
            nama: result.nm_pasien,
            tanggal_lahir: result.tgl_lahir ? formatDateLocal(result.tgl_lahir) : '-',
            jenis_identitas: 'KTP',
            no_identitas: result.no_ktp || '-',
            jenis_kelamin: result.jk,
            no_telphone: result.no_tlp || '-',
            alamat: result.alamat || '-',
            m_provinsi_id: result.propinsipj || 'Jawa Timur',
            m_kabupaten_id: result.kabupatenpj || 'Mojokerto',
            m_kecamatan_id: result.kecamatanpj || '-'
        },
        dokter_pengirim: {
            kode: result.dokter_perujuk || result.kd_dokter || '-',
            nama: result.nm_dokter_perujuk || result.nm_dokter || '-'
        },
        unit_asal: {
            kode: result.kd_bangsal || result.kd_poli || '0301',
            nama: result.nm_bangsal || result.nm_poli || 'IGD'
        },
        penjamin: {
            kode: result.kd_pj || '0001',
            nama: result.png_jawab || 'UMUM'
        },
        icdt: {
            kode: firstDiagnosa.kd_penyakit || '-'
        },
        tindakan: {
            kode_tindakan: tindakan.kd_jenis_prw || tindakan.kode_pemeriksaan || '-',
            nama_tindakan: tindakan.nm_perawatan || tindakan.nama_pemeriksaan || '-'
        }
    };
}

function extractPaResultFields(hasilPemeriksaan = {}) {
    const result = {
        makroskopik: '',
        mikroskopik: '',
        kesimpulan: '',
        kesan: ''
    };

    const pemeriksaan = Array.isArray(hasilPemeriksaan.pemeriksaan) ? hasilPemeriksaan.pemeriksaan : [];

    pemeriksaan.forEach((item) => {
        const nama = String(item.nama || item.kode || '').toLowerCase();
        const hasil = item.hasil ?? '';

        if (nama.includes('makro')) {
            result.makroskopik = hasil;
        } else if (nama.includes('mikro')) {
            result.mikroskopik = hasil;
        } else if (nama.includes('simpul')) {
            result.kesimpulan = hasil;
        } else if (nama.includes('saran') || nama.includes('kesan')) {
            result.kesan = hasil;
        }
    });

    return {
        makroskopik: limitText(result.makroskopik, 1024, ''),
        mikroskopik: limitText(result.mikroskopik, 1024, ''),
        kesimpulan: limitText(result.kesimpulan, 300, ''),
        kesan: limitText(result.kesan, 300, '')
    };
}

function extractPaImageName(hasilPemeriksaan = {}) {
    const images = Array.isArray(hasilPemeriksaan.image_hasil) ? hasilPemeriksaan.image_hasil : [];
    if (images.length === 0) return '';

    const image = images[0];
    return limitText(image.nama || image.deskripsi || '', 500, '');
}

async function getRegistrationByNoRegRs(noRegRs) {
    const conn = await getDbConnection();

    try {
        const results = await labRegistrationRepository.searchRegistration(conn, 'pa', noRegRs, 10);
        const exactResult = results.find((item) => item.noorder === noRegRs);

        if (!exactResult) {
            return {
                statusCode: 404,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Patologi Anatomi tidak ditemukan',
                    errors: [{ type: 'not found', message: 'Data tidak ditemukan' }]
                }
            };
        }

        const pemeriksaanRows = await labRegistrationRepository.getSelectedPemeriksaan(conn, 'pa', exactResult.noorder);
        const diagnosaRows = await labRegistrationRepository.getDiagnosa(conn, exactResult.no_rawat);

        return {
            statusCode: 200,
            body: {
                success: true,
                message: 'Registrasi Pasien - Patologi Anatomi berhasil ditampilkan',
                payload: [buildPaRegistrationPayload(exactResult, pemeriksaanRows, diagnosaRows)]
            }
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: {
                success: false,
                message: `Database error: ${error.message}`,
                errors: []
            }
        };
    } finally {
        await closeDbConnection(conn);
    }
}

async function createRegistrationFromSpec(body) {
    const conn = await getDbConnection();

    try {
        const registrasi = body.registrasi || {};
        const pasien = body.pasien || {};
        const dokterPengirim = body.dokter_pengirim || {};
        const tindakan = body.tindakan || {};

        const errors = [];
        if (!registrasi.no_reg_rs) errors.push({ field: 'registrasi.no_reg_rs', message: 'no_reg_rs tidak boleh kosong' });
        if (!pasien.no_rm) errors.push({ field: 'pasien.no_rm', message: 'no_rm tidak boleh kosong' });
        if (!dokterPengirim.kode) errors.push({ field: 'dokter_pengirim.kode', message: 'kode dokter pengirim tidak boleh kosong' });
        if (!tindakan.kode_tindakan) errors.push({ field: 'tindakan.kode_tindakan', message: 'kode_tindakan tidak boleh kosong' });

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Patologi Anatomi gagal dikirim',
                    errors
                }
            };
        }

        const regPeriksa = registrasi.no_rawat
            ? { no_rawat: registrasi.no_rawat, status_lanjut: registrasi.status_lanjut || 'Ralan' }
            : await paRepository.findLatestRegistrationByMedicalRecord(conn, pasien.no_rm);
        if (!regPeriksa) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Patologi Anatomi gagal dikirim',
                    errors: [{ field: 'pasien.no_rm', message: 'Data reg_periksa untuk no_rm tidak ditemukan' }]
                }
            };
        }

        const dokterExists = await paRepository.validateDoctor(conn, dokterPengirim.kode);
        if (!dokterExists) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Patologi Anatomi gagal dikirim',
                    errors: [{ field: 'dokter_pengirim.kode', message: 'Kode dokter tidak ditemukan di SIMRS' }]
                }
            };
        }

        const tindakanData = await paRepository.validatePaTindakan(conn, tindakan.kode_tindakan);
        if (!tindakanData) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Patologi Anatomi gagal dikirim',
                    errors: [{ field: 'tindakan.kode_tindakan', message: 'Kode tindakan PA tidak ditemukan di SIMRS' }]
                }
            };
        }

        const now = getCurrentDateTime();
        const lokasi = getPaLocation(registrasi);

        await conn.beginTransaction();
        await paRepository.createRegistration(conn, {
            noorder: registrasi.no_reg_rs,
            no_rawat: regPeriksa.no_rawat,
            tgl_permintaan: now.date,
            jam_permintaan: now.time,
            tgl_sampel: now.date,
            jam_sampel: now.time,
            tgl_hasil: '0000-00-00',
            jam_hasil: '00:00:00',
            dokter_perujuk: dokterPengirim.kode,
            status: mapRegistrationStatus(regPeriksa.status_lanjut),
            informasi_tambahan: limitText(registrasi.keterangan_klinis, 60),
            diagnosa_klinis: limitText(registrasi.diagnosa_awal, 80),
            pengambilan_bahan: null,
            diperoleh_dengan: limitText(registrasi.bahan, 40),
            lokasi_jaringan: lokasi.lokalisasi,
            diawetkan_dengan: '-',
            pernah_dilakukan_di: '-',
            tanggal_pa_sebelumnya: null,
            nomor_pa_sebelumnya: '-',
            diagnosa_pa_sebelumnya: '-'
        });
        await paRepository.createRegistrationTindakan(conn, registrasi.no_reg_rs, tindakan.kode_tindakan);
        await conn.commit();

        return {
            statusCode: 201,
            body: {
                success: true,
                message: 'Registrasi Pasien - Patologi Anatomi berhasil dikirim',
                payload: {
                    no_lab: registrasi.no_reg_rs,
                    no_reg_rs: registrasi.no_reg_rs
                }
            }
        };
    } catch (error) {
        try {
            await conn.rollback();
        } catch (_) {}

        return {
            statusCode: 400,
            body: {
                success: false,
                message: 'Registrasi Pasien - Patologi Anatomi gagal dikirim',
                errors: [{ field: 'database', message: error.message }]
            }
        };
    } finally {
        await closeDbConnection(conn);
    }
}

async function saveArchiveFromSpec(body, mode = 'create') {
    const conn = await getDbConnection();

    try {
        const noRegistrasi = body.no_registrasi;
        const hasilPemeriksaan = body.hasil_pemeriksaan || {};

        if (!noRegistrasi) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: mode === 'update'
                        ? 'Hasil Pasien - Patologi Anatomi gagal diupdate'
                        : 'Hasil Pasien - Patologi Anatomi gagal dikirim',
                    errors: [{ field: 'no_registrasi', message: 'no_registrasi tidak boleh kosong' }]
                }
            };
        }

        const requestInfo = await paRepository.getPaRequestInfo(conn, noRegistrasi);
        if (!requestInfo) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: mode === 'update'
                        ? 'Hasil Pasien - Patologi Anatomi gagal diupdate'
                        : 'Hasil Pasien - Patologi Anatomi gagal dikirim',
                    errors: [{ field: 'no_registrasi', message: 'Registrasi PA tidak ditemukan di SIMRS' }]
                }
            };
        }

        const kdJenisPrw = hasilPemeriksaan.kode_tindakan_simrs || requestInfo.kd_jenis_prw;
        if (!kdJenisPrw) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: mode === 'update'
                        ? 'Hasil Pasien - Patologi Anatomi gagal diupdate'
                        : 'Hasil Pasien - Patologi Anatomi gagal dikirim',
                    errors: [{ field: 'hasil_pemeriksaan.kode_tindakan_simrs', message: 'kode_tindakan_simrs tidak boleh kosong' }]
                }
            };
        }

        const tarifData = await paRepository.getTarifData(conn, kdJenisPrw);
        if (!tarifData) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: mode === 'update'
                        ? 'Hasil Pasien - Patologi Anatomi gagal diupdate'
                        : 'Hasil Pasien - Patologi Anatomi gagal dikirim',
                    errors: [{ field: 'hasil_pemeriksaan.kode_tindakan_simrs', message: 'Kode tindakan PA tidak ditemukan di SIMRS' }]
                }
            };
        }

        const existingDate = formatDateLocal(requestInfo.tgl_hasil);
        const existingTime = requestInfo.jam_hasil;
        const resultDateTime = isValidResultDate(existingDate, existingTime)
            ? { date: existingDate, time: existingTime }
            : getCurrentDateTime();
        const paFields = extractPaResultFields(hasilPemeriksaan);
        const imageName = extractPaImageName(hasilPemeriksaan);
        const petugasNip = process.env.DEFAULT_LAB_PETUGAS_NIP || '-';

        await conn.beginTransaction();
        await paRepository.upsertPeriksaLab(conn, {
            no_rawat: requestInfo.no_rawat,
            nip: petugasNip,
            kd_jenis_prw: kdJenisPrw,
            tgl_periksa: resultDateTime.date,
            jam: resultDateTime.time,
            dokter_perujuk: requestInfo.dokter_perujuk,
            bagian_rs: parseFloat(tarifData.bagian_rs) || 0,
            bhp: parseFloat(tarifData.bhp) || 0,
            tarif_perujuk: parseFloat(tarifData.tarif_perujuk) || 0,
            tarif_tindakan_dokter: parseFloat(tarifData.tarif_tindakan_dokter) || 0,
            tarif_tindakan_petugas: parseFloat(tarifData.tarif_tindakan_petugas) || 0,
            kso: parseFloat(tarifData.kso) || 0,
            menejemen: parseFloat(tarifData.menejemen) || 0,
            biaya: parseFloat(tarifData.total_byr) || 0,
            kd_dokter: requestInfo.dokter_perujuk,
            status: statusMapper.getPeriksaLabStatus(requestInfo.status)
        });

        await paRepository.upsertDetailPeriksaLabPa(conn, {
            no_rawat: requestInfo.no_rawat,
            kd_jenis_prw: kdJenisPrw,
            tgl_periksa: resultDateTime.date,
            jam: resultDateTime.time,
            diagnosa_klinik: limitText(body.keterangan_hasil || requestInfo.diagnosa_klinis, 50),
            ...paFields
        });

        await paRepository.replacePaImage(conn, {
            no_rawat: requestInfo.no_rawat,
            kd_jenis_prw: kdJenisPrw,
            tgl_periksa: resultDateTime.date,
            jam: resultDateTime.time,
            photo: imageName
        });

        await paRepository.updatePaRequestResultTime(conn, noRegistrasi, resultDateTime.date, resultDateTime.time);
        await conn.commit();

        const noLab = body.no_lab || noRegistrasi;
        return {
            statusCode: mode === 'update' ? 200 : 201,
            body: {
                success: true,
                message: mode === 'update'
                    ? `Hasil Pasien (${noLab}) - Patologi Anatomi berhasil diupdate`
                    : 'Hasil Pasien - Patologi Anatomi berhasil dikirim',
                payload: mode === 'update'
                    ? {
                        no_registrasi: noRegistrasi,
                        no_lab: noLab,
                        keterangan_hasil: body.keterangan_hasil || '-',
                        kode_rs: body.kode_rs || 'N02',
                        kode_lab: body.kode_lab || '-',
                        pasien: body.pasien || {},
                        hasil_pemeriksaan: hasilPemeriksaan
                    }
                    : { no_lab: noLab }
            }
        };
    } catch (error) {
        try {
            await conn.rollback();
        } catch (_) {}

        return {
            statusCode: 400,
            body: {
                success: false,
                message: mode === 'update'
                    ? `Hasil Pasien (${body.no_lab || body.no_registrasi || '-'}) - Patologi Anatomi gagal diupdate`
                    : 'Hasil Pasien - Patologi Anatomi gagal dikirim',
                errors: [{ field: 'database', message: error.message }]
            }
        };
    } finally {
        await closeDbConnection(conn);
    }
}

module.exports = {
    getRegistrationByNoRegRs,
    createRegistrationFromSpec,
    saveArchiveFromSpec
};
