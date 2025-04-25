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
const verifyDbConnection = async () => {
    try {
        const dbResponse = await pool.query('SELECT NOW()');
        console.log('PostgreSQL connected successfully');
        return {
            success: true,
            data: {
                dbResponse: dbResponse,
            }
        }
    } catch (error) {
        let errorMessage;
        if (error.code === '3D000') {
            const dbName = process.env.PG_DATABASE;
            errorMessage = `Database does not exist: ${dbName}`;
            console.log(`Error: Database does not exist. Please create the database before running the bot.\nCode: DB_NOT_FOUND | Database: ${dbName}`);
        } else {
            errorMessage = `PostgreSQL connection error: ${error.message}`;
            console.log('PostgreSQL connection error:', error);
        }

        return {
            success: false,
            errorType: "ERROR:EXCEPTION",
            errorCode: "DB_CONNECTION_ERROR",
            message: errorMessage,
            error: error,
        }
    }
};

const query = async (text, params) => {
    try {
        const res = await pool.query(text, params);
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
            errorType: "ERROR:EXCEPTION",
            errorCode: "DB_QUERY_ERROR",
            error: error,
        }
    }
}

module.exports = {
    verifyDbConnection,
    query,
    pool,
};