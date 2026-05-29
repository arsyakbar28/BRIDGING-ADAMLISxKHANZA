/**
 * Get PK Order via API with Authentication
 * Login first, then hit PK order endpoint
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Helper function to make HTTP requests
function makeHttpRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const protocol = options.protocol === 'https:' ? https : http;

        const req = protocol.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        data: jsonData
                    });
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (postData) {
            req.write(JSON.stringify(postData));
        }

        req.end();
    });
}

// Login and get JWT token
async function login() {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost';
        const port = process.env.PORT || 5005;
        const loginUrl = new URL(`${baseUrl}:${port}/api/auth/login`);

        const username = process.env.AUTH_USERNAME;
        const password = process.env.AUTH_PASSWORD;

        if (!username || !password) {
            throw new Error('AUTH_USERNAME and AUTH_PASSWORD must be set in .env file');
        }

        console.log(`🔐 Logging in to: ${loginUrl.href}`);
        console.log(`👤 Username: ${username}\n`);

        const loginOptions = {
            hostname: loginUrl.hostname,
            port: loginUrl.port,
            path: loginUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PK-Order-Script/1.0'
            }
        };

        const loginData = { username, password };
        const response = await makeHttpRequest(loginOptions, loginData);

        if (response.status === 200 && response.data.success) {
            console.log('✅ Login successful');
            console.log(`🎫 Token type: ${response.data.payload.tokenType}`);
            console.log(`⏰ Expires: ${response.data.payload.expiresAt || 'Never'}\n`);

            return response.data.payload.token;
        } else {
            throw new Error(`Login failed: ${response.data.message}`);
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
        throw error;
    }
}

// Get PK Order info with authentication
async function getPKOrderFromAPI(noorder, limit = 10) {
    try {
        // Step 1: Login and get token
        const token = await login();

        // Step 2: Call PK order endpoint with token
        const baseUrl = process.env.BASE_URL || 'http://localhost';
        const port = process.env.PORT || 5005;
        const apiUrl = new URL(`${baseUrl}:${port}/adam-lis/bridging/${limit}/${noorder}`);

        console.log(`🔍 Getting PK order info for noorder: ${noorder}`);
        console.log(`📡 Calling API: ${apiUrl.href}`);

        const apiOptions = {
            hostname: apiUrl.hostname,
            port: apiUrl.port,
            path: apiUrl.pathname,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'PK-Order-Script/1.0'
            }
        };

        const response = await makeHttpRequest(apiOptions);

        // Display response
        console.log('\n📊 API Response:');
        console.log('='.repeat(60));
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Response Size: ${JSON.stringify(response.data).length} bytes`);
        console.log('');

        // Pretty print JSON response
        console.log('📋 Response Data:');
        console.log('='.repeat(60));
        console.log(JSON.stringify(response.data, null, 2));
        console.log('');

        // Extract and display key information
        if (response.data && response.data.payload && Array.isArray(response.data.payload)) {
            console.log('🔍 Summary:');
            console.log('='.repeat(60));
            console.log(`✅ Success: ${response.data.success}`);
            console.log(`📝 Message: ${response.data.message}`);
            console.log(`📊 Records Found: ${response.data.payload.length}`);

            if (response.data.payload.length > 0) {
                const firstRecord = response.data.payload[0];
                console.log(`📋 First Record:`);
                console.log(`   Noorder: ${firstRecord.noorder}`);
                console.log(`   Patient: ${firstRecord.nm_pasien}`);
                console.log(`   No Rawat: ${firstRecord.no_rawat}`);
                console.log(`   Registration: ${firstRecord.waktu_registrasi_formatted}`);
                console.log(`   Doctor: ${firstRecord.nm_dokter}`);
                console.log(`   Status: ${firstRecord.status}`);

                // Display requested examinations if available
                if (firstRecord.requested_tindakan && Array.isArray(firstRecord.requested_tindakan)) {
                    console.log(`🧪 Requested Examinations (${firstRecord.requested_tindakan.length}):`);
                    firstRecord.requested_tindakan.forEach((exam, index) => {
                        console.log(`   ${index + 1}. ${exam.nm_perawatan} (${exam.kd_jenis_prw})`);
                    });
                }

                // Display selected examinations if available
                if (firstRecord.selected_pemeriksaan && Array.isArray(firstRecord.selected_pemeriksaan)) {
                    console.log(`📋 Selected Examinations (${firstRecord.selected_pemeriksaan.length}):`);
                    firstRecord.selected_pemeriksaan.forEach((exam, index) => {
                        console.log(`   ${index + 1}. ${exam.nama_pemeriksaan} (ID: ${exam.kode_pemeriksaan})`);
                    });
                }
            }

            // Show template for JSON submission
            console.log('\n📝 Template for Lab Results Submission:');
            console.log('='.repeat(60));
            if (response.data.payload.length > 0) {
                const record = response.data.payload[0];
                const template = {
                    noorder: record.noorder,
                    dokter_pj: record.kd_dokter || "D0000004",
                    petugas: "-",
                    dokter_perujuk: record.dokter_perujuk || "D0000004",
                    tgl_periksa: new Date().toISOString().split('T')[0], // Today's date
                    jam_periksa: new Date().toTimeString().split(' ')[0], // Current time
                    kesan: null,
                    saran: null,
                    pemeriksaan: record.selected_pemeriksaan ? record.selected_pemeriksaan.map(exam => ({
                        nama_pemeriksaan: exam.nama_pemeriksaan,
                        kode_pemeriksaan: exam.kode_pemeriksaan,
                        hasil: "Your result value here",
                        keterangan: null,
                        nilai_rujukan: null
                    })) : []
                };

                console.log(JSON.stringify(template, null, 2));
            }
        }

        return response.data;

    } catch (error) {
        console.error('❌ Error calling PK order API:', error.message);
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const noorder = process.argv[2];
    const limit = parseInt(process.argv[3]) || 10;

    if (!noorder) {
        console.log('❌ Usage: node scripts/get-pk-order-api.js <noorder> [limit]');
        console.log('📝 Examples:');
        console.log('   node scripts/get-pk-order-api.js PK202605290004');
        console.log('   node scripts/get-pk-order-api.js PK202605290004 5');
        console.log('');
        console.log('📋 Parameters:');
        console.log('   noorder: Lab order number (required)');
        console.log('   limit: Maximum records to return (optional, default: 10, max: 10)');
        console.log('');
        console.log('🔑 Required Environment Variables:');
        console.log('   AUTH_USERNAME: Username for API authentication');
        console.log('   AUTH_PASSWORD: Password for API authentication');
        process.exit(1);
    }

    // Validate limit
    if (limit < 1 || limit > 10) {
        console.error('❌ Limit must be between 1 and 10');
        process.exit(1);
    }

    // Check required environment variables
    const requiredEnvs = ['AUTH_USERNAME', 'AUTH_PASSWORD'];
    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

    if (missingEnvs.length > 0) {
        console.error(`❌ Missing required environment variables: ${missingEnvs.join(', ')}`);
        console.error('💡 Please set these in your .env file');
        process.exit(1);
    }

    if (!process.env.PORT) {
        console.log('⚠️  PORT not set in .env, using default: 5005');
    }

    console.log('🚀 Starting PK Order API call with authentication...');
    console.log(`📊 Parameters: noorder=${noorder}, limit=${limit}\n`);

    getPKOrderFromAPI(noorder, limit)
        .then((data) => {
            console.log('\n✅ PK order API call completed successfully');

            // Exit with appropriate code
            if (data && data.success) {
                process.exit(0);
            } else {
                console.log('⚠️  API call succeeded but returned unsuccessful result');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n❌ PK order API call failed');
            process.exit(1);
        });
}

module.exports = { getPKOrderFromAPI, login };