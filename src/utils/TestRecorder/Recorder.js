//#region Imports
// Node
const { PerformanceObserver, performance } = require('perf_hooks');

// Project
const { UniqueIdGenerator } = require('./UniqueIdGenerator');
//#endregion

/**
 * A class for measuring performance, warping up the `node:perf_hooks` package.
 * Note: Using the `node:perf_hooks` package in conjunction with this class may lead to unexpected behaviors.
 */
class TestRecorder {

	static #MEASURE_DELIMITER = '!!!!!';
	static #MARK_PREFIX_DELIMITER = '#####';

	#markUniqueIdGenerator;
	#performanceObserver; /** {PerformanceObserver} The class that observes the performance measurements */
	#hasStarted; /** {boolean} If true, this class has been started */

	/**
	 * @callback OnMeasureCallback
	 * @param {string} measureId The unique ID of measurement.
	 * @param {number} duration The duration of the measurement.
	 * @return {void}
	 */

	/**
	 * Creates a new instance of this class.
	 */
	constructor() {
		this.#markUniqueIdGenerator = new UniqueIdGenerator(TestRecorder.#MARK_PREFIX_DELIMITER);
		this.#hasStarted = false;
	}

	/**
	 * Starts listening to measurements.
	 * If not started, the given callback won't be called.
	 * @param {OnMeasureCallback} callback Will be call on every measurement.
	 * @return {TestRecorder} This instance of the TestRecorder.
	 */
	start(callback) {
		this.#performanceObserver = new PerformanceObserver(
			performanceObserverEntryList =>
				performanceObserverEntryList
					.getEntries()
					.forEach(performanceEntry => callback(performanceEntry.name, performanceEntry.duration))
		);
		this.#performanceObserver.observe({ entryTypes: ['measure'] });
		this.#hasStarted = true;
		return this;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Stops listening to measurements.
	 * The given callback won't be called anymore.
	 * @return {TestRecorder} This instance of the TestRecorder.
	 */
	stop() {
		this.#performanceObserver.disconnect();
		this.#hasStarted = false;
		return this;
	}

	/**
	 * Removes all mark IDs (if there are other instances of this class active, it will also effect them).
	 */
	clear() {
		performance.clearMarks();
		this.#markUniqueIdGenerator.clear();
	}

	//#region Measure
	/**
	 * Mark the current line with the given mark name.
	 * @param {string} markName The mark name.
	 * @return {string} The unique ID of this mark line.
	 */
	startMeasuring(markName) {
		if (!this.#hasStarted)
			throw new Error(`The recorder wasn't started! call start() method first`);

		const markId = this.#markUniqueIdGenerator.getNewUniqueId(markName);
		performance.mark(markId);
		return markId;
	}

	/**
	 * Mark the current line with given mark name and measures the timing
	 * from the given start mark ID to this line.
	 * @param {string} startMarkId The mark ID to start measuring from.
	 * @param {string} finishMarkName The name for the mark of this line.
	 * @return {{finishMarkId: string, measureId: string}} The generated ID for the current line mark and the performed measurement.
	 */
	finishMeasuring(startMarkId, finishMarkName) {
		if (!this.#hasStarted)
			throw new Error(`The recorder wasn't started! call start() method first`);

		const finishMarkId = this.#markUniqueIdGenerator.getNewUniqueId(finishMarkName);
		const measureId = TestRecorder.#getNewMeasureId(startMarkId, finishMarkId);
		performance.mark(finishMarkId);
		performance.measure(measureId, startMarkId, finishMarkId);
		return {finishMarkId, measureId};
	}
	//#endregion

	//#region Measure Unique ID
	/**
	 * Generates a new measurement ID.
	 * @param {string} startMarkId The mark ID of the starting of the measurement.
	 * @param {string} finishMarkId The mark ID of the finishing of the measurement.
	 * @return {string} A unique ID for the measurement.
	 */
	static #getNewMeasureId(startMarkId, finishMarkId) {
		return `${startMarkId}${TestRecorder.#MEASURE_DELIMITER}${finishMarkId}`;
	}

	/**
	 * Split a valid mark ID into his count and name.
	 * @param {string} markId The mark ID.
	 * @return {{markCount: number, markName: string}} A split of the given mark ID.
	 */
	getMarkIdComponents(markId) {
		return this.#markUniqueIdGenerator.getUniqueIdComponents(markId);
	}

	/**
	 * Split a valid measure ID into his starting mark ID and finishing mark ID.
	 * @param {string} measureId The measure ID.
	 * @return {{startMarkId: string, finishMarkId: string}} A split of the given measure ID.
	 */
	static getMeasureIdComponents(measureId) {
		const [startMarkId, finishMarkId] = measureId.split(TestRecorder.#MEASURE_DELIMITER);
		return { startMarkId, finishMarkId };
	}
	//#endregion
}

module.exports = {
	instance: new TestRecorder(),

	getMeasureIdComponents: TestRecorder.getMeasureIdComponents
}
