const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Verify connection on startup
(async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('PostgreSQL connected successfully');
    } catch (error) {
        if (error.code === '3D000') {
            const dbName = process.env.PG_DATABASE;
            console.log(`Error: Database does not exist. Please create the database before running the bot.\nCode: DB_NOT_FOUND | Database: ${dbName}`);
        } else {
            console.log('PostgreSQL connection error:', error);
        }
        process.exit(1); // Exit process with failure
    }
})();

const query = async (text, params) => {
    try {
        const res = await pool.query(text, params);
        // console.log("============ DB QUERY ============");
        // console.log(res);
        // console.log("==================================");
        return {
            success: true,
            data: {
                dbResponse: res,
            }
        };
    } catch (error) {
        console.error('Error executing query', error);
        return {
            success: false,
            data: {
                errorType: "ERROR:EXCEPTION",
                errorCode: "DB_QUERY_ERROR",
                error: error,
            }
        }
    }
}

module.exports = {
    query,
    pool,
};