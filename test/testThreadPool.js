const { resolve } = require('path');
const { inspect } = require('util');
process.env["IS_BUN"] = process.env["IS_BUN"] === undefined ? "true" : process.env["IS_BUN"];
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

function getTime() {
    return (new Date()).toISOString();
}

async function main() {
    const pool = new ThreadPool(2, resolve(__dirname, './testWorker.js'));
    console.log(`${getTime()} 1+2=${await pool.exec('add', [1, 2])}`);
    console.log(`${getTime()} 3+4=${await pool.exec('add', [3, 4])}`);
    console.log(`${getTime()} 5+6=${await pool.exec('add', [5, 6])}`);

    await sleep(1_000);
    await yieldToOtherPromises();
    console.log(`${getTime()} Finished sleeping`);

    const sleepAmount = 5_000;
    const printAndReturn = prefix => {
        return result => {
            console.log(`${getTime()} ${prefix} :: result=${inspect(result)}`);
            return result;
        }
    };
    const all = inspect(await Promise.all([
        pool.exec('sleep', [sleepAmount]).then(printAndReturn('sleep')),
        pool.exec('busyWait', [sleepAmount]).then(printAndReturn('busyWait')),
        pool.exec('add', [8, 8]).then(printAndReturn('8+8')),
    ]));
    console.log(`${getTime()} First race winner: ${all}`);

    await pool.terminate();
}
main();