const { BunPool } = require('./BunPool');
const { WorkerPool } = require('./WorkerPool');

const isBun = process.env["IS_BUN"] === "true";
module.exports = {
    ThreadPool: isBun ? BunPool : WorkerPool
};