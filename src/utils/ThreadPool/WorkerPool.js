const {ThreadPoolInterface} = require('./Interface');
const workerPool = require('workerpool');

class WorkerPool extends ThreadPoolInterface {

    #pool;

    /**
     * @inheritDoc
     */
    static exportWorkerMethods(methods) {
        return workerPool.worker(methods);
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
    WorkerPool
}
