const { chromium } = require('playwright');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const UserAgent = require('user-agents');
const { getRandomProxy } = require('./utils/utils');

const safeEval = async (page, selector, evalFunction, timeout = 5000) => {
    const _timeout = timeout || 5000;
    try {
        await page.waitForSelector(selector, { timeout: _timeout });
        const data = await page.$eval(selector, evalFunction);
        return data;
    } catch (error) {
        return null;
    }
}

const safeExistsCheck = async (page, selector, timeout = 5000) => {
    const _timeout = timeout || 5000;
    try {
        await page.waitForSelector(selector, { timeout: _timeout });
        return true;
    }
    catch (error) {
        return false;
    }
}

const detectCaptcha = async (page, timeout) => {
    const _timeout = timeout || 5000;
    try {
        const iframeElement = await page.waitForSelector('iframe', { timeout: _timeout });

        if (!iframeElement) {
            return false;
        }

        const iframe = await iframeElement.contentFrame();
        if (!iframe) {
            return false;
        }

        const captchaExists = await iframe.$('#captcha-container');

        return captchaExists !== null;
    } catch (error) {
        return false;
    }
};

async function scrapeDartyBonsPlans() {
    try {
        // Get a random proxy
        const proxy = await getRandomProxy();

        if (!proxy.success) {
            console.log(proxy);
            return;
        }

        // console.log(proxy);
        // console.log(proxy.proxyString);
        // return;

        const proxyServerString = proxy.proxyServerString;

        // Generate a random user agent
        const userAgentInstance = new UserAgent();
        const userAgent = userAgentInstance.toString();

        const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

        // Launch browser with proxy settings and Brave executable
        const browser = await chromium.launch({
            headless: false,
            // executablePath: bravePath,
            // proxy: {
            //     server: proxyServerString,
            //     username: proxy.proxy.username,
            //     password: proxy.proxy.password
            // },
            proxy: {
                server: `http://fc7913a7ad2c1ce8.gdz.eu.pyproxy.io:16666`,
                username: `ritoncharlox1-zone-resi-region-fr`,
                password: `kinachaiyo55`
            },
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        });

        const context = await browser.newContext({
            // userAgent: userAgent,
            viewport: { width: 1280, height: 800 },
            javaScriptEnabled: true,
            ignoreHTTPSErrors: true,
            bypassCSP: true,
            // locale: "fr-FR",
            // timezoneId: "Europe/Paris",
        });

        // await context.addInitScript(() => {
        //     Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        //     Object.defineProperty(navigator, 'languages', {
        //         get: () => ['fr-FR', 'fr']
        //     });
        //     Object.defineProperty(navigator, 'plugins', {
        //         get: () => [1, 2, 3, 4, 5]
        //     });
        // });

        const page = await context.newPage();

        // 2/10
        await page.setExtraHTTPHeaders({
            // "Referer": "https://www.google.com/",
            // "Referer": "https://www.darty.com/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9,ne;q=0.8",
            "Cache-Control": "max-age=0",
            "Priority": "u=0, i",
            "Pragma": "no-cache",
            "Upgrade-Insecure-Requests": "1",
        });

        // console.log(proxy.proxyString);

        // Navigate to the Darty Bons Plans page
        const url = 'https://www.darty.com/nav/operation/bons-plans'; // sometimes blocked
        // const url = 'https://www.king-jouet.com/jeux-jouets/promotions/page1.htm'; // blocked on first try (similar captcha to darty)
        // const url = 'https://www.fnac.com/ventes-flash'; // blocked on first try (similar captcha to darty)
        // const url = 'https://www.carrefour.fr/promotions'; // worked on first try, but blocked after that (similar pattern to darty)
        // const url = 'https://www.bureau-vallee.fr'; // Not good website
        await page.goto(url, {
            waitUntil: "networkidle",
        });

        const captchaDetected = await detectCaptcha(page);

        console.log(captchaDetected);

        return;

        // Wait for products to load; adjust selector to your target element
        await page.waitForSelector('.product-item');

        // Evaluate the page to extract GTIN13 values from each product
        // Note: Adjust the selector (".product-item") and property ("data-gtin13") based on the actual page structure
        const productsGTIN = await page.$$eval('.product-item', items => {
            return items.map(item => {
                // Check if there's an attribute for GTIN13, or use innerText from a child element
                return item.getAttribute('data-gtin13') || '';
            }).filter(gtin => gtin.trim().length > 0);
        });

        console.log('Extracted GTIN13 values:', productsGTIN);

        await browser.close();
    } catch (error) {
        console.error('Error during scraping:', error);
    }
}

// Run the scraper
scrapeDartyBonsPlans();