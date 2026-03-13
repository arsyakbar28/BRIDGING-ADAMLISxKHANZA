/**
 * DB String Helper
 * Normalisasi string agar aman untuk kolom MySQL/MariaDB yang pakai charset
 * latin1 atau utf8 (tanpa mb4) — karakter Unicode seperti ≤, ≥ bisa menyebabkan
 * "Incorrect string value" saat insert.
 */

const REPLACEMENTS = [
    ['≤', '<='],
    ['≥', '>='],
    ['±', '+/-'],
    ['×', 'x'],
    ['÷', '/'],
    ['°', ' derajat'],
    ['µ', 'u'],
    ['–', '-'],
    ['—', '-'],
    ['″', '"'],
    ['′', "'"],
    ['\u2018', "'"],
    ['\u2019', "'"],
    ['\u201C', '"'],
    ['\u201D', '"']
];

/**
 * Normalisasi string untuk insert/update ke DB (ganti simbol Unicode ke ASCII)
 * @param {string|null|undefined} str - Nilai dari API
 * @returns {string} String yang aman untuk kolom DB
 */
function normalizeStringForDb(str) {
    if (str === null || str === undefined) return '';
    let s = String(str).trim();
    for (const [from, to] of REPLACEMENTS) {
        s = s.split(from).join(to);
    }
    return s;
}

module.exports = {
    normalizeStringForDb
};
