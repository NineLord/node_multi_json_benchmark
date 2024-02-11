class ThreadPoolInterface {

    // noinspection JSClosureCompilerSyntax
    /**
     * @param {object<string, function>} methods
     * @return {void}
     */
    static exportWorkerMethods(methods) {
        throw new Error('Not Implemented');
    }

    /**
     * @param {number} threadCount
     * @param {string} absolutePathToWorker
     */
    constructor(threadCount, absolutePathToWorker) {
    }

    /**
     * @param {string} methodName
     * @param {any[]} args
     * @return {Promise<any>}
     */
    async exec(methodName, args) {
        throw new Error('Not Implemented');
    }

    /**
     * @returns {Promise<void>}
     */
    async terminate() {
        throw new Error('Not Implemented');
    }
}

module.exports = {
    ThreadPoolInterface
}
