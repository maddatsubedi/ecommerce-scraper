const { createSubscriptionTable } = require('../database/models/subscription');
const { createGuildConfigTable } = require('../database/models/guildConfig');
const { createConfigTable } = require('../database/models/config');
const { createPriceRangeTable } = require('../database/models/discount_range');
const { createSubscriptionRolesTable } = require('../database/models/subscriptionRoles');
const { createSiteConfigTable } = require('../database/models/siteConfig');
const { verifyDbConnection } = require('../database/db');
const { createSiteHeadersTable } = require('../database/models/siteHeaders');


const dbSetup = async () => {
    const dbConnVerification = await verifyDbConnection();

    if (!dbConnVerification.success) {
        return dbConnVerification;
    }

    const dbTablesInit = await Promise.all([
        createGuildConfigTable(),
        createConfigTable(),
        createSiteConfigTable(),
        createSiteHeadersTable()
    ]);

    const guildConfigTableSuccess = dbTablesInit[0];
    const configTableSuccess = dbTablesInit[1];
    const siteConfigTableSuccess = dbTablesInit[2];
    const siteHeadersTableSuccess = dbTablesInit[3];

    if (!guildConfigTableSuccess || !configTableSuccess || !siteConfigTableSuccess || !siteHeadersTableSuccess) {
        return {
            success: false,
            message: 'Failed to create database tables',
            data: {
                dbConnVerification: dbConnVerification,
            }
        };
    }

    return {
        success: true,
        message: 'Database tables created successfully',
        data: {
            dbConnVerification: dbConnVerification,
        }
    }
}

module.exports = {
    dbSetup
}