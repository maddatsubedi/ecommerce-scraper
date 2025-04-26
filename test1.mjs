import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { setTimeout as sleep } from 'timers/promises';
import { createObjectCsvWriter } from 'csv-writer';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { fileURLToPath } from 'url';
import UserAgent from 'user-agents';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIE_FILE = path.join(__dirname, 'cookies.json');

const PROXY_USER = 'ritoncharlox1-zone-resi';
const PROXY_PASS = 'kinachaiyo55';
const PROXY_HOST = 'fc7913a7ad2c1ce8.shg.na.pyproxy.io';
const PROXY_PORT = 16666;

const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
const proxyAgent = new HttpsProxyAgent(proxyUrl);

let jar;
try {
    jar = fs.existsSync(COOKIE_FILE) ?
        CookieJar.deserializeSync(JSON.parse(fs.readFileSync(COOKIE_FILE))) :
        new CookieJar();
} catch (err) {
    console.error('❌ Cookie load error:', err.message);
    jar = new CookieJar();
}

// 2. Wrap axios with cookie-jar support
const client1 = wrapper(axios.create({
    jar,
    withCredentials: true,
}));

const client = axios.create({
    httpAgent: new HttpCookieAgent(
        {
            cookies: {
                jar
            },
        }
    ),
    httpsAgent: new HttpsCookieAgent(
        {
            cookies: {
                jar
            },
        }
    ),
});

// 3. After any request(s), persist the jar
async function saveJar() {
    const serialized = jar.serializeSync();
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(serialized, null, 2));
}

function slugify(text = '') {
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

function generateKingJouetUrl(title, reference, category, subcategory) {
    const catSlug = slugify(category);
    const subcatSlug = slugify(subcategory);
    const titleSlug = slugify(title);
    return `https://www.king-jouet.com/jeu-jouet/${catSlug}/${subcatSlug}/ref-${reference}-${titleSlug}.htm`;
}

async function parseAndSaveProductData(htmlContent, pageIndex, csvFilepath) {
    const $ = cheerio.load(htmlContent);
    const productEls = $('div[data-ekind="Product"]');
    const products = [];

    productEls.each((_, el) => {
        const hiddenInput = $(el).find('input[type="hidden"]');
        if (!hiddenInput.length) return;

        try {
            const productJson = JSON.parse(hiddenInput.attr('value'));
            const title = productJson.Libelle;
            const reference = productJson.Reference;
            const category = productJson.Segmentation;
            const subcategory = productJson.Segmentation02;

            const product = {
                Page: pageIndex,
                Title: title,
                Brand: productJson.Marque,
                Reference: reference,
                Category: category,
                Subcategory: subcategory,
                Availability: productJson.DisponibleCentrale
                    ? 'Available in central stock'
                    : 'Not available',
                PriceHT: productJson.PuHT,
                PriceTTC: productJson.PuTTC,
                SalePriceHT: productJson.PuPromoHT,
                SalePriceTTC: productJson.PuPromoTTC,
                DiscountPercentage: productJson.PctRemise,
                ID: productJson.ID,
                dateDebutPromo: productJson.DateDebutPromo,
                dateFinPromo: productJson.DateFinPromo,
                'product url': generateKingJouetUrl(
                    (title || '').replace(/---|--/g, '-'),
                    reference,
                    (category || '').replace(/&/g, ''),
                    (subcategory || '').split(' ')[0]
                ),
                EAN: '',
                ASIN: '',
                Amazon_Brand: '',
                Amazon_Price: '',
                Amazon_URL: ''
            };

            products.push(product);
        } catch (err) {
            console.error(`❌ Error parsing product JSON: ${err.message}`);
        }
    });

    if (products.length) {
        const fileExists = fs.existsSync(csvFilepath);
        const csvWriter = createObjectCsvWriter({
            path: csvFilepath,
            header: Object.keys(products[0]).map(key => ({ id: key, title: key })),
            append: fileExists
        });
        await csvWriter.writeRecords(products);
        console.info(`✅ Page ${pageIndex}: ${products.length} products saved to CSV.`);
    } else {
        console.warn(`⚠️ No product data found on page ${pageIndex}.`);
    }
}

async function fetchAndProcessPage(pageNumber, headers, csvFilepath) {
    const url = `https://www.king-jouet.com/jeux-jouets/promotions/page${pageNumber}.htm`;
    console.info(`📄 Fetching page ${pageNumber}: ${url}`);

    let response;
    try {
        response = await client.get(url, {
            headers,
            validateStatus: () => true,
        });
    } catch (err) {
        console.error(`❌ Network error on page ${pageNumber}:`, err.message);
        return false;
    }

    const { status, data: html } = response;

    if (status === 200) {
        console.info(`✅ Page ${pageNumber} fetched successfully.`);
        const $ = cheerio.load(html);

        const productSection = $('div.ais-Hits-list.list-articles.grid.grid-cols-2.md\\:grid-cols-3.gap-1.xl\\:grid-cols-4.2xl\\:grid-cols-5.2xl\\:gap-4');
        if (productSection.length) {
            await parseAndSaveProductData(productSection.html(), pageNumber, csvFilepath);
        } else {
            console.warn(`⚠️ No product container found on page ${pageNumber}.`);
        }

        await saveJar();

        // Sleep 8–22 seconds
        const sleepSec = Math.floor(Math.random() * (22 - 8 + 1)) + 8;
        console.info(`😴 Sleeping for ${sleepSec} seconds to mimic human behavior.`);
        await sleep(sleepSec * 1000);
        return true;

    } else if ([403, 304].includes(status)) {
        console.warn(`⚠️ Access issue or not modified: Status ${status} on page ${pageNumber}.`);
        return true;

    } else if (status === 404) {
        console.error(`❌ Page ${pageNumber} not found (404). Stopping further processing.`);
        return false;

    } else if ([500, 301, 302].includes(status)) {
        console.error(`❌ Server error or redirection: Status ${status} on page ${pageNumber}.`);
        return false;

    } else if (status === 503) {
        console.warn(`⚠️ Service unavailable (503). Sleeping before retrying...`);
        await sleep((Math.floor(Math.random() * (60 - 30 + 1)) + 30) * 1000);
        return true;

    } else if (status === 429) {
        console.warn(`⚠️ Rate limited (429). Sleeping longer before retrying...`);
        await sleep((Math.floor(Math.random() * (120 - 60 + 1)) + 60) * 1000);
        return true;

    } else if (status === 408) {
        console.warn(`⚠️ Request timeout (408). Sleeping before retrying...`);
        await sleep((Math.floor(Math.random() * (30 - 10 + 1)) + 10) * 1000);
        return true;

    } else {
        console.error(`❌ Unhandled status code ${status} for page ${pageNumber}.`);
        return false;
    }
}

function getRequestHeaders() {
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
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    };
}

fetchAndProcessPage(1, getRequestHeaders(), 'products.csv');