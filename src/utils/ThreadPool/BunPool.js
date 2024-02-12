const { inspect } = require('util');
const DoublyLinkedList = require('dbly-linked-list');
const { ThreadPoolInterface } = require('./Interface');
const { BunWorker } = require('./BunWorker');

class BunPool extends ThreadPoolInterface {

    /** @type {boolean} */
    #isDoneAcceptingExec;
    /** @type {DoublyLinkedList<function(worker: BunWorker, messages: Map<number, function>): (function(resolver: function))>} */
    #queue;
    /** @type {Map<number, BunWorker>} */
    #wholePool;
    /** @type {BunWorker[]} */
    #idlePool;
    /** @type {Map<number, BunWorker>} */
    #busyPool;
    /** @type {Map<number, Map<number, function>>} workerId -> messageId -> resolve */
    #pending;

    /**
     * @typedef MessageToParent
     * @property {number} workerId 
     * @property {number} messageId 
     * @property {any} result 
     * @property {boolean} isDone 
     */

    /**
     * 
     * @param {number} workerId 
     * @param {number} messageId 
     * @param {any} result 
     * @param {boolean} isDone
     * @returns {MessageToParent}
     */
    static #createMessageToParent(workerId, messageId, result, isDone) {
        return {
            workerId,
            messageId,
            result,
            isDone
        };
    }

    /**
     * @inheritDoc
     * @param {object<string, function>} methods
     */
    static exportWorkerMethods(methods) {
        const { parentPort } = require('worker_threads');

        let missions = Promise.resolve();
        let isStopAcceptingMissions = false;

        parentPort.on('message',
            message => {
                const { workerId, messageId, isDone, functionName, args } = message;

                if (isStopAcceptingMissions)
                    throw new Error(`Worker received new mission after closing, method: ${functionName} ; isDone=${isDone}`);

                if (isDone) {
                    isStopAcceptingMissions = true;
                    missions = missions.then(() => {
                        parentPort.postMessage(BunPool.#createMessageToParent(workerId, messageId, undefined, true));
                        // parentPort.close(); // Thread terminate itself in `node`, doesn't do anything in `bun`.
                    });
                    return;
                }

                if (!methods.hasOwnProperty(functionName))
                    throw new Error(`Worker does not have the following method: ${functionName}`);
                if (typeof methods[functionName] !== 'function')
                    throw new Error(`Worker method ${functionName} isn't a function`);

                // Converts it to async function no matter what.
                const mission = async () => methods[functionName](...args);

                missions = missions.then(() =>
                    mission()
                        .then(result =>
                            parentPort.postMessage(BunPool.#createMessageToParent(workerId, messageId, result, false))
                        )
                );
            });
    }

    /**
     * @inheritDoc
     * @param {number} threadCount
     * @param {string} absolutePathToWorker
     */
    constructor(threadCount, absolutePathToWorker) {
        // noinspection JSCheckFunctionSignatures
        super();

        this.#isDoneAcceptingExec = false;
        this.#queue = new DoublyLinkedList();
        this.#wholePool = new Map();
        this.#busyPool = new Map();
        this.#idlePool = [];
        this.#pending = new Map();

        const messageHandler = this.#messageHandler.bind(this);
        for (let count = 0; count < threadCount; ++count) {
            const worker = new BunWorker(absolutePathToWorker);
            this.#pending.set(worker.id, new Map());
            worker.on('message', messageHandler);
            this.#idlePool.push(worker);
            this.#wholePool.set(worker.id, worker);
        }
    }

    /**
     * @param {MessageToParent} messageToParent 
     */
    #messageHandler(messageToParent) {
        const { workerId, messageId, result, isDone } = messageToParent;
        // console.log(`Shaked-TODO: messageHandler ; workerId=${workerId} ; messageId=${messageId} ; isDone=${isDone} ; pending=${inspect(this.#pending)}`);

        const messages = this.#pending.get(workerId);
        if (messages === undefined)
            throw new Error(`Worker isn't register: id=${workerId}`);

        const resolver = messages.get(messageId);
        if (resolver === undefined)
            throw new Error(`Message isn't register: id=${workerId} ; message=${messageId}`);

        messages.delete(messageId);
        resolver(result);

        if (messages.size !== 0) {
            if (isDone)
                throw new Error(`Worker has more missions but terminated before doing them: id=${workerId}`);
            return; // The thread has something else to do still, not giving him more missions.
        }

        const worker = this.#busyPool.get(workerId);
        if (worker === undefined)
            throw new Error(`Worker handled message but wasn't in busy pool: id=${workerId} ; message=${messageId} ; pending=${inspect(this.#pending)}`);
        this.#busyPool.delete(workerId);

        if (isDone) {
            worker.terminate();
            this.#wholePool.delete(workerId);
        }

        const messagePosterWithoutWorkerNode = this.#queue.removeFirst();
        if (messagePosterWithoutWorkerNode === null) {
            this.#idlePool.push(worker);
            return;
        }

        this.#postMessageToWorker(worker, messagePosterWithoutWorkerNode.getData());
    }

    /**
     * @param {function(): void} resolve
     * @param {string} methodName 
     * @param {any[]} args 
     * @returns {function(worker: BunWorker): void}
     */
    #messagePosterExec(resolve, methodName, args) {
        return (worker => {
            const messages = this.#pending.get(worker.id);
            if (messages === undefined)
                throw new Error(`Worker isn't register: id=${worker.id}`);

            const messageId = worker.postExecMessage(methodName, args);
            messages.set(messageId, resolve);
        }).bind(this);
    }

    /**
     * @param {function(): void} resolve
     * @returns {function(worker: BunWorker): void}
     */
    #messagePosterDone(resolve) {
        return (worker => {
            const messages = this.#pending.get(worker.id);
            if (messages === undefined)
                throw new Error(`Worker isn't register: id=${worker.id}`);

            const messageId = worker.postDoneMessage();
            messages.set(messageId, resolve);
        }).bind(this);
    }

    /**
     * @param {BunWorker} worker
     * @param {function(worker: BunWorker): void} messagePoster
     */
    #postMessageToWorker(worker, messagePoster) {
        this.#busyPool.set(worker.id, worker);
        messagePoster(worker);
    }

    /**
     * @inheritDoc
     * @param {string} methodName
     * @param {any[]} args
     * @return {Promise<any>}
     */
    async exec(methodName, args) {
        if (this.#isDoneAcceptingExec)
            throw new Error('Trying to submit new exec to terminated thread pool');

        return new Promise(resolve => {
            const messagePosterWithoutWorker = this.#messagePosterExec(resolve, methodName, args);

            const worker = this.#idlePool.pop();
            if (worker !== undefined)
                return this.#postMessageToWorker(worker, messagePosterWithoutWorker);

            this.#queue.insert(messagePosterWithoutWorker);
        });
    }

    /**
     * @inheritDoc
     */
    async terminate() {
        if (this.#isDoneAcceptingExec)
            throw new Error(`Thread pool is already terminated`);

        this.#isDoneAcceptingExec = true;
        return Promise.all(Object.values(Object.fromEntries(this.#wholePool)).map(worker =>
            new Promise(resolve =>
                this.#postMessageToWorker(worker, this.#messagePosterDone(resolve))
            )
        ));
    }
}

module.exports = {
    BunPool
}
