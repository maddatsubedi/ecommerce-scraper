const fs = require('fs');
const cheerio = require('cheerio');
const { createObjectCsvWriter } = require('csv-writer');
const UserAgent = require('user-agents');
const { generateProductUrl_kingJouet, getClient_kingJouet, saveJar_kingJouet, getSiteHeaders_kingJouet, updateSiteHeaders_kingJouet, getUserAgent_kingJouet, setUserAgent_kingJouet } = require('./utils.js');
const { randomSleep, randomInt, BoolCache } = require('../../utils/helpers2.js');
const path = require('path');
const siteConfig = require('./siteConfig.json');
const { log } = require('../../utils/discordUtils.js');
const { simpleEmbed } = require('../../embeds/generalEmbeds.js');
const { getSiteConfig, setSiteConfig } = require('../../database/models/siteConfig.js');
const { isGlobalScrapingEnabled, enableGlobalScraping, disableGlobalScraping } = require('../utils.js');
const { getSiteHeaders } = require('../../database/models/siteHeaders.js');

const { selectors, baseUrl, promotionUrl, defaultPagesToScrape, initialReferrer, retryableStatusCodes, pageEndStatusCode, notModifiedStatusCode } = siteConfig;

const csvFilepath = path.join(__dirname, 'products.csv');

async function parseAndSaveProductData(htmlContent, pageUrl) {
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
                Page: pageUrl,
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
        console.info(`✅ Page ${pageUrl}: ${products.length} products saved to CSV.`);
    } else {
        console.warn(`⚠️ No product data found on page ${pageUrl}.`);
    }
}

async function fetchPage_kingJouet(httpClient, reqUrl, reqHeaders) {

    try {

        const { client } = httpClient;

        let response;
        try {
            response = await client.get(reqUrl, {
                headers: reqHeaders,
                validateStatus: () => true,
            });
        } catch (err) {
            return {
                success: false,
                message: 'Network error',
                error: err,
                data: {
                    response: response,
                }
            };
        }

        const { status, data: html } = response;

        if (status === 200) {

            const $ = cheerio.load(html);

            const productSection = $(selectors.productSection);
            let productsHtml = null;
            if (productSection.length) {
                productsHtml = productSection.html();
            }

            return {
                success: true,
                message: 'Page fetched successfully',
                data: {
                    status,
                    productsHtml,
                    response,
                }
            };
        }

        return {
            success: false,
            message: 'Failed to fetch products from page',
            error: response.statusText,
            data: {
                status,
                response,
            }
        }

    } catch (error) {
        console.error(`❌ Error fetching page: ${error.message}`);
        return {
            success: false,
            message: 'Error fetching page',
            error: error,
        };
    }
}

async function retryFetchPage(
    httpClient,
    pageIndex,
    maxRetries = 3,
    minDelay = 10,
    maxDelay = 20,
    rateLimitMinDelay = 15,
    rateLimitMaxDelay = 30
) {

    console.log(`📄 Fetching page ${pageIndex}`);

    const pageUrl = `${promotionUrl}/page${pageIndex}.htm`;

    const reqUrl = `${baseUrl}/${pageUrl}`;
    const prevReqUrl = `${baseUrl}/${promotionUrl}/page${pageIndex - 1}.htm`;

    const referrer = pageIndex === 1 ? initialReferrer : prevReqUrl;
    const userAgent = await getUserAgent_kingJouet();
    const reqHeaders = await getSiteHeaders_kingJouet(pageUrl, referrer, userAgent);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {

        const { cookieJar } = httpClient;

        const pageData = await fetchPage_kingJouet(httpClient, reqUrl, reqHeaders);

        const resHeaders = pageData.data?.response?.headers;
        const status = pageData.data?.status;

        if (pageData.success || status === notModifiedStatusCode) {
            saveJar_kingJouet(cookieJar);
            await updateSiteHeaders_kingJouet(reqHeaders, resHeaders, pageUrl);
            await setUserAgent_kingJouet(userAgent);
            return pageData;
        }

        if (!pageData.data || !status) {
            console.log(`❌ No data received for page ${reqUrl} | Code: EXCEPTION_ERROR`);
            return pageData;
        }


        if (status === 403) {
            console.log(`❌ Access forbidden (403). Stopping further processing.`);
        } else if (status === notModifiedStatusCode) { // 304 Not Modified
            console.log(`❌ Not modified (304). Stopping further processing.`);
            console.log("********HEADERS*********");
            console.log(reqHeaders);
            console.log(resHeaders);
            console.log("*************************");
        } else if (status === 404) {
            console.log(`❌ Page not found (404). Stopping further processing.`);
        } else if ([500, 301, 302].includes(status)) {
            console.log(`❌ Server error or redirection: Status ${status} on page`);
        } else if (status === 503) {
            console.log(`⚠️ Service unavailable (503). Sleeping before retrying...`);
        } else if (status === 429) {
            console.log(`⚠️ Rate limited (429). Sleeping longer before retrying...`);
        } else if (status === 408) {
            console.log(`⚠️ Request timeout (408). Sleeping before retrying...`);
        } else if (status === pageEndStatusCode) { // 410 Gone
            console.log(`❌ Page no longer available (410). Stopping further processing.`);
        } else {
            console.log(`❌ Unhandled status code ${status}.`);
        }

        const isRetryable = retryableStatusCodes.includes(status);
        const isRateLimited = status === 429;

        if (!isRetryable) {
            console.error(`❌ Non-retryable status code ${status}. Stopping further attempts.`);
            return pageData;
        }

        if (attempt === maxRetries) {
            console.error(`❌ All ${maxRetries} attempts failed.`);
            return pageData;
        }

        const waitSec = isRateLimited
            ? randomInt(rateLimitMinDelay, rateLimitMaxDelay)
            : randomInt(minDelay, maxDelay);

        console.log(
            `⚠️ Attempt ${attempt} failed (status ${status}). ` +
            `Waiting ${waitSec}s before retrying...`
        );
        await randomSleep(waitSec);
    }
}

const runKingJouetScraper = async (discordClient, pagesToScrape) => {

    const lastPageScraped = await getSiteConfig('king-jouet', 'last_page_scraped') || 0;
    let lastPageScrapedInt = parseInt(lastPageScraped, 10);

    if (isNaN(lastPageScrapedInt) || lastPageScrapedInt < 0) {
        lastPageScrapedInt = 0;
    }

    let pageEnded = false;
    let _pageIndex = lastPageScrapedInt;

    const pageSuccessCache = new BoolCache(10);

    for (let pageIndex = lastPageScrapedInt + 1; pageIndex <= pagesToScrape; pageIndex++) {

        const httpClient = getClient_kingJouet();

        const pageData = await retryFetchPage(httpClient, pageIndex, 3, 10, 20, 15, 30);
        const { success, message, error, data } = pageData;

        const status = data?.status;
        const productsHtml = data?.productsHtml;

        if (status === pageEndStatusCode) {
            pageEnded = true;
            break;
        }

        if (!success && status !== notModifiedStatusCode) {
            console.error(`❌ Error fetching page ${pageIndex}: ${message} | Code: ${status}`);
            pageSuccessCache.add(false);

            if (pageSuccessCache.areLastAll(3, false)) {
                console.error(`❌ Last 3 attempts failed. Stopping further processing.`);
                break;
            }
        } else {
            console.log(`✅ Page ${pageIndex} fetched successfully.`);
            pageSuccessCache.add(true);
        }

        pageSuccessCache.add(true);

        await setSiteConfig('king-jouet', 'last_page_scraped', pageIndex);
        _pageIndex = pageIndex;
        await randomSleep(randomInt(10, 20));
    }

    const lastThreeFailed = pageSuccessCache.areLastAll(3, false);
}

const kingJouetScraperMain = async (discordClient) => {

    const pagesToScrape = await getSiteConfig('king-jouet', 'pages_to_scrape') || defaultPagesToScrape;
    let pagesToScrapeInt = parseInt(pagesToScrape, 10);

    if (isNaN(pagesToScrapeInt) || pagesToScrapeInt < 0) {
        pagesToScrapeInt = defaultPagesToScrape;
    }

    // await log(
    //     {
    //         embeds: [
    //             simpleEmbed({
    //                 title: `King Jouet Scraper`,
    //                 description: `Starting King Jouet Scraper`,
    //                 color: 'Yellow',
    //                 setTimestamp: true,
    //                 footer: "Sniper-Resell",
    //                 footerIcon: "https://i.ibb.co/Qvrzr74X/adsfadsfadsfads.png"
    //             }).addFields(
    //                 { name: 'Pages to scrape', value: `${pagesToScrapeInt}`, inline: true },
    //                 { name: 'Base URL', value: `${baseUrl}`, inline: true },
    //                 { name: 'Promotion URL', value: `\`${promotionUrl}\``, inline: true },
    //             )
    //         ]
    //     },
    //     "1353252301057298475",
    //     discordClient,
    //     'default'
    // );

    const scrapingResult = await runKingJouetScraper(discordClient, pagesToScrapeInt);
};

module.exports = {
    kingJouetScraperMain
}