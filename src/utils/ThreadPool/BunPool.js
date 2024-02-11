const { ThreadPoolInterface } = require('./Interface');
const { Worker } = require('worker_threads');

class BunPool extends ThreadPoolInterface {

    /** @type {boolean} */
    #isDoneAcceptingExec;
    #queue;
    #idlePool;
    #busyPool;

    /**
     * @inheritDoc
     */
    static exportWorkerMethods(methods) {
        const { parentPort } = require('worker_threads');

        let missions = Promise.resolve();
        let isStopAcceptingMissions = false;

        parentPort.on('message', message => {
            const {
                /** @type {boolean} */
                isDone,
                /** @type {string} */
                functionName,
                /** @type {any[]} */
                args
            } = message;

            if (isDone) {
                isStopAcceptingMissions = true;
                missions.finally(() => parentPort.close()); // Doesn't do anything in `bun`, only works in node.
            }

            if (isStopAcceptingMissions)
                throw new Error(`Worker received new mission after closing, method: ${functionName}`);
            if (!methods.hasOwnProperty(functionName))
                throw new Error(`Worker does not have the following method: ${functionName}`);
            if (typeof methods[functionName] !== 'function')
                throw new Error(`Worker method ${functionName} isn't a function`);

            // Converts it to async function no matter what.
            const mission = async () => methods[functionName](...args);

            missions = missions.then(() =>
                mission()
                    .then(result => {
                        parentPort.postMessage(result);
                    })
            );
        });
    }

    /**
     * @inheritDoc
     */
    constructor(threadCount, absolutePathToWorker) {
        // noinspection JSCheckFunctionSignatures
        super();

        this.#isDoneAcceptingExec = false;
        this.#queue = [];
        this.#busyPool = [];
        this.#idlePool = [];

        for (let count = 0; count < threadCount; ++count) {
            const worker = new Worker(absolutePathToWorker);
            worker.on('message', result => {

            });
            this.#idlePool.push(worker);
        }
    }

    /**
     * @inheritDoc
     */
    async exec(methodName, args) {
        return this.#pool.exec(methodName, args);
    }

    /**
     * @inheritDoc
     */
    async terminate() {
        return this.#pool.terminate();
    }
}

module.exports = {
    BunPool
}
