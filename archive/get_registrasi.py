import mysql.connector
from dotenv import load_dotenv
import os
import json
from datetime import datetime

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '192.168.75.200'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'database': os.getenv('DB_NAME', 'adhyaksa_db'),
    'user': os.getenv('DB_USER', 'adhyaksa'),
    'password': os.getenv('DB_PASSWORD', 'Adhyaksa123@')
}

def get_db_connection():
    """Membuat koneksi ke database MySQL"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as err:
        print(f"❌ Error connecting to database: {err}")
        return None

def get_lab_request_by_noorder(noorder):
    """Mengambil data permintaan lab berdasarkan noorder dengan format response yang diinginkan"""
    conn = get_db_connection()
    if not conn:
        return {
            "success": False,
            "message": "Database connection failed",
            "payload": []
        }
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Query utama untuk mengambil data permintaan lab
        query = """
        SELECT 
            pl.noorder,
            pl.no_rawat,
            pl.tgl_permintaan,
            pl.jam_permintaan,
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
            penjab.png_jawab,
            dp.kd_penyakit,
            pen.nm_penyakit
        FROM permintaan_lab pl
        LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
        LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
        LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
        LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
        LEFT JOIN penjab ON rp.kd_pj = penjab.kd_pj
        LEFT JOIN diagnosa_pasien dp ON pl.no_rawat = dp.no_rawat
        LEFT JOIN penyakit pen ON dp.kd_penyakit = pen.kd_penyakit
        WHERE pl.noorder = %s
        """
        
        cursor.execute(query, (noorder,))
        result = cursor.fetchone()
        
        if not result:
            return {
                "success": False,
                "message": f"No lab request found for noorder: {noorder}",
                "payload": []
            }
        
        # Ambil tindakan yang diminta dari permintaan_pemeriksaan_lab
        tindakan_query = """
        SELECT 
            ppl.kd_jenis_prw,
            jpl.nm_perawatan
        FROM permintaan_pemeriksaan_lab ppl
        LEFT JOIN jns_perawatan_lab jpl ON ppl.kd_jenis_prw = jpl.kd_jenis_prw
        WHERE ppl.noorder = %s
        """
        
        cursor.execute(tindakan_query, (noorder,))
        tindakan_results = cursor.fetchall()
        
        # Format response sesuai yang diminta
        response = {
            "success": True,
            "message": f"Lab request data retrieved successfully for noorder: {noorder}",
            "payload": [
                {
                    "no_registrasi": result['no_rawat'],  # Dari tabel reg_periksa
                    "waktu_registrasi": f"{result['tgl_permintaan']} {result['jam_permintaan']}",  # Dari tabel permintaan_lab
                    "diagnosa_awal": result['diagnosa_klinis'],  # Dari tabel permintaan_lab
                    "keterangan_klinis": result['informasi_tambahan'] or "-",  # Dari tabel permintaan_lab
                    "kodeRS": "RS01",  # Default kode RS (tidak ada di database)
                    "pasien": {
                        "no_rm": result['no_rkm_medis'],  # Dari tabel pasien
                        "nama": result['nm_pasien'],  # Dari tabel pasien
                        "jenis_kelamin": result['jk'],  # Dari tabel pasien
                        "alamat": result['alamat'] or "-",  # Dari tabel pasien
                        "tanggal_lahir": str(result['tgl_lahir']),  # Dari tabel pasien
                        "no_telphone": result['no_tlp'] or "-",  # Dari tabel pasien
                        "nik": result['no_ktp'] or "-",  # Dari tabel pasien (kolom no_ktp)
                        "ras": "Hitam/Putih",  # Default (tidak ada di database)
                        "berat_badan": "-",  # Tidak ada di database
                        "jenis_registrasi": "Reguler" if result['status'] == 'ralan' else "Cito",
                        "m_provinsi_id": result['propinsipj'] or "Jawa Timur",  # Dari tabel pasien atau default
                        "m_kabupaten_id": result['kabupatenpj'] or "Mojokerto",  # Dari tabel pasien atau default
                        "m_kecamatan_id": result['kecamatanpj'] or "-"  # Dari tabel pasien atau default
                    },
                    "dokter_pengirim": {
                        "nama": result['nm_dokter'] or "-",  # Dari tabel dokter
                        "kode": result['dokter_perujuk']  # Dari tabel permintaan_lab
                    },
                    "unit_asal": {
                        "nama": result['nm_poli'] or "IGD",  # Default jika tidak ada
                        "kode": result['kd_poli'] or "0301"  # Default jika tidak ada
                    },
                    "tindakan": [
                        {
                            "kode_tindakan": tindakan['kd_jenis_prw'],  # Dari permintaan_pemeriksaan_lab
                            "nama_tindakan": tindakan['nm_perawatan']  # Dari jns_perawatan_lab
                        }
                        for tindakan in tindakan_results
                    ],
                    "penjamin": {
                        "nama": result['png_jawab'] or "UMUM",  # Default jika tidak ada
                        "kode": result['kd_pj'] or "0001"  # Default jika tidak ada
                    },
                    "icdt": {
                        "nama": result['nm_penyakit'] or result['diagnosa_klinis'],  # Fallback ke diagnosa_klinis
                        "kode": result['kd_penyakit'] or "-"  # Default jika tidak ada
                    }
                }
            ]
        }
        
        return response
        
    except mysql.connector.Error as err:
        return {
            "success": False,
            "message": f"Database error: {str(err)}",
            "payload": []
        }
    finally:
        if conn:
            conn.close()

def search_lab_requests(partial_noorder, limit=10):
    """Mencari data permintaan lab berdasarkan partial noorder"""
    conn = get_db_connection()
    if not conn:
        return {
            "success": False,
            "message": "Database connection failed",
            "payload": []
        }
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT 
            pl.noorder,
            pl.no_rawat,
            pl.tgl_permintaan,
            pl.jam_permintaan,
            pl.diagnosa_klinis,
            p.nm_pasien,
            p.no_rkm_medis
        FROM permintaan_lab pl
        LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
        LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
        WHERE pl.noorder LIKE %s
        ORDER BY pl.tgl_permintaan DESC
        LIMIT %s
        """
        
        cursor.execute(query, (f"%{partial_noorder}%", limit))
        results = cursor.fetchall()
        
        return {
            "success": True,
            "message": f"Found {len(results)} lab request records for search: {partial_noorder}",
            "payload": [
                {
                    "noorder": result['noorder'],
                    "no_registrasi": result['no_rawat'],
                    "waktu_registrasi": f"{result['tgl_permintaan']} {result['jam_permintaan']}",
                    "diagnosa_awal": result['diagnosa_klinis'],
                    "pasien": {
                        "no_rm": result['no_rkm_medis'],
                        "nama": result['nm_pasien']
                    }
                }
                for result in results
            ]
        }
        
    except mysql.connector.Error as err:
        return {
            "success": False,
            "message": f"Database error: {str(err)}",
            "payload": []
        }
    finally:
        if conn:
            conn.close()

def main():
    """Main function untuk testing API response format"""
    print("🔬 Lab Request API Response Format - Python Version")
    print("=" * 60)
    
    # Test koneksi
    conn = get_db_connection()
    if not conn:
        print("❌ Database connection failed!")
        return
    conn.close()
    print("✅ Database connection successful!")
    
    # Test dengan noorder yang ada
    noorder = "PK202510030001"
    print(f"\n🔍 Getting lab request data for noorder: {noorder}")
    print("-" * 60)
    
    # Get data dengan format response yang diinginkan
    response = get_lab_request_by_noorder(noorder)
    
    # Print response dalam format JSON yang indah
    print("📋 API Response:")
    print(json.dumps(response, indent=2, ensure_ascii=False))
    
    

if __name__ == "__main__":
    main()
