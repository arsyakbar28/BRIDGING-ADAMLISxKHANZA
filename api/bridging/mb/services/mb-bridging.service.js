/**
 * MB Bridging Service
 * Implements Mikrobiologi payload shapes from Adam LIS MB bridging spec.
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const mbRepository = require('../repositories/mb.repository');
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

function mapRegistrationStatus(statusLanjut) {
    return String(statusLanjut).toLowerCase() === 'ranap' ? 'ranap' : 'ralan';
}

function buildMbRegistrationPayload(result, pemeriksaanRows, diagnosaRows) {
    const tindakanMap = new Map();
    pemeriksaanRows.forEach((row) => {
        const kode = row.kd_jenis_prw || row.kode_pemeriksaan;
        if (!kode || tindakanMap.has(kode)) return;
        tindakanMap.set(kode, {
            kode_tindakan: kode,
            nama_tindakan: row.nm_perawatan || row.nama_pemeriksaan || '-'
        });
    });

    const firstDiagnosa = diagnosaRows[0] || {};

    return {
        registrasi: {
            no_reg_rs: result.noorder,
            keterangan_klinis: result.informasi_tambahan || '-',
            diagnosa_awal: result.diagnosa_klinis || '-',
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
        tindakan: Array.from(tindakanMap.values())
    };
}

function summarizeAntibiotics(antibiotik = []) {
    const items = [];

    antibiotik.forEach((group) => {
        const groupName = group.nama || group.kode || '';
        const list = Array.isArray(group.list_antibiotik) ? group.list_antibiotik : [];
        list.forEach((item) => {
            const pieces = [item.nama_item || item.kode_item || '-'];
            if (item.mic) pieces.push(`MIC ${item.mic}`);
            if (item.interpretasi) pieces.push(item.interpretasi);
            items.push(groupName ? `${groupName}:${pieces.join(' ')}` : pieces.join(' '));
        });
    });

    return items.join('; ');
}

function summarizeMbResultItem(item) {
    const hasil = item.hasil || {};
    const name = item.nama_pemeriksaan_lis || item.kode_pemeriksaan_lis || 'Pemeriksaan';

    if (item.is_bacteria && Array.isArray(hasil.bacteria)) {
        const bacteriaText = hasil.bacteria.map((bacteria) => {
            const antibiotics = summarizeAntibiotics(bacteria.antibiotik || []);
            return antibiotics
                ? `${bacteria.nama_bakteri || '-'} (${antibiotics})`
                : `${bacteria.nama_bakteri || '-'}`;
        }).join('; ');
        return `${name}: ${bacteriaText || '-'}`;
    }

    return `${name}: ${hasil.hasil_pemeriksaan ?? '-'}`;
}

function groupMbResultsByTindakan(pemeriksaan = []) {
    const grouped = new Map();

    pemeriksaan.forEach((item) => {
        const kodeTindakan = item.kode_tindakan_simrs;
        if (!kodeTindakan) return;
        const current = grouped.get(kodeTindakan) || [];
        current.push(item);
        grouped.set(kodeTindakan, current);
    });

    return grouped;
}

async function getRegistrationByNoRegRs(noRegRs) {
    const conn = await getDbConnection();

    try {
        const results = await labRegistrationRepository.searchRegistration(conn, 'mb', noRegRs, 10);
        const exactResult = results.find((item) => item.noorder === noRegRs);

        if (!exactResult) {
            return {
                statusCode: 404,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Mikrobiologi tidak ditemukan',
                    errors: [{ type: 'not found', message: 'Data tidak ditemukan' }]
                }
            };
        }

        const pemeriksaanRows = await labRegistrationRepository.getSelectedPemeriksaan(conn, 'mb', exactResult.noorder);
        const diagnosaRows = await labRegistrationRepository.getDiagnosa(conn, exactResult.no_rawat);

        return {
            statusCode: 200,
            body: {
                success: true,
                message: 'Registrasi Pasien - Mikrobiologi berhasil ditampilkan',
                payload: [buildMbRegistrationPayload(exactResult, pemeriksaanRows, diagnosaRows)]
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
        const tindakan = Array.isArray(body.tindakan) ? body.tindakan : [];

        const errors = [];
        if (!registrasi.no_reg_rs) errors.push({ field: 'registrasi.no_reg_rs', message: 'no_reg_rs tidak boleh kosong' });
        if (registrasi.no_reg_rs && String(registrasi.no_reg_rs).length > 15) errors.push({ field: 'registrasi.no_reg_rs', message: 'no_reg_rs maksimal 15 karakter sesuai kolom noorder SIMRS' });
        if (!pasien.no_rm) errors.push({ field: 'pasien.no_rm', message: 'no_rm tidak boleh kosong' });
        if (!dokterPengirim.kode) errors.push({ field: 'dokter_pengirim.kode', message: 'kode dokter pengirim tidak boleh kosong' });
        if (tindakan.length === 0) errors.push({ field: 'tindakan', message: 'tindakan harus berisi minimal 1 item' });

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Mikrobiologi gagal dikirim',
                    errors
                }
            };
        }

        const regPeriksa = registrasi.no_rawat
            ? { no_rawat: registrasi.no_rawat, status_lanjut: registrasi.status_lanjut || 'Ralan' }
            : await mbRepository.findLatestRegistrationByMedicalRecord(conn, pasien.no_rm);
        if (!regPeriksa) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Mikrobiologi gagal dikirim',
                    errors: [{ field: 'pasien.no_rm', message: 'Data reg_periksa untuk no_rm tidak ditemukan' }]
                }
            };
        }

        const dokterExists = await mbRepository.validateDoctor(conn, dokterPengirim.kode);
        if (!dokterExists) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Mikrobiologi gagal dikirim',
                    errors: [{ field: 'dokter_pengirim.kode', message: 'Kode dokter tidak ditemukan di SIMRS' }]
                }
            };
        }

        const tindakanData = [];
        for (const item of tindakan) {
            const kodeTindakan = item.kode_tindakan;
            if (!kodeTindakan) {
                errors.push({ field: 'tindakan.kode_tindakan', message: 'kode_tindakan tidak boleh kosong' });
                continue;
            }
            const mbTindakan = await mbRepository.getMbTindakan(conn, kodeTindakan);
            if (!mbTindakan) {
                errors.push({ field: 'tindakan.kode_tindakan', message: `Kode tindakan MB tidak ditemukan di SIMRS: ${kodeTindakan}` });
                continue;
            }
            const templates = await mbRepository.getTemplatesByTindakan(conn, kodeTindakan);
            if (templates.length === 0) {
                errors.push({ field: 'tindakan.kode_tindakan', message: `Template laboratorium MB belum tersedia untuk: ${kodeTindakan}` });
                continue;
            }
            tindakanData.push({ tindakan: mbTindakan, templates });
        }

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: 'Registrasi Pasien - Mikrobiologi gagal dikirim',
                    errors
                }
            };
        }

        const now = getCurrentDateTime();

        await conn.beginTransaction();
        await mbRepository.createRegistration(conn, {
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
            diagnosa_klinis: limitText(registrasi.diagnosa_awal, 80)
        });

        for (const item of tindakanData) {
            await mbRepository.createRegistrationTindakan(conn, registrasi.no_reg_rs, item.tindakan.kd_jenis_prw);
            for (const template of item.templates) {
                await mbRepository.createRegistrationTemplate(conn, registrasi.no_reg_rs, item.tindakan.kd_jenis_prw, template.id_template);
            }
        }

        await conn.commit();

        return {
            statusCode: 201,
            body: {
                success: true,
                message: 'Registrasi Pasien - Mikrobiologi berhasil dikirim',
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
                message: 'Registrasi Pasien - Mikrobiologi gagal dikirim',
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
        const pemeriksaan = Array.isArray(body.pemeriksaan) ? body.pemeriksaan : [];

        if (!noRegistrasi) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: mode === 'update'
                        ? `Hasil Pasien (${body.no_lab || '-'}) - Mikrobiologi gagal diupdate`
                        : 'Hasil Pasien - Mikrobiologi gagal dikirim',
                    errors: [{ field: 'no_registrasi', message: 'no_registrasi tidak boleh kosong' }]
                }
            };
        }

        if (pemeriksaan.length === 0) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: mode === 'update'
                        ? `Hasil Pasien (${body.no_lab || noRegistrasi}) - Mikrobiologi gagal diupdate`
                        : 'Hasil Pasien - Mikrobiologi gagal dikirim',
                    errors: [{ field: 'pemeriksaan', message: 'pemeriksaan harus berisi minimal 1 item' }]
                }
            };
        }

        const requestInfo = await mbRepository.getMbRequestInfo(conn, noRegistrasi);
        if (!requestInfo) {
            return {
                statusCode: 400,
                body: {
                    success: false,
                    message: mode === 'update'
                        ? `Hasil Pasien (${body.no_lab || noRegistrasi}) - Mikrobiologi gagal diupdate`
                        : 'Hasil Pasien - Mikrobiologi gagal dikirim',
                    errors: [{ field: 'no_registrasi', message: 'Registrasi MB tidak ditemukan di SIMRS' }]
                }
            };
        }

        const existingDate = formatDateLocal(requestInfo.tgl_hasil);
        const existingTime = requestInfo.jam_hasil;
        const resultDateTime = isValidResultDate(existingDate, existingTime)
            ? { date: existingDate, time: existingTime }
            : getCurrentDateTime();
        const groupedResults = groupMbResultsByTindakan(pemeriksaan);
        const petugasNip = process.env.DEFAULT_LAB_PETUGAS_NIP || '-';

        await conn.beginTransaction();

        for (const [kodeTindakan, items] of groupedResults.entries()) {
            const tindakan = await mbRepository.getMbTindakan(conn, kodeTindakan);
            if (!tindakan) {
                throw new Error(`Kode tindakan MB tidak ditemukan di SIMRS: ${kodeTindakan}`);
            }

            const templates = await mbRepository.getTemplatesByTindakan(conn, kodeTindakan);
            if (templates.length === 0) {
                throw new Error(`Template laboratorium MB belum tersedia untuk: ${kodeTindakan}`);
            }

            await mbRepository.upsertPeriksaLab(conn, {
                no_rawat: requestInfo.no_rawat,
                nip: petugasNip,
                kd_jenis_prw: kodeTindakan,
                tgl_periksa: resultDateTime.date,
                jam: resultDateTime.time,
                dokter_perujuk: requestInfo.dokter_perujuk,
                bagian_rs: parseFloat(tindakan.bagian_rs) || 0,
                bhp: parseFloat(tindakan.bhp) || 0,
                tarif_perujuk: parseFloat(tindakan.tarif_perujuk) || 0,
                tarif_tindakan_dokter: parseFloat(tindakan.tarif_tindakan_dokter) || 0,
                tarif_tindakan_petugas: parseFloat(tindakan.tarif_tindakan_petugas) || 0,
                kso: parseFloat(tindakan.kso) || 0,
                menejemen: parseFloat(tindakan.menejemen) || 0,
                biaya: parseFloat(tindakan.total_byr) || 0,
                kd_dokter: requestInfo.dokter_perujuk,
                status: statusMapper.getPeriksaLabStatus(requestInfo.status)
            });

            const template = templates[0];
            const summary = items.map(summarizeMbResultItem).join(' | ');
            await mbRepository.upsertDetailPeriksaLab(conn, {
                no_rawat: requestInfo.no_rawat,
                kd_jenis_prw: kodeTindakan,
                tgl_periksa: resultDateTime.date,
                jam: resultDateTime.time,
                id_template: template.id_template,
                nilai: limitText(summary, 200, ''),
                nilai_rujukan: limitText('-', 30),
                keterangan: limitText(body.keterangan_hasil || 'MIKROBIOLOGI', 60),
                bagian_rs: parseFloat(template.bagian_rs) || 0,
                bhp: parseFloat(template.bhp) || 0,
                bagian_perujuk: parseFloat(template.bagian_perujuk) || 0,
                bagian_dokter: parseFloat(template.bagian_dokter) || 0,
                bagian_laborat: parseFloat(template.bagian_laborat) || 0,
                kso: parseFloat(template.kso) || 0,
                menejemen: parseFloat(template.menejemen) || 0,
                biaya_item: parseFloat(template.biaya_item) || 0
            });
        }

        await mbRepository.updateMbRequestResultTime(conn, noRegistrasi, resultDateTime.date, resultDateTime.time);
        await conn.commit();

        const noLab = body.no_lab || noRegistrasi;
        return {
            statusCode: mode === 'update' ? 200 : 201,
            body: {
                success: true,
                message: mode === 'update'
                    ? `Hasil Pasien (${noLab}) - Mikrobiologi berhasil diupdate`
                    : 'Hasil Pasien - Mikrobiologi berhasil dikirim',
                payload: mode === 'update'
                    ? {
                        no_registrasi: noRegistrasi,
                        no_lab: noLab,
                        kode_rs: body.kode_rs || 'N02',
                        kode_lab: body.kode_lab || '-',
                        pasien: body.pasien || {},
                        keterangan_hasil: body.keterangan_hasil || '-',
                        pemeriksaan
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
                    ? `Hasil Pasien (${body.no_lab || body.no_registrasi || '-'}) - Mikrobiologi gagal diupdate`
                    : 'Hasil Pasien - Mikrobiologi gagal dikirim',
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
