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

def get_lab_results_by_noorder(noorder):
    """Mengambil data hasil lab berdasarkan noorder"""
    conn = get_db_connection()
    if not conn:
        return {
            "success": False,
            "message": "Database connection failed",
            "payload": []
        }
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Query untuk mengambil data hasil lab
        query = """
        SELECT 
            pl.noorder,
            pl.no_rawat,
            pl.tgl_permintaan,
            pl.jam_permintaan,
            pl.tgl_hasil,
            pl.jam_hasil,
            pl.dokter_perujuk,
            pl.status,
            pl.diagnosa_klinis,
            pl.informasi_tambahan,
            p.nm_pasien,
            p.no_rkm_medis,
            p.jk,
            p.tgl_lahir,
            p.alamat,
            p.no_tlp,
            p.no_ktp,
            d.nm_dokter,
            rp.kd_pj,
            penjab.png_jawab,
            rp.tgl_registrasi,
            rp.kd_poli,
            pol.nm_poli
        FROM permintaan_lab pl
        LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
        LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
        LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
        LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
        LEFT JOIN penjab ON rp.kd_pj = penjab.kd_pj
        WHERE pl.noorder = %s
        """
        
        cursor.execute(query, (noorder,))
        result = cursor.fetchone()
        
        if not result:
            return {
                "success": False,
                "message": f"No lab results found for noorder: {noorder}",
                "payload": []
            }
        
        # Query untuk mengambil detail hasil lab
        detail_query = """
        SELECT 
            dpl.kd_jenis_prw,
            jpl.nm_perawatan,
            dpl.nilai,
            dpl.nilai_rujukan,
            dpl.keterangan,
            tl.Pemeriksaan,
            tl.satuan,
            tl.nilai_rujukan_ld,
            tl.nilai_rujukan_la,
            tl.nilai_rujukan_pd,
            tl.nilai_rujukan_pa,
            tl.urut
        FROM detail_periksa_lab dpl
        LEFT JOIN jns_perawatan_lab jpl ON dpl.kd_jenis_prw = jpl.kd_jenis_prw
        LEFT JOIN template_laboratorium tl ON dpl.id_template = tl.id_template
        WHERE dpl.no_rawat = %s
        ORDER BY tl.urut, dpl.kd_jenis_prw
        """
        
        cursor.execute(detail_query, (result['no_rawat'],))
        detail_results = cursor.fetchall()
        
        # Format response
        response = {
            "success": True,
            "message": f"Lab results retrieved successfully for noorder: {noorder}",
            "payload": [
                {
                    "no_registrasi": result['no_rawat'],
                    "waktu_periksa": f"{result['tgl_hasil']} {result['jam_hasil']}" if result['tgl_hasil'] else f"{result['tgl_permintaan']} {result['jam_permintaan']}",
                    "dokter_perujuk": result['nm_dokter'],
                    "penanggung_jawab": result['dokter_perujuk'],
                    "keterangan": result['informasi_tambahan'] or "-",
                    "pasien": {
                        "no_rm": result['no_rkm_medis'],
                        "nama": result['nm_pasien'],
                        "jenis_kelamin": result['jk'],
                        "tanggal_lahir": str(result['tgl_lahir']),
                        "alamat": result['alamat'],
                        "no_telphone": result['no_tlp'],
                        "nik": result['no_ktp']
                    },
                    "cara_bayar": result['png_jawab'],
                    "unit": result['nm_poli'],
                    "hasil_pemeriksaan": [
                        {
                            "kode_pemeriksaan": detail['kd_jenis_prw'],
                            "nama_pemeriksaan": detail['Pemeriksaan'] or detail['nm_perawatan'],
                            "hasil": detail['nilai'],
                            "satuan": detail['satuan'],
                            "nilai_rujukan": detail['nilai_rujukan'] or detail['nilai_rujukan_ld'],
                            "keterangan": detail['keterangan'],
                            "urut": detail['urut']
                        }
                        for detail in detail_results
                    ]
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

def main():
    """Main function untuk testing lab results"""
    print("🔬 Lab Results API - Python Version")
    print("=" * 50)
    
    # Test koneksi
    conn = get_db_connection()
    if not conn:
        print("❌ Database connection failed!")
        return
    conn.close()
    print("✅ Database connection successful!")
    
    # Test dengan noorder yang ada
    noorder = "PK202510020002"
    print(f"\n🔍 Getting lab results for noorder: {noorder}")
    print("-" * 50)
    
    # Get data hasil lab
    response = get_lab_results_by_noorder(noorder)
    
    # Print response dalam format JSON yang indah
    print("📋 Lab Results Response:")
    print(json.dumps(response, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
