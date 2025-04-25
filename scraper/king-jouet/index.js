const fs = require('fs');
const cheerio = require('cheerio');
const { createObjectCsvWriter } = require('csv-writer');
const UserAgent = require('user-agents');
const { generateProductUrl_kingJouet, getClient_kingJouet, saveJar_kingJouet, getRequestHeaders_kingJouet } = require('./utils.js');
const { randomSleep, randomInt } = require('../../utils/helpers2.js');
const path = require('path');
const siteConfig = require('./siteConfig.json');
const { log } = require('../../utils/discordUtils.js');
const { simpleEmbed } = require('../../embeds/generalEmbeds.js');

const { selectors, baseUrl, promotionUrl } = siteConfig;

const csvFilepath = path.join(__dirname, 'products.csv');

async function parseAndSaveProductData(htmlContent, pageIndex, csvFilepath) {
    const $ = cheerio.load(htmlContent);
    const productEls = $(selectors.productElement);
    const products = [];

    productEls.each((_, el) => {
        const hiddenInput = $(el).find(selectors.productHiddenInput);
        if (!hiddenInput.length) return;

        try {
            const productJson = JSON.parse(hiddenInput.attr('value'));
            const title = productJson.Libelle;
            const reference = productJson.Reference;
            const category = productJson.Segmentation;
            const subcategory = productJson.Segmentation02;
            const productUrl = generateProductUrl_kingJouet(
                (title || '').replace(/---|--/g, '-'),
                reference,
                (category || '').replace(/&/g, ''),
                (subcategory || '').split(' ')[0]
            )

            const product = {
                Page: pageIndex,
                Title: title,
                Brand: productJson.Marque,
                Tag: productJson.Tag,
                Reference: reference,
                Category: category,
                Subcategory: subcategory,
                AvailableForOrder: productJson.DisponibleCommande,
                AvailableInCentralStock: productJson.DisponibleCentrale,
                AvailableInStores: productJson.DisponibleMagasin,
                PriceHT: productJson.PuHT,
                PriceTTC: productJson.PuTTC,
                SalePriceHT: productJson.PuPromoHT,
                SalePriceTTC: productJson.PuPromoTTC,
                DiscountPercentage: productJson.PctRemise,
                ID: productJson.ID,
                MainImage: productJson.MainImage,
                SmallImage: productJson.SmallImage,
                IntermediateImage: productJson.IntermediateImage,
                dateDebutPromo: productJson.DateDebutPromo,
                dateFinPromo: productJson.DateFinPromo,
                ProductUrl: productUrl,
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
        const exists = fs.existsSync(csvFilepath);
        const stats = exists ? fs.statSync(csvFilepath) : null;

        const append = exists && stats.size > 0;

        const csvWriter = createObjectCsvWriter({
            path: csvFilepath,
            header: Object.keys(products[0]).map(key => ({ id: key, title: key })),
            append: append
        });
        await csvWriter.writeRecords(products);
        console.info(`✅ Page ${pageIndex}: ${products.length} products saved to CSV.`);
    } else {
        console.warn(`⚠️ No product data found on page ${pageIndex}.`);
    }
}

async function fetchAndProcessPage(pageNumber, headers, csvFilepath) {

    const url = `${baseUrl}/${promotionUrl}/page${pageNumber}.htm`;

    console.info(`📄 Fetching page ${pageNumber}: ${url}`);

    const { client, cookieJar } = getClient_kingJouet();

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

    saveJar_kingJouet(cookieJar);

    const { status, data: html, headers: resHeaders } = response;

    if (status === 200) {

        console.info(`✅ Page ${pageNumber} fetched successfully.`);

        const eTag = resHeaders['etag'];
        const lastModified = resHeaders['last-modified'];

        const $ = cheerio.load(html);

        const productSection = $(selectors.productSection);
        if (productSection.length) {
            await parseAndSaveProductData(productSection.html(), pageNumber, csvFilepath);
        } else {
            console.warn(`⚠️ No product container found on page ${pageNumber}.`);
        }

        const sleepSec = randomInt(8, 22);
        console.info(`😴 Sleeping for ${sleepSec} seconds to mimic human behavior.`);
        await randomSleep(sleepSec);
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
        await randomSleep(30, 60);
        return true;

    } else if (status === 429) {
        console.warn(`⚠️ Rate limited (429). Sleeping longer before retrying...`);
        await randomSleep(60, 120);
        return true;

    } else if (status === 408) {
        console.warn(`⚠️ Request timeout (408). Sleeping before retrying...`);
        await randomSleep(10, 30);
        return true;

    } else {
        console.error(`❌ Unhandled status code ${status} for page ${pageNumber}.`);
        return false;
    }
}

const kingJouetScraperMain = async (client) => {
    await log(
        {
            embeds: [simpleEmbed({
                description: `**Starting King Jouet Scraper**`,
                color: 'Yellow',
            })]
        },
        "1353252301057298475",
        client,
        'default'
    );
};

fetchAndProcessPage(1, getRequestHeaders_kingJouet(), csvFilepath);

module.exports = {
    kingJouetScraperMain
}