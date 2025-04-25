const axios = require("axios");
const { randomChoice } = require("./helpers2");
require("dotenv").config();

async function getProxy() {
    try {
        const webshareToken = process.env.WEBSHARE_KEY;
        const webshareAPI = "https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=25";
        const apiResponse = await axios.get(webshareAPI, {
            headers: {
                Authorization: "Token " + webshareToken
            }
        })
        if (!apiResponse || apiResponse.status !== 200) {
            return {
                success: false,
                errorType: "ERROR:API",
                errorCode: "WEBSHARE_API_ERROR",
                error: apiResponse
            }
        }
        const apiData = await apiResponse.data;
        return {
            success: true,
            data: {
                proxies: apiData.results
            }
        }
    } catch (error) {
        return {
            success: false,
            errorType: "ERROR:EXCEPTION",
            errorCode: "WEBSHARE_API_ERROR",
            error: error
        }
    }

}

async function getRandomProxy() {
    const proxies = await getProxy();
    if (!proxies.success) {
        return proxies;
    }

    const proxiesData = proxies.data.proxies;
    const randomProxy = randomChoice(proxiesData);
    const proxyString = `http://${randomProxy.username}:${randomProxy.password}@${randomProxy.proxy_address}:${randomProxy.port}`
    const proxyServerString = `http://${randomProxy.proxy_address}:${randomProxy.port}`

    return {
        success: true,
        data: {
            proxy: randomProxy,
            proxyString,
            proxyServerString,
        }
    };
}

module.exports = {
    getProxy,
    getRandomProxy
}