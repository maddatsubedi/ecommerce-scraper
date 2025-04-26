const path = require('path');
const UserAgent = require('user-agents');
const { getCookieJar, getClient, saveJar } = require('../utils');
const { setSiteHeaders, getSiteHeaders } = require('../../database/models/siteHeaders');
const { setSiteConfig, getSiteConfig } = require('../../database/models/siteConfig');

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

async function getRequestHeaders_kingJouet(userAgent) {
    return {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'priority': 'u=0, i',
        'referer': 'https://www.king-jouet.com/',
        'sec-ch-device-memory': '8',
        'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': userAgent || await getUserAgent_kingJouet(),
    };
}

function refreshUserAgent_kingJouet(headers) {
    const userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString();
    headers['user-agent'] = userAgent;
    return headers;
}

async function getUserAgent_kingJouet() {
    const userAgentDb = await getSiteConfig('king-jouet', 'user_agent');
    return userAgentDb || new UserAgent({ deviceCategory: 'desktop' }).toString();
}

async function setUserAgent_kingJouet(userAgent) {
    return await setSiteConfig('king-jouet', 'user_agent', userAgent);
}

async function refreshUserAgent_kingJouet() {
    const userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString();
    const dbSuccess = await setUserAgent_kingJouet(userAgent);
    return {
        dbSuccess,
        userAgent,
    };
}

async function getSiteHeaders_kingJouet(pageUrl, referrer, userAgent) {
    const headers = await getSiteHeaders('king-jouet', pageUrl) || await getRequestHeaders_kingJouet(userAgent);
    if (referrer) {
        headers['referer'] = referrer;
    }
    if (userAgent) {
        headers['user-agent'] = userAgent;
    }
    return headers;
}

async function updateSiteHeaders_kingJouet(headers, resHeaders, pageUrl, referrer, userAgent) {
    const eTag = resHeaders?.['etag'];
    const lastModified = resHeaders?.['last-modified'];
    headers['if-none-match'] = eTag || headers['if-none-match'];
    headers['if-modified-since'] = lastModified || headers['if-modified-since'];

    if (referrer) {
        headers['referer'] = referrer;
    }

    if (userAgent) {
        headers['user-agent'] = userAgent;
    }

    const dbSuccess =  await setSiteHeaders('king-joutet', pageUrl, headers);

    return {
        dbSuccess,
        headers,
    }
}

module.exports = {
    slugify_kingJouet,
    generateProductUrl_kingJouet,
    getClient_kingJouet,
    saveJar_kingJouet,
    getCookieJar_kingJouet,
    getRequestHeaders_kingJouet,
    refreshUserAgent_kingJouet,
    updateSiteHeaders_kingJouet,
    getSiteHeaders_kingJouet,
    getUserAgent_kingJouet,
    setUserAgent_kingJouet,
};