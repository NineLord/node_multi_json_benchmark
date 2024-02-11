//#region Imports
// Node
const { resolve } = require('path');

// Project
const { ThreadPool } = require('../../utils/ThreadPool');
const Reporter = require('../Reporter');
const reporter = Reporter.reporter;
//#endregion

const characterPool = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz!@#$%&";

class RunTestLoop {

	#threadPool;
	#testCount;
	#valueToSearch
	#hasAllTestBeenSubmitted;
	#numberOfFinishedTests;
	#numberOfTests;

	/**
	 * Creates an instance of this class.
	 * @param {number} threadCount The number of threads to use when running the tests.
	 * @param {number} testCount The number of times to run each test, has to be at least 1.
	 * @param {any} valueToSearch The value to be searched in the BFS/DFS tests.
	 */
	constructor(threadCount, testCount, valueToSearch) {
		this.#threadPool = new ThreadPool(resolve(__dirname, './TestWorker.js'), threadCount);
		this.#testCount = testCount;
		this.#valueToSearch = valueToSearch;
		this.#hasAllTestBeenSubmitted = false;
		this.#numberOfFinishedTests = 0;
		this.#numberOfTests = 0;
	}

	/**
	 * Run the test on loop and measure it.
	 * @param {string} jsonName The JSON name that being tested.
	 * @param {number} numberOfLetters The number of letters that will be in the generated JSON.
	 * @param {number} depth The depth of the JSON that will be generated.
	 * @param {number} numberOfChildren The number of children nodes that will be in the generated JSON.
	 * @param {string} rawJson The JSON to be be tested on.
	 * @return {Promise<void>} Returns when done testing.
	 */
	runTest(jsonName, numberOfLetters, depth, numberOfChildren, rawJson) {
		++this.#numberOfTests;
		const testName = 'Test 1';
		let testPromise = this.#runSingleTest(testName, jsonName, numberOfLetters, depth, numberOfChildren, rawJson);

		for (let counter = 1; counter < this.#testCount; ++counter) {
			const testName = `Test ${counter + 1}`;
			testPromise = testPromise.then(() =>
				this.#runSingleTest(testName, jsonName, numberOfLetters, depth, numberOfChildren, rawJson)
			);
		}

		testPromise = testPromise.then(() => {
			++this.#numberOfFinishedTests;
			return this.#tryTerminate();
		});

		return testPromise;
	}

	async signalFinishedSubmittingTests() {
		this.#hasAllTestBeenSubmitted = true;
		return this.#tryTerminate();
	}

	/**
	 * Run a single round of the test and measure it.
	 * @param {string} testCount The counter of the test (unique name for it).
	 * @param {string} jsonName The JSON name that being tested.
	 * @param {number} numberOfLetters The number of letters that will be in the generated JSON.
	 * @param {number} depth The depth of the JSON that will be generated.
	 * @param {number} numberOfChildren The number of children nodes that will be in the generated JSON.
	 * @param {string} rawJson The JSON to be be tested on.
	 * @return {Promise<void>} Returns when done testing.
	 */
	async #runSingleTest(testCount, jsonName, numberOfLetters, depth, numberOfChildren, rawJson) {
		return reporter.measureAsync(testCount, jsonName, Reporter.TOTAL_INCLUDE_CONTEXT_SWITCH, async () => {
			await reporter.measureAsync(testCount, jsonName, Reporter.GENERATE_JSON, async () =>
				this.#threadPool.exec('generateJson', [true, characterPool, numberOfLetters, depth, numberOfChildren, numberOfChildren]));
			const actualJson = await reporter.measureAsync(testCount, jsonName, Reporter.DESERIALIZE_JSON, async () =>
				this.#threadPool.exec('deserialize', [rawJson]));
			let isFound = await reporter.measureAsync(testCount, jsonName, Reporter.ITERATE_ITERATIVELY, async () =>
				this.#threadPool.exec('breadthFirstSearch', [actualJson, this.#valueToSearch]));
			if (isFound) {
				console.error(`BFS the tree found value in ${jsonName} that shouldn't be in it: ${this.#valueToSearch}`);
				process.exit(1);
			}
			isFound = await reporter.measureAsync(testCount, jsonName, Reporter.ITERATE_RECURSIVELY, async () =>
				this.#threadPool.exec('depthFirstSearch', [actualJson, this.#valueToSearch]));
			if (isFound) {
				console.error(`DFS the tree found value in ${jsonName} that shouldn't be in it: ${this.#valueToSearch}`);
				process.exit(1);
			}
			const backToRawJson = await reporter.measureAsync(testCount, jsonName, Reporter.SERIALIZE_JSON, async () =>
				this.#threadPool.exec('serialize', [actualJson]));
		});
	}

	async #tryTerminate() {
		if (this.#hasAllTestBeenSubmitted && this.#numberOfTests === this.#numberOfFinishedTests)
			return this.#threadPool.terminate();
	}
}

module.exports = {
	RunTestLoop
}
