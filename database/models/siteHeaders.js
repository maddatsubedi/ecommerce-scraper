const db = require('../db');

const createSiteHeadersTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS siteheaders (
            id SERIAL PRIMARY KEY,
            site TEXT NOT NULL,
            path TEXT NOT NULL,
            headers JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            UNIQUE (site, path)
        );
    `;

    const tableRes = await db.query(createTableQuery);
    if (!tableRes.success) return false;

    const createFunctionQuery = `
        CREATE OR REPLACE FUNCTION update_siteheaders_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `;

    const functionRes = await db.query(createFunctionQuery);
    if (!functionRes.success) return false;

    const checkTriggerQuery = `
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_siteheaders_updated_at'
    `;

    const triggerRes = await db.query(checkTriggerQuery);
    if (!triggerRes.success) return false;

    if (triggerRes.data.dbResponse.rows.length === 0) {
        const createTriggerQuery = `
            CREATE TRIGGER update_siteheaders_updated_at
            BEFORE UPDATE ON siteheaders
            FOR EACH ROW
            EXECUTE FUNCTION update_siteheaders_updated_at()
        `;
        const triggerCreateRes = await db.query(createTriggerQuery);
        if (!triggerCreateRes.success) return false;
    }

    return true;
};

const setSiteHeaders = async (site, key, value) => {
    const queryText = `
        INSERT INTO siteheaders (site, key, value)
        VALUES ($1, $2, $3)
        ON CONFLICT (site, key)
        DO UPDATE SET value = EXCLUDED.value;
    `;
    const res = await db.query(queryText, [site, key, value]);
    return res.success ? true : false;
};

const getSiteHeaders = async (site, key) => {
    const queryText = `
        SELECT value FROM siteheaders WHERE site = $1 AND key = $2;
    `;
    const res = await db.query(queryText, [site, key]);
    return res.success ? res.data.dbResponse.rows[0]?.value : false;
};

const getAllSiteHeaderss = async (site) => {
    const queryText = `
        SELECT key, value FROM siteheaders WHERE site = $1;
    `;
    const res = await db.query(queryText, [site]);
    return res.success ? res.data.dbResponse.rows : false;
};

const unsetSiteHeaders = async (site, key) => {
    const res = await setSiteHeaders(site, key, null);
    return res ? true : res === false ? false : true;
};

const deleteSiteHeaders = async (site, key) => {
    const queryText = `
        DELETE FROM siteheaders WHERE site = $1 AND key = $2;
    `;
    const res = await db.query(queryText, [site, key]);
    return res.success ? true : false;
};

const resetSiteHeaders = async (site) => {
    const queryText = `
        DELETE FROM siteheaders WHERE site = $1;
    `;
    const res = await db.query(queryText, [site]);
    return res.success ? true : false;
};

const addMultiValueSiteHeaders = async (site, key, value, separator) => {
    const existingValue = await getSiteHeaders(site, key);
    if (existingValue === false) return false;
    let existingValuesArray = existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
    if (existingValuesArray.includes(value)) {
        return false;
    }
    existingValuesArray.push(value);
    const newValue = existingValuesArray.join(separator);
    const res = await setSiteHeaders(site, key, newValue);
    return res ? true : res === false ? false : true;
};

const getMultiValueSiteHeaders = async (site, key, separator) => {
    const existingValue = await getSiteHeaders(site, key);
    if (existingValue === false) return false;
    return existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
};

const removeMultiValueSiteHeaders = async (site, key, value, separator) => {
    const existingValue = await getSiteHeaders(site, key);
    if (existingValue === false) return false;
    let existingValuesArray = existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
    if (!existingValuesArray.includes(value)) {
        return false;
    }
    const newValue = existingValuesArray.filter(val => val !== value).join(separator);
    const res = await setSiteHeaders(site, key, newValue || null);
    return res ? true : res === false ? false : true;
};

module.exports = {
    createSiteHeadersTable,
    setSiteHeaders,
    getSiteHeaders,
    getAllSiteHeaderss,
    unsetSiteHeaders,
    deleteSiteHeaders,
    resetSiteHeaders,
    addMultiValueSiteHeaders,
    getMultiValueSiteHeaders,
    removeMultiValueSiteHeaders,
};