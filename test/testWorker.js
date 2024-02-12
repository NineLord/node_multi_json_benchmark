process.env["IS_BUN"] = process.env["IS_BUN"] === undefined ? "true" : process.env["IS_BUN"];
const { ThreadPool } = require('../src/utils/ThreadPool');

/**
 * @param {number} a 
 * @param {number} b 
 * @returns {number}
 */
function add(a, b) {
    return a + b;
}

/**
 * @param {number} amount 
 * @returns {Promise<void>}
 */
async function sleep(amount) {
    return new Promise(resolve => setTimeout(resolve, amount));
}

/**
 * @param {number} amount 
 */
function busyWait(amount) {
    const startTime = Date.now() + amount;
    let count = 0;
    while (Date.now() < startTime)
        ++count;
}

/**
 * @param {number} amount 
 * @param {number} a 
 * @param {number} b 
 * @returns {Promise<number>}
 */
async function sleepAndAdd(amount, a, b) {
    await sleep(amount);
    return add(a, b);
}

ThreadPool.exportWorkerMethods({
    add,
    sleep,
    busyWait,
    sleepAndAdd
});