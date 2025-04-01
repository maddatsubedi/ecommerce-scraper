// config.js
const db = require('../db');

const createConfigTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS config (
            id SERIAL PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    `;
    
    const tableRes = await db.query(createTableQuery);
    if (!tableRes.success) return false;

    const createFunctionQuery = `
            CREATE OR REPLACE FUNCTION update_config_updated_at()
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
            WHERE tgname = 'update_config_updated_at'
        `;

    const triggerRes = await db.query(checkTriggerQuery);
    if (!triggerRes.success) return false;

    if (triggerRes.data.dbResponse.rows.length === 0) {
        const createTriggerQuery = `
                CREATE TRIGGER update_config_updated_at
                BEFORE UPDATE ON config
                FOR EACH ROW
                EXECUTE FUNCTION update_config_updated_at()
            `;
        const triggerCreateRes = await db.query(createTriggerQuery);
        if (!triggerCreateRes.success) return false;
    }

    return true;
};

const setConfig = async (key, value) => {
    const queryText = `
        INSERT INTO config (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value;
    `;
    const res = await db.query(queryText, [key, value]);
    return res.success ? true : false;
};

const getConfig = async (key) => {
    const queryText = `
        SELECT value FROM config WHERE key = $1;
    `;
    const res = await db.query(queryText, [key]);
    return res.success ? res.data.dbResponse.rows[0]?.value : false;
};

const getAllConfigs = async () => {
    const queryText = `SELECT * FROM config;`;
    const res = await db.query(queryText);
    return res.success ? res.data.dbResponse.rows : false;
};

const unsetConfig = async (key) => {
    const res = await setConfig(key, null);
    return res ? true : res === false ? false : true;
};

const deleteConfig = async (key) => {
    const queryText = `DELETE FROM config WHERE key = $1;`;
    const res = await db.query(queryText, [key]);
    return res.success ? true : false;
};

const resetConfig = async () => {
    const queryText = `DELETE FROM config;`;
    const rest = await db.query(queryText);
    return rest.success ? true : false;
};

const addMultiValueConfig = async (key, value, separator) => {
    const existingValue = await getConfig(key);
    if (existingValue === false) return false;
    let existingValuesArray = existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
    if (existingValuesArray.includes(value)) {
        return false;
    }
    existingValuesArray.push(value);
    const newValue = existingValuesArray.join(separator);
    const res = await setConfig(key, newValue);
    return res ? true : res === false ? false : true;
};

const getMultiValueConfig = async (key, separator) => {
    const existingValue = await getConfig(key);
    if (existingValue === false) return false;
    return existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
};

const removeMultiValueConfig = async (key, value, separator) => {
    const existingValue = await getConfig(key);
    if (existingValue === false) return false;
    let existingValuesArray = existingValue
        ? existingValue.split(separator).map(val => val.trim()).filter(Boolean)
        : [];
    if (!existingValuesArray.includes(value)) {
        return false;
    }
    const newValue = existingValuesArray.filter(val => val !== value).join(separator);
    const res = await setConfig(key, newValue || null);
    return res ? true : res === false ? false : true;
};

module.exports = {
    createConfigTable,
    setConfig,
    getConfig,
    getAllConfigs,
    unsetConfig,
    deleteConfig,
    resetConfig,
    addMultiValueConfig,
    getMultiValueConfig,
    removeMultiValueConfig
};