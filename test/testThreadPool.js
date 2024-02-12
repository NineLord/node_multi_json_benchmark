const { resolve } = require('path');
const { inspect } = require('util');
process.env["IS_BUN"] = "true";
const { ThreadPool } = require('../src/utils/ThreadPool');

/**
 * @param {number} amount 
 * @returns {Promise<void>}
 */
async function sleep(amount) {
    return new Promise(resolve => setTimeout(resolve, amount));
}

async function yieldToOtherPromises() {
    return new Promise(resolve => {
        setTimeout(() =>
            setImmediate(() =>
                setTimeout(resolve, 0)
            ), 0)
    });
}

async function main() {
    const pool = new ThreadPool(1, resolve(__dirname, './testWorker.js'));
    console.log(`1+2=${await pool.exec('add', [1, 2])}`);
    console.log(`3+4=${await pool.exec('add', [3, 4])}`);
    console.log(`5+6=${await pool.exec('add', [5, 6])}`);

    await sleep(1_000);
    await yieldToOtherPromises();
    console.log('Finished sleeping');

    const sleepAmount = 5_000;
    console.log(`First race winner: ${inspect(await Promise.race([
        pool.exec('sleep', [sleepAmount]),
        pool.exec('busyWait', [sleepAmount]),
        pool.exec('add', [8, 8]),
    ]))}`);
}
main();