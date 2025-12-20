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

def get_lab_request_info(noorder):
    """Mengambil informasi permintaan lab untuk mendapatkan no_rawat"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT no_rawat FROM permintaan_lab WHERE noorder = %s"
        cursor.execute(query, (noorder,))
        result = cursor.fetchone()
        return result['no_rawat'] if result else None
    except mysql.connector.Error as err:
        print(f"❌ Error getting lab request info: {err}")
        return None
    finally:
        if conn:
            conn.close()

def get_template_id(kd_jenis_prw, pemeriksaan):
    """Mendapatkan id_template berdasarkan kd_jenis_prw dan nama pemeriksaan"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor(dictionary=True)
        query = """
        SELECT id_template FROM template_laboratorium 
        WHERE kd_jenis_prw = %s AND Pemeriksaan = %s
        """
        cursor.execute(query, (kd_jenis_prw, pemeriksaan))
        result = cursor.fetchone()
        return result['id_template'] if result else None
    except mysql.connector.Error as err:
        print(f"❌ Error getting template ID: {err}")
        return None
    finally:
        if conn:
            conn.close()

def post_lab_results(noorder, lab_results_data):
    """POST hasil lab ke database"""
    conn = get_db_connection()
    if not conn:
        return {
            "success": False,
            "message": "Database connection failed",
            "payload": []
        }
    
    try:
        cursor = conn.cursor()
        
        # Get no_rawat dari permintaan lab
        no_rawat = get_lab_request_info(noorder)
        if not no_rawat:
            return {
                "success": False,
                "message": f"No lab request found for noorder: {noorder}",
                "payload": []
            }
        
        # Get current timestamp
        current_time = datetime.now()
        tgl_periksa = current_time.date()
        jam_periksa = current_time.time()
        
        # Insert hasil lab ke detail_periksa_lab
        insert_query = """
        INSERT INTO detail_periksa_lab 
        (no_rawat, kd_jenis_prw, tgl_periksa, jam, id_template, nilai, nilai_rujukan, keterangan, 
         bagian_rs, bhp, bagian_perujuk, bagian_dokter, bagian_laborat, kso, menejemen, biaya_item)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        inserted_count = 0
        for result in lab_results_data:
            # Get template ID
            template_id = get_template_id(result['kode_pemeriksaan'], result['nama_pemeriksaan'])
            if not template_id:
                print(f"⚠️ Template not found for: {result['nama_pemeriksaan']}")
                continue
            
            # Insert data
            cursor.execute(insert_query, (
                no_rawat,
                result['kode_pemeriksaan'],
                tgl_periksa,
                jam_periksa,
                template_id,
                result['hasil'],
                result['nilai_rujukan'],
                result['keterangan'],
                0.0,  # bagian_rs
                0.0,  # bhp
                0.0,  # bagian_perujuk
                0.0,  # bagian_dokter
                0.0,  # bagian_laborat
                0.0,  # kso
                0.0,  # menejemen
                0.0   # biaya_item
            ))
            inserted_count += 1
        
        # Update tanggal dan jam hasil permintaan lab
        update_query = """
        UPDATE permintaan_lab 
        SET tgl_hasil = %s, jam_hasil = %s
        WHERE noorder = %s
        """
        cursor.execute(update_query, (tgl_periksa, jam_periksa, noorder))
        
        # Commit transaction
        conn.commit()
        
        return {
            "success": True,
            "message": f"Lab results posted successfully for noorder: {noorder}",
            "payload": [
                {
                    "noorder": noorder,
                    "no_rawat": no_rawat,
                    "tgl_periksa": str(tgl_periksa),
                    "jam_periksa": str(jam_periksa),
                    "inserted_results": inserted_count,
                    "status": "updated"
                }
            ]
        }
        
    except mysql.connector.Error as err:
        conn.rollback()
        return {
            "success": False,
            "message": f"Database error: {str(err)}",
            "payload": []
        }
    finally:
        if conn:
            conn.close()

def main():
    """Main function untuk testing POST lab results"""
    print("🔬 POST Lab Results API - Python Version")
    print("=" * 60)
    
    # Test koneksi
    conn = get_db_connection()
    if not conn:
        print("❌ Database connection failed!")
        return
    conn.close()
    print("✅ Database connection successful!")
    
    # Data hasil lab yang akan di-POST (sama dengan PK202510020002)
    noorder = "PK202510020003"
    lab_results_data = [
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Hemoglobin",
            "hasil": "12.8",
            "nilai_rujukan": "12.0 - 16.0",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Leukosit",
            "hasil": "4.72*",
            "nilai_rujukan": "5 - 10",
            "keterangan": "L"
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Eritrosit",
            "hasil": "4.40",
            "nilai_rujukan": "4.0 - 5.5",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Hematokrit",
            "hasil": "36.8",
            "nilai_rujukan": "36 - 48",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Trombosit",
            "hasil": "274",
            "nilai_rujukan": "150 - 400",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Eosinofil",
            "hasil": "2.1",
            "nilai_rujukan": "1 - 3",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Basofil",
            "hasil": "04",
            "nilai_rujukan": "0 - 1",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Batang",
            "hasil": "0.2*",
            "nilai_rujukan": "2 - 6",
            "keterangan": "L"
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Neutrofil",
            "hasil": "63.0*",
            "nilai_rujukan": "40 - 60",
            "keterangan": "H"
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Limfosit",
            "hasil": "26.7",
            "nilai_rujukan": "20 - 45",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "Monosit",
            "hasil": "7.8*",
            "nilai_rujukan": "2 - 5",
            "keterangan": "H"
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "MCV",
            "hasil": "83.6",
            "nilai_rujukan": "80 - 97",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "MCH",
            "hasil": "29.1",
            "nilai_rujukan": "27 - 32",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "MCHC",
            "hasil": "34.8",
            "nilai_rujukan": "32 - 40",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "RDW-SD",
            "hasil": "39.2",
            "nilai_rujukan": "37.0 - 54.0",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "RDW-CV",
            "hasil": "12.7",
            "nilai_rujukan": "11.0 - 16.0",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "PCT",
            "hasil": "0.28",
            "nilai_rujukan": "0.17 - 0.35",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "MPV",
            "hasil": "10.3",
            "nilai_rujukan": "9.0 - 13.0",
            "keterangan": ""
        },
        {
            "kode_pemeriksaan": "L000005",
            "nama_pemeriksaan": "PDW",
            "hasil": "12.1*",
            "nilai_rujukan": "9.0 - 7.0",
            "keterangan": "H"
        }
    ]
    
    print(f"\n🔍 Posting lab results for noorder: {noorder}")
    print("-" * 60)
    
    # POST data hasil lab
    response = post_lab_results(noorder, lab_results_data)
    
    # Print response
    print("📋 POST Response:")
    print(json.dumps(response, indent=2, ensure_ascii=False))
    
    if response['success']:
        print(f"\n✅ Lab results posted successfully!")
        print(f"📊 Inserted {response['payload'][0]['inserted_results']} results")
        print(f"🔄 Status: {response['payload'][0]['status']}")
        print(f"📅 Date: {response['payload'][0]['tgl_periksa']}")
        print(f"⏰ Time: {response['payload'][0]['jam_periksa']}")

if __name__ == "__main__":
    main()
