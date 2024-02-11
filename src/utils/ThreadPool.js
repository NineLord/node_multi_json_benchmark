const isBun = process.env["IS_BUN"] === "true";
let poolModule;
if (isBun) {
    const { resolve } = require('path');
    poolModule = require(resolve(__dirname, '../../node_modules/poolifier-bun/lib/index.js'));
} else {
    poolModule = require('workerpool');
}

class ThreadPool {

    #workerPool;
    #poolifierPool;

    /**
     * @param {object<string, function>} methods 
     */
    static exportWorkerMethods(methods) {
        if (isBun) {
            // Shaked-TODO:
        } else {
            poolModule.worker(methods);
        }
    }

    /**
     * @param {string} absolutePathToWorker 
     * @param {number} threadCount 
     */
    constructor(absolutePathToWorker, threadCount) {
        if (isBun) {
            this.#workerPool = null;
            this.#poolifierPool = new poolModule.FixedThreadPool(threadCount, absolutePathToWorker);
        } else {
            this.#poolifierPool = null;
            this.#workerPool = poolModule.pool(absolutePathToWorker, {
                maxWorkers: threadCount,
                minWorkers: threadCount
            });
        }
    }

    /**
     * @param {string} methodName 
     * @param {any[]} args 
     * @return {Promise<any>}
     */
    async exec(methodName, args) {
        if (isBun) {
            // Shaked-TODO
        } else {
            return this.#workerPool.exec(methodName, args);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async terminate() {
        if (isBun) {
            // Shaked-TODO
        } else {
            return this.#workerPool.terminate();
        }
    }
}

module.exports = {
    ThreadPool
}
