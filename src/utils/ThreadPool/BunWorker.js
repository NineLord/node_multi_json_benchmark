const { Worker } = require('worker_threads');

class BunWorker extends Worker {

    static #counter = 0;

    #id;
    #messageIdCounter;

    /**
     * @param {string} absolutePathToWorker
     */
    constructor(absolutePathToWorker) {
        super(absolutePathToWorker);

        this.#id = ++BunWorker.#counter;
        this.#messageIdCounter = 0;
    }

    /**
     * @returns {number}
     */
    get id() {
        return this.#id;
    }

    //#region MessageToWorker
    /**
     * @typedef MessageToWorker
     * @property {number} workerId
     * @property {number} messageId
     * @property {boolean} isDone
     * @property {undefined|string} functionName
     * @property {undefined|any[]} args
     * 
     * @exports
     */

    /**
     * @returns {number}
     */
    postDoneMessage() {
        const messageId = ++this.#messageIdCounter;
        this.postMessage(this.#createMessageToWorker(messageId, true));
        return messageId;
    }

    /**
     * @param {string} functionName
     * @param {any[]} args
     * @returns {number}
     */
    postExecMessage(functionName, args) {
        const messageId = ++this.#messageIdCounter;
        this.postMessage(this.#createMessageToWorker(messageId, false, functionName, args));
        return messageId;
    }

    /**
     * @param {number} messageId
     * @param {boolean} isDone
     * @param {string} [functionName]
     * @param {any[]} [args]
     * @returns {MessageToWorker}
     */
    #createMessageToWorker(messageId, isDone, functionName, args) {
        return {
            workerId: this.#id,
            messageId,
            isDone,
            functionName,
            args
        };
    }
    //#endregion
}

module.exports = {
    BunWorker
}