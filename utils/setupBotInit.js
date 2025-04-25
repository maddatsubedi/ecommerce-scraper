const { removeExpiredRoles } = require("../database/models/subscription");
const { initPolling } = require("../tracking/polling");
const { runExpiredSubscriptionsRemoval } = require("./discordUtils");
const { dbSetup } = require("./dbSetup");
const { scraperInit } = require("../scraper");

const setupBotInit = async (client) => {
    const dbSetupResponse = await dbSetup();
    if (!dbSetupResponse.success) {
        
        console.log("Database setup failed");
        console.log(dbSetupResponse);

        return dbSetupResponse;
    }

    scraperInit(client);
};

module.exports = {
    setupBotInit
}