const { ThreadPoolInterface } = require('./Interface');
const { Worker, MessageChannel, MessagePort } = require('worker_threads');

class BunPool extends ThreadPoolInterface {

    #queue;
    #pool;

    /**
     * @inheritDoc
     */
    static exportWorkerMethods(methods) {
        const { workerData: { parentPort } } = require('worker_threads');

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
                missions.finally(() => parentPort.close());
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
        super(threadCount, absolutePathToWorker);

        this.#pool = workerPool.pool(absolutePathToWorker, {
            maxWorkers: threadCount,
            minWorkers: threadCount
        });
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
