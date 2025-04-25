const { kingJouetScraperMain } = require("./king-jouet");

const scraperInit = async (client) => {
    const scraperMainResult = await scraperMain(client);
}

const scraperMain = async (client) => {
    const kingJouetScraperResponse = await kingJouetScraperMain(client);
}

module.exports = {
    scraperInit,
}