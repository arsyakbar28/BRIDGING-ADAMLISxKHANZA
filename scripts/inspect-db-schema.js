/**
 * Database Schema Inspector
 * Connects to DB and dumps structure of lab-related tables for PK/PA/MB implementation.
 * Usage: node scripts/inspect-db-schema.js
 * Requires: .env with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const LAB_TABLES = [
  'permintaan_lab',
  'permintaan_labpa',
  'permintaan_labmb',
  'permintaan_detail_permintaan_lab',
  'permintaan_detail_permintaan_labmb',
  'periksa_lab',
  'detail_periksa_lab',
  'detail_periksa_labpa',
  'saran_kesan_lab',
  'template_laboratorium',
  'jns_perawatan_lab',
  'dokter',
  'petugas',
  'pasien',
  'reg_periksa',
  'poliklinik',
  'penjab',
  'kamar_inap',
  'kamar',
  'bangsal',
  'penyakit',
  'diagnosa_pasien',
];

async function run() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'adhyaksa_db',
    user: process.env.DB_USER || 'adhyaksa',
    password: process.env.DB_PASSWORD || '',
  };

  console.log('Connecting to:', config.host + ':' + config.port + '/' + config.database);
  let conn;

  try {
    conn = await mysql.createConnection(config);
  } catch (e) {
    console.error('Connection failed:', e.message);
    process.exit(1);
  }

  const out = [];
  out.push('# Database Schema Inspection');
  out.push(`Database: ${config.database}`);
  out.push(`Host: ${config.host}:${config.port}`);
  out.push(`At: ${new Date().toISOString()}`);
  out.push('');

  try {
    // All tables
    const [tables] = await conn.execute('SHOW TABLES');
    const tableList = tables.map((r) => Object.values(r)[0]);
    out.push('## All tables in database');
    out.push('```');
    out.push(tableList.join('\n'));
    out.push('```');
    out.push('');

    // Lab-related tables: DESCRIBE + sample kategori if exists
    for (const table of LAB_TABLES) {
      if (!tableList.includes(table)) {
        out.push(`## ${table}`);
        out.push('*(table not found)*');
        out.push('');
        continue;
      }

      out.push(`## ${table}`);
      const [cols] = await conn.execute(`DESCRIBE \`${table}\``);
      out.push('### Columns');
      out.push('| Field | Type | Null | Key | Default | Extra |');
      out.push('|-------|------|------|-----|---------|-------|');
      for (const c of cols) {
        out.push(`| ${c.Field} | ${c.Type} | ${c.Null} | ${c.Key} | ${c.Default ?? 'NULL'} | ${c.Extra} |`);
      }
      out.push('');

      // If table has kategori, show distinct values
      const hasKategori = cols.some((c) => c.Field.toLowerCase() === 'kategori');
      if (hasKategori) {
        const [k] = await conn.execute(`SELECT DISTINCT kategori FROM \`${table}\` LIMIT 20`);
        const vals = k.map((r) => r.kategori).filter(Boolean);
        out.push('### Distinct `kategori` values');
        out.push(vals.length ? vals.join(', ') : '*(empty)*');
        out.push('');
      }

      // Row count
      const [cnt] = await conn.execute(`SELECT COUNT(*) as c FROM \`${table}\``);
      out.push('### Row count');
      out.push(String(cnt[0].c));
      out.push('');
    }

    // jns_perawatan_lab: list kategori and sample kd_jenis_prw
    if (tableList.includes('jns_perawatan_lab')) {
      const [kategoriRows] = await conn.execute(
        "SELECT kategori, COUNT(*) as cnt FROM jns_perawatan_lab GROUP BY kategori ORDER BY kategori"
      );
      out.push('## jns_perawatan_lab – Summary by kategori');
      out.push('| kategori | count |');
      out.push('|----------|-------|');
      for (const r of kategoriRows) {
        out.push(`| ${r.kategori ?? 'NULL'} | ${r.cnt} |`);
      }
      out.push('');
    }

    // permintaan_lab: sample noorder prefix (PK/PA/MB)
    if (tableList.includes('permintaan_lab')) {
      const [sample] = await conn.execute(
        "SELECT DISTINCT LEFT(noorder, 2) as prefix, COUNT(*) as cnt FROM permintaan_lab GROUP BY LEFT(noorder, 2) ORDER BY cnt DESC LIMIT 10"
      );
      out.push('## permintaan_lab – noorder prefix (sample)');
      out.push('| prefix | count |');
      out.push('|--------|-------|');
      for (const r of sample) {
        out.push(`| ${r.prefix ?? 'NULL'} | ${r.cnt} |`);
      }
      out.push('');
    }
  } catch (e) {
    out.push('Error: ' + e.message);
    console.error(e);
  } finally {
    if (conn) await conn.end();
  }

  const outPath = path.join(__dirname, '..', 'DB_SCHEMA_INSPECTED.md');
  fs.writeFileSync(outPath, out.join('\n'), 'utf8');
  console.log('Schema written to:', outPath);
}

run();
