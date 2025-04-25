const path = require('path');
const UserAgent = require('user-agents');
const { getCookieJar, getClient, saveJar } = require('../utils');

function slugify_kingJouet(text = '') {
    return text
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/,/g, '')
        .replace(/–/g, '-')
        .replace(/[:!?.]/g, '')
        .replace(/[àâ]/g, 'a')
        .replace(/ç/g, 'c')
        .replace(/[éèêë]/g, 'e')
        .replace(/[îï]/g, 'i')
        .replace(/ô/g, 'o')
        .replace(/[ùûü]/g, 'u')
        .replace(/\s+/g, '-');
}

function generateProductUrl_kingJouet(title, reference, category, subcategory) {
    const catSlug = slugify_kingJouet(category);
    const subcatSlug = slugify_kingJouet(subcategory);
    const titleSlug = slugify_kingJouet(title);
    return `https://www.king-jouet.com/jeu-jouet/${catSlug}/${subcatSlug}/ref-${reference}-${titleSlug}.htm`;
}

const KING_JOUET_COOKIE_FILE = path.join(__dirname, 'cookies.json');

const getCookieJar_kingJouet = () => {
    const cookieJar = getCookieJar(KING_JOUET_COOKIE_FILE);
    return cookieJar;
}

const getClient_kingJouet = (cookieJar) => {
    const client = getClient(cookieJar, KING_JOUET_COOKIE_FILE);
    return client;
}

function saveJar_kingJouet(cookieJar) {
    saveJar(cookieJar, KING_JOUET_COOKIE_FILE);
}

function getRequestHeaders_kingJouet() {
    return {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'if-modified-since': 'Thu, 24 Apr 2025 17:31:38 GMT',
        'if-none-match': 'W/"67815-REG4YyHea3AktptAS164TvxLphI"',
        'priority': 'u=0, i',
        'referer': 'https://www.king-jouet.com/jeux-jouets/promotions/page1.htm',
        'sec-ch-device-memory': '8',
        'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        // 'user-agent': new UserAgent({ deviceCategory: 'desktop' }).toString(),
        'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    };
}

module.exports = {
    slugify_kingJouet,
    generateProductUrl_kingJouet,
    getClient_kingJouet,
    saveJar_kingJouet,
    getCookieJar_kingJouet,
    getRequestHeaders_kingJouet,
};