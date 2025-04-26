const { default: axios } = require('axios');
const fs = require('fs');
const { HttpCookieAgent, HttpsCookieAgent } = require('http-cookie-agent/http');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { CookieJar } = require('tough-cookie');
const { getConfig, setConfig } = require('../database/models/config');
require('dotenv').config()

const PROXY_USER = process.env.PROXY_USER;
const PROXY_PASS = process.env.PROXY_PASS;
const PROXY_HOST = process.env.PROXY_HOST;
const PROXY_PORT = process.env.PROXY_PORT;

const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
const proxyAgent = new HttpsProxyAgent(proxyUrl);

const getCookieJar = (cookieFile) => {
    let cookieJar;
    try {
        cookieJar = fs.existsSync(cookieFile) ?
            CookieJar.deserializeSync(JSON.parse(fs.readFileSync(cookieFile))) :
            new CookieJar();
    } catch (err) {
        cookieJar = new CookieJar();
    }
    return cookieJar;
}

const getClient = (_cookieJar, cookieFile) => {
    const cookieJar = _cookieJar || getCookieJar(cookieFile);
    const client = axios.create({
        httpAgent: new HttpCookieAgent(
            {
                cookies: {
                    jar: cookieJar
                },
            }
        ),
        httpsAgent: new HttpsCookieAgent(
            {
                cookies: {
                    jar: cookieJar
                },
            }
        ),
        withCredentials: true
    });
    return {
        client,
        cookieJar
    };
}

function saveJar(cookieJar, cookieFile) {
    const serialized = cookieJar.serializeSync();
    fs.writeFileSync(cookieFile, JSON.stringify(serialized, null, 2));
}

const disableGlobalScraping = async () => {
    return await setConfig('global_scraping', '0');
};

const enableGlobalScraping = async () => {
    return await setConfig('global_scraping', '1');
}

const isGlobalScrapingEnabled = async () => {
    const configValue = await getConfig('global_scraping');
    return configValue === '1' ? true : configValue === '0' ? false : configValue;
}

module.exports = {
    proxyAgent,
    getCookieJar,
    getClient,
    saveJar,
    disableGlobalScraping,
    enableGlobalScraping,
    isGlobalScrapingEnabled
};