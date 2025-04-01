const db = require('../db');

const createGuildConfigTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS guildconfig (
            id SERIAL PRIMARY KEY,
            guildId TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            UNIQUE (guildId, key)
        );
    `;

    const tableRes = await db.query(createTableQuery);
    if (!tableRes.success) return false;

    const createFunctionQuery = `
        CREATE OR REPLACE FUNCTION update_guildconfig_updated_at()
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
        WHERE tgname = 'update_guildconfig_updated_at'
    `;

    const triggerRes = await db.query(checkTriggerQuery);
    if (!triggerRes.success) return false;

    if (triggerRes.data.dbResponse.rows.length === 0) {
        const createTriggerQuery = `
            CREATE TRIGGER update_guildconfig_updated_at
            BEFORE UPDATE ON guildconfig
            FOR EACH ROW
            EXECUTE FUNCTION update_guildconfig_updated_at()
        `;
        const triggerCreateRes = await db.query(createTriggerQuery);
        if (!triggerCreateRes.success) return false;
    }

    return true;
};

const setGuildConfig = async (guildId, key, value) => {
    const queryText = `
        INSERT INTO guildconfig (guildId, key, value)
        VALUES ($1, $2, $3)
        ON CONFLICT (guildId, key)
        DO UPDATE SET value = EXCLUDED.value;
    `;
    const res = await db.query(queryText, [guildId, key, value]);
    return res.success ? true : false;
};

const getGuildConfig = async (guildId, key) => {
    const queryText = `
        SELECT value FROM guildconfig WHERE guildId = $1 AND key = $2;
    `;
    const res = await db.query(queryText, [guildId, key]);
    return res.success ? res.data.dbResponse.rows[0]?.value : false;
};

const getAllGuildConfigs = async (guildId) => {
    const queryText = `
        SELECT key, value FROM guildconfig WHERE guildId = $1;
    `;
    const res = await db.query(queryText, [guildId]);
    return res.success ? res.data.dbResponse.rows : false;
};

const unsetGuildConfig = async (guildId, key) => {
    const res = await setGuildConfig(guildId, key, null);
    return res ? true : res === false ? false : true;
};

const deleteGuildConfig = async (guildId, key) => {
    const queryText = `
        DELETE FROM guildconfig WHERE guildId = $1 AND key = $2;
    `;
    const res = await db.query(queryText, [guildId, key]);
    return res.success ? true : false;
};

const resetGuildConfig = async (guildId) => {
    const queryText = `
        DELETE FROM guildconfig WHERE guildId = $1;
    `;
    const res = await db.query(queryText, [guildId]);
    return res.success ? true : false;
};

const addMultiValueGuildConfig = async (guildId, key, value, separator) => {
    const existingValue = await getGuildConfig(guildId, key);
    if (existingValue === false) return false;
    let existingValuesArray = existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
    if (existingValuesArray.includes(value)) {
        return false;
    }
    existingValuesArray.push(value);
    const newValue = existingValuesArray.join(separator);
    const res = await setGuildConfig(guildId, key, newValue);
    return res ? true : res === false ? false : true;
};

const getMultiValueGuildConfig = async (guildId, key, separator) => {
    const existingValue = await getGuildConfig(guildId, key);
    if (existingValue === false) return false;
    return existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
};

const removeMultiValueGuildConfig = async (guildId, key, value, separator) => {
    const existingValue = await getGuildConfig(guildId, key);
    if (existingValue === false) return false;
    let existingValuesArray = existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
    if (!existingValuesArray.includes(value)) {
        return false;
    }
    const newValue = existingValuesArray.filter(val => val !== value).join(separator);
    const res = await setGuildConfig(guildId, key, newValue || null);
    return res ? true : res === false ? false : true;
};

module.exports = {
    createGuildConfigTable,
    setGuildConfig,
    getGuildConfig,
    getAllGuildConfigs,
    unsetGuildConfig,
    deleteGuildConfig,
    resetGuildConfig,
    addMultiValueGuildConfig,
    getMultiValueGuildConfig,
    removeMultiValueGuildConfig,
};