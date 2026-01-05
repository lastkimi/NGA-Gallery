"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.getClient = getClient;
const pg_1 = require("pg");
const config_1 = require("../config");
exports.pool = new pg_1.Pool({
    host: config_1.config.database.host,
    port: config_1.config.database.port,
    database: config_1.config.database.name,
    user: config_1.config.database.user,
    password: config_1.config.database.password,
    min: config_1.config.database.pool.min,
    max: config_1.config.database.pool.max,
});
// Log pool errors
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// Query helper with automatic cleanup
async function query(text, params) {
    const start = Date.now();
    const result = await exports.pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
        console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
}
// Get client for transactions
async function getClient() {
    const client = await exports.pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);
    // Set a timeout of 5 seconds, after which we release the client
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);
    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release();
    };
    return client;
}
//# sourceMappingURL=database.js.map