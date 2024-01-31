//#region Imports
// Project
const TestRecorder = require('../utils/TestRecorder');
//#endregion

class Reporter {

	static MEASURE_DELIMITER = "@@@@@";
	static WHOLE_TEST_MEASURE_ID = 'theWholeTest';

	static DATABASE_GENERATE_JSON = "generateJson";
	static DATABASE_DESERIALIZE_JSON = "deserializeJson";
	static DATABASE_ITERATE_ITERATIVELY = "iterateIteratively";
	static DATABASE_ITERATE_RECURSIVELY = "iterateRecursively";
	static DATABASE_SERIALIZE_JSON = "serializeJson";
	static DATABASE_TOTAL_INCLUDE_CONTEXT_SWITCH = "totalIncludeCS";

	#testRecorder; /** {TestRecorder} the TestRecorder singleton instance. */
	#database;
	#wholeTest;

	constructor() {
		this.#testRecorder = TestRecorder.instance;
		this.#testRecorder.start(this.#handleMeasure.bind(this));
		this.#database = {};
		this.#wholeTest = undefined;
	}

	/**
	 * Cleans up the reporter to be ready to record again.
	 */
	clear() {
		this.#testRecorder.clear();
		this.#testRecorder.start(this.#handleMeasure.bind(this));
		this.#database = {};
	}

	//#region Database
	/**
	 * Return the field from the given data structure,
	 * if doesn't exists, initialize it with default value first.
	 * @param {object} dataStructure An object.
	 * @param {string} fieldName A field in the object.
	 * @param {any} defaultValue The default value if the field doesn't exist.
	 * @return {any} The value from the given field of the object.
	 */
	static #getField(dataStructure, fieldName, defaultValue = {}) {
		if (!dataStructure.hasOwnProperty(fieldName))
			dataStructure[fieldName] = defaultValue;

		return dataStructure[fieldName];
	}
	//#endregion

	//#region Generic Measurement
	/**
	 * Handles when new measure data comes in.
	 * @param {string} measureId The unique ID of measurement.
	 * @param {number} duration The duration of the measurement.
	 */
	#handleMeasure(measureId, duration) {
		const { startMarkId, finishMarkId } = TestRecorder.getMeasureIdComponents(measureId);
		const startMarkName = this.#testRecorder.getMarkIdComponents(startMarkId).name;
		const finishMarkName = this.#testRecorder.getMarkIdComponents(finishMarkId).name;

		if (startMarkName === Reporter.WHOLE_TEST_MEASURE_ID) {
			this.#wholeTest = duration;
			return;
		}

		if (startMarkName !== finishMarkName)
			throw new Error(`Measuring unexpected marks: measureId=${measureId}`);

		const { testCount, jsonName, measurementType } = Reporter.getMeasureIdComponents(startMarkName);
		const databaseTestCount = Reporter.#getField(this.#database, testCount, {});
		const databaseJsonName = Reporter.#getField(databaseTestCount, jsonName, {});
		databaseJsonName[measurementType] = duration;
	}

	/**
	 * Measures the time to run a the given method.
	 * @param {string} testCount The name of the test count.
	 * @param {string} jsonName The name of the JSON that being measured.
	 * @param {string} measurementType The type of measurement.
	 * @param {function(): any} method Code to measure his timing.
	 * @return {any} The value returned from the given method.
	 * @throws {any} Any error thrown by the given method.
	 */
	measure(testCount, jsonName, measurementType, method) {
		const measureId = Reporter.#getMeasureId(testCount, jsonName, measurementType);
		const startMeasureId = this.startMeasuring(measureId);
		try {
			return method();
		} finally {
			this.finishMeasuring(startMeasureId, measureId);
		}
	}

	/**
	 * Measures the time to run a the given method.
	 * @param {string} testCount The name of the test count.
	 * @param {string} jsonName The name of the JSON that being measured.
	 * @param {string} measurementType The type of measurement.
	 * @param {function(): any} method Code to measure his timing.
	 * @return {any} The value returned from the given method.
	 * @throws {any} Any error thrown by the given method.
	 */
	async measureAsync(testCount, jsonName, measurementType, method) {
		const measureId = Reporter.#getMeasureId(testCount, jsonName, measurementType);
		const startMeasureId = this.startMeasuring(measureId);
		return method().finally(() => {
			this.finishMeasuring(startMeasureId, measureId);
		});
	}

	/**
	 * Starts to measure.
	 * @param {string} measureId The unique name for the measurement.
	 * @return {string} The unique ID of the marked lined.
	 */
	startMeasuring(measureId) {
		return this.#testRecorder.startMeasuring(measureId);
	}

	/**
	 * Finishes the measuring.
	 * @param {string} startMeasureId The marked line that the generating JSON has started at.
	 * @param {string} measureId The unique name for the measurement.
	 * @return {string} The measurement ID of this measurement.
	 */
	finishMeasuring(startMeasureId, measureId) {
		return this.#testRecorder.finishMeasuring(
			startMeasureId,
			measureId
		).measureId;
	}
	//#endregion

	//#region Measure Unique ID
	/**
	 * Generates a new measurement ID.
	 * @param {string} testCount The name of the test count.
	 * @param {string} jsonName The name of the JSON that being measured.
	 * @param {string} measurementType The type of measurement.
	 * @return {string} A unique ID for the measurement.
	 */
	static #getMeasureId(testCount, jsonName, measurementType) {
		return `${testCount}${Reporter.MEASURE_DELIMITER}${jsonName}${Reporter.MEASURE_DELIMITER}${measurementType}`;
	}

	/**
	 * Split a valid measure ID into his test count, JSON name and measurement type.
	 * @param {string} measureId The measure ID.
	 * @return {{testCount: string, jsonName: string, measurementType: string}} A split of the given measure ID.
	 */
	static getMeasureIdComponents(measureId) {
		const [testCount, jsonName, measurementType] = measureId.split(Reporter.MEASURE_DELIMITER);
		return { testCount, jsonName, measurementType };
	}
	//#endregion

	/**
	 * Return a JSON representing the data collected by the reporter.
	 * @return {object} The reporter's database.
	 */
	toJSON() {
		return this.#database;
	}

	get wholeTestDuration() {
		return this.#wholeTest;
	}
}

module.exports = {
	reporter: new Reporter(),
	WHOLE_TEST_MEASURE_ID: Reporter.WHOLE_TEST_MEASURE_ID,
	GENERATE_JSON: Reporter.DATABASE_GENERATE_JSON,
	DESERIALIZE_JSON: Reporter.DATABASE_DESERIALIZE_JSON,
	ITERATE_ITERATIVELY: Reporter.DATABASE_ITERATE_ITERATIVELY,
	ITERATE_RECURSIVELY: Reporter.DATABASE_ITERATE_RECURSIVELY,
	SERIALIZE_JSON: Reporter.DATABASE_SERIALIZE_JSON,
	TOTAL_INCLUDE_CONTEXT_SWITCH: Reporter.DATABASE_TOTAL_INCLUDE_CONTEXT_SWITCH,
}
