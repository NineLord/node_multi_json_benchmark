//#region Imports
// Node
const fs = require('fs');
const { homedir } = require('os');
const { resolve } = require('path');

// 3rd Party
const { program } = require('commander');

// Project
const { ExcelGenerator } = require('./ExcelGenerator');
const { ExtendLodash } = require('../utils/ExtendLodash');
const { RunTestLoop } = require('./multithreading/RunTestLoop');
const { reporter, WHOLE_TEST_MEASURE_ID } = require('./Reporter');
//#endregion

// Example to run: clear ; node src/testJson/main.js -D /PATH/TO/Input/config_4.json 10

const globals = {
	TEST_COUNTER: 5,
	THREAD_COUNT: 3,
	PATH_TO_SAVE_FILE: `${homedir()}/report_nodejs.xlsx`,
	PATH_RUN_TEST_LOOP_FILE: resolve(__dirname, './multithreading/RunTestLoop.js')
};

/**
 * Read, Parse and validate the config file.
 * If fails the process exits.
 * @param {string} pathToConfigFile The absolute path to to the config file.
 * @return {{name: string, size: string, path: string, numberOfLetters: number, depth: number, numberOfChildren: number}[]} Valid config file.
 */
function parseAndValidateConfigFile(pathToConfigFile) {
	let config;
	try {
		config = JSON.parse(fs.readFileSync(pathToConfigFile).toString());
	} catch (error) {
		console.error(`Failed to parse the config file; exception: ${error}`);
		process.exit(1);
	}

	if (!ExtendLodash.isArray(config)) {
		console.error(`Config file isn't an array`);
		process.exit(1);
	}

	for (const testCase of config) {
		if (!ExtendLodash.isString(testCase?.name)) {
			console.error("One of the test case's 'name' field isn't a string");
			process.exit(1);
		}

		if (!ExtendLodash.isString(testCase?.size)) {
			console.error("One of the test case's 'size' field isn't a string");
			process.exit(1);
		}

		if (!ExtendLodash.isString(testCase?.path)) {
			console.error("One of the test case's 'path' field isn't a string");
			process.exit(1);
		}

		if (!ExtendLodash.isExists(testCase.path)) {
			console.error(`One of the test case's 'path' isn't valid: ${testCase.path}`);
			process.exit(1);
		}

		if (!ExtendLodash.isLong(testCase?.numberOfLetters)) {
			console.error("One of the test case's 'numberOfLetters' field isn't an integer");
			process.exit(1);
		}

		if (!ExtendLodash.isLong(testCase?.depth)) {
			console.error("One of the test case's 'depth' field isn't an integer");
			process.exit(1);
		}

		if (!ExtendLodash.isLong(testCase?.numberOfChildren)) {
			console.error("One of the test case's 'numberOfChildren' field isn't an integer");
			process.exit(1);
		}
	}

	return config;
}

program
	.name('jsonTester')
	.description('Tests JSON manipulations')
	.argument('<configPath>', 'Absolute path to the JSON file that contains the configuration for the test')
	.argument('[testCounter]', 'The number of times will run the tests', globals.TEST_COUNTER)
	.option('-s, --save-file <string>', 'Absolute path to save the excel report file to', globals.PATH_TO_SAVE_FILE)
	.option('-t, --thread-count <number>', 'Number of workers to use to run the test', globals.THREAD_COUNT)
	.option('-D, --debug', 'Prints addition data for debugging')
	.action((configPath, testCounter) => {
		const flags = program.opts();

		if (testCounter === undefined)
			testCounter = globals.TEST_COUNTER;
		else
			testCounter = Math.max(testCounter, 1);
		const config = parseAndValidateConfigFile(configPath);
		const pathToSaveFile = flags.saveFile;
		const workerCount = Math.max(flags.threadCount, 1);
		const isDebug = flags.debug;

		const testRunner = new RunTestLoop(workerCount, testCounter, 2_000_000);
		const testNames = [];

		for (const testCase of config) {
			testCase["raw"] = fs.readFileSync(testCase.path).toString();
			testNames.push(testCase.name);
		}

		const startWholeTestMeasureId = reporter.startMeasuring(WHOLE_TEST_MEASURE_ID);
		const promises = [];
		for (const testCase of config) {
			promises.push(testRunner.runTest(
				testCase.name,
				testCase.numberOfLetters,
				testCase.depth,
				testCase.numberOfChildren,
				testCase.raw
			));
		}
		promises.push(testRunner.signalFinishedSubmittingTests());

		Promise.all(promises)
			.then(() => {
				reporter.finishMeasuring(startWholeTestMeasureId, WHOLE_TEST_MEASURE_ID);
			})
			.then(() => {
				if (isDebug) {
					console.log(JSON.stringify(reporter, null, 2));
					console.log(`Whole test: ${reporter.wholeTestDuration}`);
				}

				const excelGenerator = new ExcelGenerator(testNames, reporter.wholeTestDuration, config);

				for (const [testName, testCase] of Object.entries(reporter.toJSON())) {
					excelGenerator.appendWorksheet(testName, testCase);
				}
				return excelGenerator.saveAs(pathToSaveFile);
			})
			.then(() => console.log('Done!'));
	});

program.parse();
