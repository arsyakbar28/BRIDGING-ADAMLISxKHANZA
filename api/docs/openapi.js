/**
 * OpenAPI specification for Adam LIS Bridging API.
 */

const serverPort = process.env.PORT || 5005;

const standardError = {
    type: 'object',
    properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string' },
        payload: {
            type: 'array',
            items: {}
        },
        errors: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    field: { type: 'string' },
                    type: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        }
    }
};

const createExternalLisServer = (defaultBaseUrl) => ({
    url: '{lisBaseUrl}',
    description: 'External LIS server',
    variables: {
        lisBaseUrl: {
            default: defaultBaseUrl,
            description: 'Base URL LIS eksternal'
        }
    }
});

const pkRegistrationServer = createExternalLisServer('http://192.168.100.111:2311');
const paRegistrationServer = createExternalLisServer('http://192.168.100.111:2312');
const mbRegistrationServer = createExternalLisServer('http://192.168.100.111:2313');

const externalRegistrationDescription = [
    'Endpoint ini berada di server LIS eksternal, bukan route lokal project Bridging Adam LIS x Khanza.',
    'Swagger memakai nilai `lisBaseUrl` dari pilihan server pada endpoint ini, lalu menambahkan path endpoint yang sedang dibuka.',
    'Gunakan metode POST registrasi ini jika integrasi dipilih dengan pola project/SIMRS mengirim registrasi ke API Adam LIS.',
    'Jika integrasi memakai pola Adam LIS menarik data dari project, gunakan endpoint GET registration/order dan jangan gunakan POST registrasi untuk order yang sama.',
    '',
    'Catatan penggunaan:',
    '- Pilih salah satu metode registrasi: GET pull oleh Adam LIS atau POST push ke Adam LIS.',
    '- Pastikan jaringan dari browser/client bisa mengakses alamat LIS.',
    '- Token login lokal project tidak otomatis dipakai untuk endpoint eksternal.',
    '- Jika host LIS berubah, ubah nilai `lisBaseUrl` di dropdown server Swagger sebelum Execute.'
].join('\n');

const openApiSpec = {
    openapi: '3.0.3',
    info: {
    title: 'Sandbox Adam LIS x Khanza Bridging API',
    version: '1.0.0',
    description: [
    ].join(' ')
},
    servers: [
        {
            url: `http://localhost:${serverPort}`,
            description: 'Local sandbox server'
        }
    ],
    tags: [
        {
            name: 'System',
            description: 'Endpoint utilitas untuk memeriksa server lokal dan membuka dokumentasi.'
        },
        {
            name: 'Auth',
            description: 'Login lokal untuk mendapatkan JWT Bearer token. Dipakai oleh endpoint lokal yang membaca/menulis database Khanza.'
        },
        {
            name: 'PK',
            description: [
                'Patologi Klinis bridging.',
                'Registrasi dapat memakai GET pull dari project atau POST push ke LIS eksternal.',
                'Hasil PK dikembalikan dari Adam LIS ke project dengan POST `/adam-lis/bridging/update-hasil`.'
            ].join(' ')
        },
        {
            name: 'MB',
            description: [
                'Mikrobiologi bridging.',
                'Registrasi dapat memakai GET pull dari project atau POST push ke LIS eksternal.',
                'Hasil MB/MK dikembalikan dari Adam LIS ke project dengan POST arsip, lalu revisi memakai PUT arsip.'
            ].join(' ')
        },
        {
            name: 'PA',
            description: [
                'Patologi Anatomi bridging.',
                'Registrasi dapat memakai GET pull dari project atau POST push ke LIS eksternal.',
                'Hasil PA dikembalikan dari Adam LIS ke project dengan POST arsip, lalu revisi memakai PUT arsip.'
            ].join(' ')
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            StandardError: standardError,
            AuthLoginRequest: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string', example: 'admin' },
                    password: { type: 'string', example: 'admin123' }
                }
            },
            AuthLoginResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    payload: {
                        type: 'object',
                        properties: {
                            token: { type: 'string' },
                            tokenType: { type: 'string', example: 'Bearer' },
                            expiresIn: { type: 'string', example: 'never' },
                            expiresAt: { nullable: true },
                            user: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string', example: 'admin' },
                                    role: { type: 'string', example: 'admin' }
                                }
                            }
                        }
                    }
                }
            },
            Patient: {
                type: 'object',
                properties: {
                    no_rm: { type: 'string', example: '000022' },
                    nama: { type: 'string', example: 'RUDI SANTOSO' },
                    jenis_kelamin: { type: 'string', example: 'P' },
                    alamat: { type: 'string', example: 'TES' },
                    tanggal_lahir: { type: 'string', example: '1957-03-11' },
                    no_telphone: { type: 'string', example: '123123213' },
                    nik: { type: 'string', example: '3374135702570001' }
                }
            },
            RegistrationResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    payload: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                jenis_laboratorium: { type: 'string', example: 'PA' },
                                no_registrasi: { type: 'string', example: 'PA202604300001' },
                                waktu_registrasi: { type: 'string', example: '2026-04-30 09:10:00' },
                                diagnosa_awal: { type: 'string', example: 'Benjolan jaringan lunak' },
                                keterangan_klinis: { type: 'string', example: 'Dummy order PA untuk integrasi Adam LIS' },
                                pasien: { $ref: '#/components/schemas/Patient' },
                                dokter_pengirim: {
                                    type: 'object',
                                    properties: {
                                        kode: { type: 'string', example: 'D0000004' },
                                        nama: { type: 'string', example: 'dr. Hilyatul Nadia' }
                                    }
                                },
                                pemeriksaan: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            kode_pemeriksaan: { oneOf: [{ type: 'string' }, { type: 'number' }], example: 3262 },
                                            nama_pemeriksaan: { type: 'string', example: 'Identifikasi Sars Cov2 (Covid-19)' },
                                            kode_tindakan: { type: 'string', example: 'J000108' },
                                            nama_tindakan: { type: 'string', example: 'Pemeriksaan RT-PCR + Swab' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            PkPostRequest: {
                type: 'object',
                required: ['noorder', 'dokter_pj', 'petugas', 'dokter_perujuk', 'tgl_periksa', 'jam_periksa', 'pemeriksaan'],
                properties: {
                    noorder: { type: 'string', example: 'PK202604220001' },
                    dokter_pj: { type: 'string', example: 'D0000004' },
                    petugas: { type: 'string', example: '01010101' },
                    dokter_perujuk: { type: 'string', example: 'D0000004' },
                    tgl_periksa: { type: 'string', format: 'date', example: '2026-04-30' },
                    jam_periksa: { type: 'string', example: '10:30:00' },
                    pemeriksaan: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['kode_pemeriksaan', 'hasil'],
                            properties: {
                                kode_pemeriksaan: {
                                    type: 'integer',
                                    description: 'template_laboratorium.id_template',
                                    example: 1001
                                },
                                hasil: { type: 'string', example: '120' },
                                nilai_rujukan: { type: 'string', example: '< 140' },
                                keterangan: { type: 'string', example: 'N' }
                            }
                        }
                    },
                    kesan: { type: 'string', example: 'Hasil dalam batas normal' },
                    saran: { type: 'string', example: 'Kontrol rutin' }
                }
            },
            PkUpdateHasilRequest: {
                type: 'object',
                required: ['no_registrasi', 'no_laboratorium', 'kode_rs', 'kode_lab', 'pasien', 'pemeriksaan'],
                properties: {
                    no_registrasi: { type: 'string', example: '1027189' },
                    no_laboratorium: { type: 'string', example: 'E04/240814/0066' },
                    kode_rs: { type: 'string', example: 'E04' },
                    kode_lab: { type: 'string', example: 'LAB_Alirsyad' },
                    pasien: {
                        type: 'object',
                        required: ['nama_pasien', 'no_rm', 'jenis_kelamin', 'tanggal_lahir'],
                        properties: {
                            nama_pasien: { type: 'string', example: 'MARDIYAH' },
                            no_rm: { type: 'string', example: '004349' },
                            jenis_kelamin: { type: 'string', example: 'P' },
                            tanggal_lahir: { type: 'string', format: 'date', example: '1980-06-07' },
                            nik: { type: 'string', example: '3527054706801000' },
                            ras: { type: 'string', example: '-' },
                            berat_badan: { type: 'string', example: '-' },
                            jenis_registrasi: { type: 'string', enum: ['reguler', 'cito'], example: 'reguler' }
                        }
                    },
                    pemeriksaan: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['kode_tindakan_simrs', 'kode_pemeriksaan_lis', 'hasil'],
                            properties: {
                                kategori_pemeriksaan: {
                                    type: 'object',
                                    properties: {
                                        nama_kategori: { type: 'string', example: 'KIMIA KLINIK' }
                                    }
                                },
                                sub_kategori_pemeriksaan: {
                                    type: 'object',
                                    properties: {
                                        nama_sub_kategori: { type: 'string', example: 'Faal Ginjal' }
                                    }
                                },
                                status_bridging: { type: 'boolean', example: true },
                                nomor_urut: { type: 'integer', example: 1 },
                                kode_tindakan_simrs: {
                                    type: 'string',
                                    description: 'Kode tindakan dari SIMRS. Pada mapping PK project ini dipakai sebagai kandidat id_template/kode pemeriksaan.',
                                    example: '1156'
                                },
                                nama_pemeriksaan_lis: { type: 'string', example: 'BUN' },
                                kode_pemeriksaan_lis: { type: 'string', example: 'BUN' },
                                hasil: {
                                    type: 'object',
                                    required: ['nilai_hasil'],
                                    properties: {
                                        nilai_hasil: { type: 'string', example: '15.05' },
                                        flag_kode: { type: 'string', example: 'N' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            SimrsUpdateHasilSuccessResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Data berhasil Disimpan' },
                    payload: { type: 'string', example: 'Message from simrs' }
                }
            },
            SimrsUpdateHasilErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Data gagal disimpan karena message from error' }
                }
            },
            PkExternalRegistrationRequest: {
                type: 'object',
                required: [
                    'registrasi',
                    'pasien',
                    'kode_dokter_pengirim',
                    'nama_dokter_pengirim',
                    'kode_unit_asal',
                    'nama_unit_asal',
                    'kode_penjamin',
                    'nama_penjamin',
                    'tindakan'
                ],
                properties: {
                    registrasi: {
                        type: 'object',
                        required: ['no_registrasi', 'diagnosa_awal', 'keterangan_klinis', 'kode_rs'],
                        properties: {
                            no_registrasi: { type: 'string', example: 'LA23102024-00220' },
                            diagnosa_awal: { type: 'string', example: '-' },
                            keterangan_klinis: { type: 'string', example: '-' },
                            kode_rs: { type: 'string', example: 'B23' }
                        }
                    },
                    pasien: {
                        type: 'object',
                        required: [
                            'nama',
                            'no_rm',
                            'jenis_kelamin',
                            'alamat',
                            'no_telphone',
                            'tanggal_lahir',
                            'nik',
                            'ras',
                            'berat_badan',
                            'jenis_registrasi',
                            'm_provinsi_id',
                            'm_kabupaten_id',
                            'm_kecamatan_id'
                        ],
                        properties: {
                            nama: { type: 'string', example: 'Testing Briding POST 123' },
                            no_rm: { type: 'string', example: '42729' },
                            jenis_kelamin: { type: 'string', example: 'P' },
                            alamat: { type: 'string', example: 'Jl. Jawa no 3' },
                            no_telphone: { type: 'string', example: '085761899340' },
                            tanggal_lahir: { type: 'string', format: 'date', example: '1981-07-03' },
                            nik: { type: 'string', example: '3516164307810000' },
                            ras: { type: 'string', example: '-' },
                            berat_badan: { type: 'string', example: '-' },
                            jenis_registrasi: { type: 'string', example: 'reguler' },
                            m_provinsi_id: { type: 'string', example: 'Jawa Timur' },
                            m_kabupaten_id: { type: 'string', example: 'Kota Surabaya' },
                            m_kecamatan_id: { type: 'string', example: 'Sukolilo' }
                        }
                    },
                    kode_dokter_pengirim: { type: 'string', example: 'A2' },
                    nama_dokter_pengirim: { type: 'string', example: 'dr. Abimanyu' },
                    kode_unit_asal: { type: 'string', example: 'LAB' },
                    nama_unit_asal: { type: 'string', example: 'LABORATORIUM' },
                    kode_penjamin: { type: 'string', example: '1' },
                    nama_penjamin: { type: 'string', example: 'UMUM' },
                    kode_icdt: { type: 'string', example: '-' },
                    nama_icdt: { type: 'string', example: '-' },
                    tindakan: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['kode_tindakan', 'nama_tindakan'],
                            properties: {
                                kode_tindakan: { type: 'string', example: 'A0111' },
                                nama_tindakan: { type: 'string', example: 'WIDAL' }
                            }
                        }
                    }
                }
            },
            PkExternalRegistrationSuccessResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Registrasi berhasil dikirim' },
                    payload: {
                        type: 'object',
                        nullable: true,
                        properties: {
                            no_registrasi: { type: 'string', example: 'LA23102024-00220' }
                        }
                    }
                }
            },
            PkExternalRegistrationErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Registrasi Pasien - Patologi Klinis gagal dikirim' },
                    errors: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                field: { type: 'string', example: 'code' },
                                message: { type: 'string', example: 'Code tidak boleh kosong atau hanya berisi spasi' }
                            }
                        }
                    }
                }
            },
            PaRegistrationSpecRequest: {
                type: 'object',
                required: ['registrasi', 'pasien', 'dokter_pengirim', 'tindakan'],
                properties: {
                    registrasi: {
                        type: 'object',
                        required: ['no_reg_rs'],
                        properties: {
                            no_reg_rs: { type: 'string', example: 'PA202604300002' },
                            diagnosa_awal: { type: 'string', example: 'Tumor mammae sinistra' },
                            keterangan_klinis: { type: 'string', example: 'Benjolan pada mammae kiri sejak 3 bulan' },
                            lokasi: {
                                type: 'object',
                                properties: {
                                    organ: { type: 'string', example: 'Mammae' },
                                    lokasi: { type: 'string', example: 'Kuadran atas luar, mammae kiri' }
                                }
                            },
                            bahan: { type: 'string', example: 'Biopsi jaringan mammae' },
                            jenis_registrasi: { type: 'string', example: 'reguler' },
                            kode_rs: { type: 'string', example: 'N02' }
                        }
                    },
                    pasien: {
                        type: 'object',
                        required: ['no_rm'],
                        properties: {
                            no_rm: { type: 'string', example: '000022' },
                            nama: { type: 'string', example: 'RUDI SANTOSO' },
                            tanggal_lahir: { type: 'string', format: 'date', example: '1957-03-11' },
                            jenis_identitas: { type: 'string', example: 'KTP' },
                            no_identitas: { type: 'string', example: '3374135702570001' },
                            jenis_kelamin: { type: 'string', example: 'P' }
                        }
                    },
                    dokter_pengirim: {
                        type: 'object',
                        required: ['kode'],
                        properties: {
                            kode: { type: 'string', example: 'D0000004' },
                            nama: { type: 'string', example: 'dr. Hilyatul Nadia' }
                        }
                    },
                    tindakan: {
                        type: 'object',
                        required: ['kode_tindakan'],
                        properties: {
                            kode_tindakan: { type: 'string', example: 'PA0001' },
                            nama_tindakan: { type: 'string', example: 'Histopologi' }
                        }
                    }
                }
            },
            PaArchiveRequest: {
                type: 'object',
                required: ['no_registrasi', 'hasil_pemeriksaan'],
                properties: {
                    no_registrasi: { type: 'string', example: 'PA202604300001' },
                    no_lab: { type: 'string', example: 'E09/PA260430/0001' },
                    jenis_registrasi: { type: 'string', example: 'reguler' },
                    keterangan_hasil: { type: 'string', example: 'Catatan hasil PA' },
                    kode_rs: { type: 'string', example: 'N02' },
                    kode_lab: { type: 'string', example: 'test' },
                    pasien: {
                        type: 'object',
                        properties: {
                            nama_pasien: { type: 'string', example: 'RUDI SANTOSO' },
                            no_rm: { type: 'string', example: '000022' }
                        }
                    },
                    hasil_pemeriksaan: {
                        type: 'object',
                        required: ['kode_tindakan_simrs', 'pemeriksaan'],
                        properties: {
                            no_pa: { type: 'string', example: 'PA-DUMMY-001' },
                            kode_tindakan_simrs: { type: 'string', example: 'PA0001' },
                            pelayanan_pemeriksaan_lis: { type: 'string', example: 'Histopatologi' },
                            jenis_pelayanan: {
                                type: 'object',
                                properties: {
                                    kode: { type: 'string', example: 'PA0001' },
                                    nama: { type: 'string', example: 'Histopologi' }
                                }
                            },
                            pemeriksaan: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        kode: { type: 'string', example: 'A1' },
                                        nama: { type: 'string', example: 'Mikroskopis' },
                                        no_urut: { type: 'integer', example: 1 },
                                        hasil: { type: 'string', example: 'Sel epitel tampak reaktif.' },
                                        jenis_input: { type: 'string', example: 'T' },
                                        pilihan_hasil: { type: 'array', items: {} }
                                    }
                                },
                                example: [
                                    { kode: 'A1', nama: 'Mikroskopis', no_urut: 1, hasil: 'Sel epitel tampak reaktif.', jenis_input: 'T', pilihan_hasil: [] },
                                    { kode: 'A2', nama: 'Makroskopis', no_urut: 2, hasil: 'Jaringan ukuran 1x1 cm warna kecoklatan.', jenis_input: 'T', pilihan_hasil: [] },
                                    { kode: 'A3', nama: 'Kesimpulan', no_urut: 3, hasil: 'Radang kronis non spesifik.', jenis_input: 'T', pilihan_hasil: [] },
                                    { kode: 'A4', nama: 'Saran', no_urut: 4, hasil: 'Korelasi klinis.', jenis_input: 'T', pilihan_hasil: [] }
                                ]
                            },
                            image_hasil: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        nama: { type: 'string', example: 'dummy-pa-result.png' },
                                        image: { type: 'string', example: 'data:image/png;base64,AA==' },
                                        deskripsi: { type: 'string', example: '1' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            MbRegistrationSpecRequest: {
                type: 'object',
                required: ['registrasi', 'pasien', 'dokter_pengirim', 'tindakan'],
                properties: {
                    registrasi: {
                        type: 'object',
                        required: ['no_reg_rs'],
                        properties: {
                            no_reg_rs: { type: 'string', example: 'MB202604300002', maxLength: 15 },
                            keterangan_klinis: { type: 'string', example: '-' },
                            diagnosa_awal: { type: 'string', example: 'pasien menderita dm' },
                            jenis_registrasi: { type: 'string', example: 'reguler' },
                            kode_rs: { type: 'string', example: 'N02' }
                        }
                    },
                    pasien: {
                        type: 'object',
                        required: ['no_rm'],
                        properties: {
                            no_rm: { type: 'string', example: '000022' },
                            nama: { type: 'string', example: 'RUDI SANTOSO' },
                            tanggal_lahir: { type: 'string', format: 'date', example: '1957-03-11' },
                            jenis_identitas: { type: 'string', example: 'KTP' },
                            no_identitas: { type: 'string', example: '3374135702570001' },
                            jenis_kelamin: { type: 'string', example: 'P' }
                        }
                    },
                    dokter_pengirim: {
                        type: 'object',
                        required: ['kode'],
                        properties: {
                            kode: { type: 'string', example: 'D0000004' },
                            nama: { type: 'string', example: 'dr. Hilyatul Nadia' }
                        }
                    },
                    tindakan: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['kode_tindakan'],
                            properties: {
                                kode_tindakan: { type: 'string', example: 'J000108' },
                                nama_tindakan: { type: 'string', example: 'Pemeriksaan RT-PCR + Swab' }
                            }
                        }
                    }
                }
            },
            MbArchiveRequest: {
                type: 'object',
                required: ['no_registrasi', 'pemeriksaan'],
                properties: {
                    no_registrasi: { type: 'string', example: 'MB202604300001' },
                    no_lab: { type: 'string', example: 'Z99/MK260430/0001' },
                    jenis_registrasi: { type: 'string', example: 'reguler' },
                    waktu_registrasi: { type: 'string', example: '2026-04-30 09:00:00' },
                    keterangan_hasil: { type: 'string', example: 'Catatan pemeriksaan mikrobiologi' },
                    kode_rs: { type: 'string', example: 'N02' },
                    kode_lab: { type: 'string', example: 'test' },
                    pasien: {
                        type: 'object',
                        properties: {
                            nama_pasien: { type: 'string', example: 'RUDI SANTOSO' },
                            no_rm: { type: 'string', example: '000022' },
                            jenis_kelamin: { type: 'string', example: 'P' },
                            tanggal_lahir: { type: 'string', format: 'date', example: '1957-03-11' },
                            jenis_identitas: { type: 'string', example: 'KTP' },
                            no_identitas: { type: 'string', example: '3374135702570001' }
                        }
                    },
                    pemeriksaan: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['kode_tindakan_simrs', 'hasil'],
                            properties: {
                                kategori_pemeriksaan: {
                                    type: 'object',
                                    properties: {
                                        kode_kategori: { type: 'string', example: 'MIK' },
                                        nama_kategori: { type: 'string', example: 'MIKROBIOLOGI' }
                                    }
                                },
                                sub_kategori_pemeriksaan: {
                                    type: 'object',
                                    properties: {
                                        kode_sub_kategori: { type: 'string', example: 'MIKRO' },
                                        nama_sub_kategori: { type: 'string', example: 'Mikrobiologi' }
                                    }
                                },
                                kode_tindakan_simrs: { type: 'string', example: 'J000108' },
                                kode_pemeriksaan_lis: { type: 'string', example: 'BP' },
                                nama_pemeriksaan_lis: { type: 'string', example: 'Bahan Periksa' },
                                nomor_urut: { type: 'integer', example: 1 },
                                status_bridging: { type: 'boolean', example: true },
                                is_bacteria: { type: 'boolean', example: false },
                                hasil: {
                                    type: 'object',
                                    properties: {
                                        hasil_pemeriksaan: { type: 'string', nullable: true, example: 'Sputum' },
                                        without_bacteria: { type: 'boolean', example: false },
                                        bacteria: {
                                            type: 'array',
                                            nullable: true,
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    nama_bakteri: { type: 'string', example: 'E.Coli' },
                                                    antibiotik: {
                                                        type: 'array',
                                                        items: {
                                                            type: 'object',
                                                            properties: {
                                                                kode: { type: 'string', example: 'GRAM+' },
                                                                nama: { type: 'string', example: 'Test Kepekaan Gram Positive' },
                                                                list_antibiotik: {
                                                                    type: 'array',
                                                                    items: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            kode_item: { type: 'string', example: 'AN' },
                                                                            nama_item: { type: 'string', example: 'Amikacin' },
                                                                            mic: { type: 'string', nullable: true, example: null },
                                                                            interpretasi: { type: 'string', nullable: true, example: 'S' }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        example: [
                            {
                                kategori_pemeriksaan: { kode_kategori: 'MIK', nama_kategori: 'MIKROBIOLOGI' },
                                sub_kategori_pemeriksaan: { kode_sub_kategori: 'MIKRO', nama_sub_kategori: 'Mikrobiologi' },
                                kode_tindakan_simrs: 'J000108',
                                kode_pemeriksaan_lis: 'BP',
                                nama_pemeriksaan_lis: 'Bahan Periksa',
                                nomor_urut: 1,
                                status_bridging: true,
                                is_bacteria: false,
                                hasil: { hasil_pemeriksaan: 'Sputum', without_bacteria: false, bacteria: null }
                            }
                        ]
                    }
                }
            }
        }
    },
    paths: {
        '/api/health': {
            get: {
                tags: ['System'],
                summary: 'Health check',
                description: 'Memastikan server lokal Bridging Adam LIS x Khanza sedang aktif dan dapat menerima request.',
                responses: {
                    200: {
                        description: 'API is running'
                    }
                }
            }
        },
        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Login and get JWT token',
                description: [
                    'Gunakan endpoint ini untuk mengambil token lokal sebelum mencoba endpoint protected.',
                    'Default credential development mengikuti konfigurasi `.env`.'
                ].join(' '),
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/AuthLoginRequest' }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Login successful',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AuthLoginResponse' }
                            }
                        }
                    },
                    401: { description: 'Invalid credentials' }
                }
            }
        },
        '/api/auth/verify': {
            post: {
                tags: ['Auth'],
                summary: 'Verify JWT token',
                description: 'Memeriksa apakah Bearer token lokal masih valid dan dapat dipakai untuk endpoint protected.',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Token is valid' },
                    401: { description: 'Token missing or expired' },
                    403: { description: 'Invalid token' }
                }
            }
        },
        '/adam-lis/bridging/{limit}/{noorder}': {
            get: {
                tags: ['PK'],
                summary: 'Search PK registration/order',
                description: [
                    'Metode registrasi GET pull untuk Patologi Klinis.',
                    'Adam LIS hit endpoint ini untuk menarik data order dari project berdasarkan `noorder`.',
                    'Gunakan metode ini sebagai alternatif POST registrasi eksternal, bukan bersamaan untuk order yang sama.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'limit', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 10 }, example: 10 },
                    { name: 'noorder', in: 'path', required: true, schema: { type: 'string' }, example: 'PK202604220001' }
                ],
                responses: {
                    200: { description: 'Registration found', content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationResponse' } } } },
                    404: { description: 'Registration not found' }
                }
            }
        },
        '/adam-lis/bridging/lab-results-pk/{limit}/{noorder}': {
            get: {
                tags: ['PK'],
                summary: 'Get PK lab results',
                description: 'Mengambil hasil Patologi Klinis yang sudah tersimpan di Khanza untuk nomor order tertentu.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'limit', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 10 }, example: 10 },
                    { name: 'noorder', in: 'path', required: true, schema: { type: 'string' }, example: 'PK202604210001' }
                ],
                responses: {
                    200: { description: 'Lab result found' },
                    404: { description: 'Lab result not found' }
                }
            }
        },
        '/adam-lis/bridging/': {
            post: {
                tags: ['PK'],
                summary: 'Post PK lab results to Khanza',
                description: [
                    'Endpoint callback dari Adam LIS saat hasil Patologi Klinis selesai.',
                    'Project membuat data hasil pemeriksaan di database `sik` sesuai mapping service PK.',
                    'Kode pemeriksaan pada body memakai `template_laboratorium.id_template`.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PkPostRequest' }
                        }
                    }
                },
                responses: {
                    200: { description: 'Lab results posted successfully' },
                    400: { description: 'Validation or database error', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardError' } } } }
                }
            }
        },
        '/adam-lis/bridging/update-hasil': {
            post: {
                tags: ['PK'],
                summary: 'Update hasil pemeriksaan PK from Adam LIS',
                description: [
                    'Metode update hasil pemeriksaan PK sesuai format Adam LIS.',
                    'SIMRS membuka akses endpoint ini agar LIS dapat mengirim data hasil yang sudah diolah dari analyzer ke SIMRS.',
                    'Method wajib POST, format JSON, dan Content-Type `application/json`.',
                    'Project akan menyimpan atau memperbarui hasil ke database `sik` sesuai mapping PK.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PkUpdateHasilRequest' }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Data berhasil disimpan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SimrsUpdateHasilSuccessResponse' }
                            }
                        }
                    },
                    400: {
                        description: 'Data gagal disimpan',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SimrsUpdateHasilErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/adam-lis/bridging_sim_rs/registrasi': {
            post: {
                tags: ['PK'],
                summary: 'Kirim registrasi pasien PK dari SIMRS ke LIS eksternal',
                description: externalRegistrationDescription,
                servers: [pkRegistrationServer],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PkExternalRegistrationRequest' }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Registrasi berhasil dikirim',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PkExternalRegistrationSuccessResponse' }
                            }
                        }
                    },
                    400: {
                        description: 'Validasi registrasi gagal',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PkExternalRegistrationErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/adam-lis/bridging/mb/{limit}/{noorder}': {
            get: {
                tags: ['MB'],
                summary: 'Search MB registration/order',
                description: [
                    'Metode registrasi GET pull untuk Mikrobiologi.',
                    'Adam LIS hit endpoint ini untuk menarik data order dari project berdasarkan `noorder`.',
                    'Gunakan metode ini sebagai alternatif POST registrasi eksternal, bukan bersamaan untuk order yang sama.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'limit', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 10 }, example: 10 },
                    { name: 'noorder', in: 'path', required: true, schema: { type: 'string' }, example: 'MB202604300001' }
                ],
                responses: {
                    200: { description: 'MB registration found', content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationResponse' } } } },
                    404: { description: 'MB registration not found' }
                }
            }
        },
        '/api/v2/adamlis/mikrobiologi/bridging/registrasi': {
            post: {
                tags: ['MB'],
                summary: 'Create MB registration using Adam LIS MB spec',
                description: externalRegistrationDescription,
                servers: [mbRegistrationServer],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/MbRegistrationSpecRequest' }
                        }
                    }
                },
                responses: {
                    201: { description: 'MB registration created' },
                    400: { description: 'Validation error' }
                }
            }
        },
        '/api/v2/adamlis/mikrobiologi/bridging/registrasi/{no_reg_rs}': {
            get: {
                tags: ['MB'],
                summary: 'Get MB registration using Adam LIS MB spec format',
                description: [
                    'Metode registrasi GET pull untuk Mikrobiologi dengan format spesifikasi Adam LIS.',
                    'Adam LIS dapat memakai endpoint ini untuk menarik data registrasi dari project jika integrasi dipilih menggunakan GET.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'no_reg_rs', in: 'path', required: true, schema: { type: 'string' }, example: 'MB202604300001' }
                ],
                responses: {
                    200: { description: 'MB registration found' },
                    404: { description: 'MB registration not found' }
                }
            }
        },
        '/api/v2/adamlis/mikrobiologi/bridging/arsip': {
            post: {
                tags: ['MB'],
                summary: 'Post MB result/archive using Adam LIS MB spec',
                description: [
                    'Endpoint callback dari Adam LIS saat hasil Mikrobiologi selesai.',
                    'Project membuat arsip/ringkasan hasil ke database `sik` sesuai mapping service MB.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/MbArchiveRequest' }
                        }
                    }
                },
                responses: {
                    201: { description: 'MB result posted' },
                    400: { description: 'Validation error' }
                }
            }
        },
        '/api/v2/adamlis/mikrobiologi/bridging/arsip/{no_lab}': {
            put: {
                tags: ['MB'],
                summary: 'Update MB result/archive using Adam LIS MB spec',
                description: [
                    'Endpoint callback dari Adam LIS saat ada revisi hasil Mikrobiologi.',
                    'Project memperbarui data hasil di database `sik` agar tetap konsisten dengan LIS.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'no_lab', in: 'path', required: true, schema: { type: 'string' }, example: 'Z99/MK260430/0001' }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/MbArchiveRequest' }
                        }
                    }
                },
                responses: {
                    200: { description: 'MB result updated' },
                    400: { description: 'Validation error' }
                }
            }
        },
        '/adam-lis/bridging/pa/{limit}/{noorder}': {
            get: {
                tags: ['PA'],
                summary: 'Search PA registration/order using internal compact format',
                description: [
                    'Metode registrasi GET pull untuk Patologi Anatomi.',
                    'Adam LIS hit endpoint ini untuk menarik data order dari project berdasarkan `noorder`.',
                    'Gunakan metode ini sebagai alternatif POST registrasi eksternal, bukan bersamaan untuk order yang sama.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'limit', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 10 }, example: 10 },
                    { name: 'noorder', in: 'path', required: true, schema: { type: 'string' }, example: 'PA202604300001' }
                ],
                responses: {
                    200: { description: 'PA registration found', content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationResponse' } } } },
                    404: { description: 'PA registration not found' }
                }
            }
        },
        '/api/v1/adamlis/patologi-anatomi/bridging/registrasi': {
            post: {
                tags: ['PA'],
                summary: 'Create PA registration using Adam LIS PA spec',
                description: externalRegistrationDescription,
                servers: [paRegistrationServer],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PaRegistrationSpecRequest' }
                        }
                    }
                },
                responses: {
                    201: { description: 'PA registration created' },
                    400: { description: 'Validation error' }
                }
            }
        },
        '/api/v1/adamlis/patologi-anatomi/bridging/registrasi/{no_reg_rs}': {
            get: {
                tags: ['PA'],
                summary: 'Get PA registration using Adam LIS PA spec format',
                description: [
                    'Metode registrasi GET pull untuk Patologi Anatomi dengan format spesifikasi Adam LIS.',
                    'Adam LIS dapat memakai endpoint ini untuk menarik data registrasi dari project jika integrasi dipilih menggunakan GET.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'no_reg_rs', in: 'path', required: true, schema: { type: 'string' }, example: 'PA202604300001' }
                ],
                responses: {
                    200: { description: 'PA registration found' },
                    404: { description: 'PA registration not found' }
                }
            }
        },
        '/api/v1/adamlis/patologi-anatomi/bridging/arsip': {
            post: {
                tags: ['PA'],
                summary: 'Post PA result/archive using Adam LIS PA spec',
                description: [
                    'Endpoint callback dari Adam LIS saat hasil Patologi Anatomi selesai.',
                    'Project membuat arsip hasil ke database `sik` sesuai mapping service PA.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PaArchiveRequest' }
                        }
                    }
                },
                responses: {
                    201: { description: 'PA result posted' },
                    400: { description: 'Validation error' }
                }
            },
            put: {
                tags: ['PA'],
                summary: 'Update PA result/archive using Adam LIS PA spec',
                description: [
                    'Endpoint callback dari Adam LIS saat ada revisi hasil Patologi Anatomi.',
                    'Project memperbarui data hasil di database `sik` agar tetap konsisten dengan LIS.'
                ].join(' '),
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PaArchiveRequest' }
                        }
                    }
                },
                responses: {
                    200: { description: 'PA result updated' },
                    400: { description: 'Validation error' }
                }
            }
        }
    }
};

module.exports = openApiSpec;
