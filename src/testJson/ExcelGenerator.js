//#region Imports
// 3rd Party
const ExcelJS = require('exceljs');
const { Worksheet, Cell } = require('exceljs');

// Project
const Reporter = require('./Reporter');
Reporter["TOTAL"] = 'total';
const { MathDataCollector } = require('../utils/MathDataCollector');
const { ExtendLodash } = require('../utils/ExtendLodash');
//#endregion

class ExcelGenerator {

	static #BORDER_STYLE = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
	static #CENTER_STYLE = { horizontal: "center", vertical: "middle" };

	#workbook; /** {Workbook} The excel that being generated. */
	#jsonNames;
	#lengthWholeTest;
	#inputConfiguration;
	#averagesPerJson;
	#averageAllJsons;


	/**
	 * Create an instance of this class.
	 * @param {string[]} jsonNames The name of the JSON in order received from the config file.
	 * @param {number} lengthWholeTest The length of the whole test.
	 * @param {{name: string, size: string, path: string, numberOfLetters: number, depth: number, numberOfChildren: number}[]} config The configuration that the tests run on.
	 */
	constructor(jsonNames, lengthWholeTest, config) {
		this.#workbook = new ExcelJS.Workbook();
		this.#jsonNames = jsonNames;
		this.#lengthWholeTest = lengthWholeTest;
		this.#inputConfiguration = config;
		this.#averagesPerJson = {};
		for (const jsonName of this.#jsonNames)
			this.#averagesPerJson[jsonName] = ExcelGenerator.#getDataCollectorsForEachTest();
		this.#averageAllJsons = ExcelGenerator.#getDataCollectorsForEachTest();
	}

	static #getDataCollectorsForEachTest() {
		const dataCollectors = {};
		dataCollectors[Reporter.GENERATE_JSON] = new MathDataCollector();
		dataCollectors[Reporter.ITERATE_ITERATIVELY] = new MathDataCollector();
		dataCollectors[Reporter.ITERATE_RECURSIVELY] = new MathDataCollector();
		dataCollectors[Reporter.SERIALIZE_JSON] = new MathDataCollector();
		dataCollectors[Reporter.DESERIALIZE_JSON] = new MathDataCollector();
		dataCollectors[Reporter.DESERIALIZE_JSON] = new MathDataCollector();
		dataCollectors[Reporter.TOTAL] = new MathDataCollector();
		dataCollectors[Reporter.TOTAL_INCLUDE_CONTEXT_SWITCH] = new MathDataCollector();
		return dataCollectors;
	}

	//#region Adding data
	/**
	 * Creates a new worksheet with the given data.
	 * @param {string} worksheetName The name of the worksheet to be created.
	 * @param {object} database The data to be written in the given worksheet.
	 * @return {ExcelGenerator} The this instance of the class.
	 */
	appendWorksheet(worksheetName, database) {
		const worksheet = this.#workbook.addWorksheet(worksheetName);
		this.#addData(worksheet, database);
		ExcelGenerator.#resizeColumns(worksheet, 14, { preDefinedColumns: new Map([
				[1, 42],
				[4, 46]
		]) });
		return this;
	}

	/**
	 * Adds the data to the given worksheet.
	 * @param {Worksheet} worksheet the worksheet that going to gain the data.
	 * @param {Object} database The data to be added.
	 */
	#addData(worksheet, database) {
		const testDataCollectors = ExcelGenerator.#getDataCollectorsForEachTest();

		let currentRow = 1;
		for (const jsonName of this.#jsonNames) {
			const testData = database[jsonName];

			ExcelGenerator.#setColorfulTitle(worksheet, currentRow++, 1, jsonName);

			const jsonDataCollector = new MathDataCollector();
			this.#addTestData(worksheet, currentRow++, 1, jsonName, testData,
				jsonDataCollector, testDataCollectors, Reporter.GENERATE_JSON, 'Generating JSON');
			this.#addTestData(worksheet, currentRow++, 1, jsonName, testData,
				jsonDataCollector, testDataCollectors, Reporter.ITERATE_ITERATIVELY, 'Iterating JSON Iteratively - BFS');
			this.#addTestData(worksheet, currentRow++, 1, jsonName, testData,
				jsonDataCollector, testDataCollectors, Reporter.ITERATE_RECURSIVELY, 'Iterating JSON Recursively - DFS');
			this.#addTestData(worksheet, currentRow++, 1, jsonName, testData,
				jsonDataCollector, testDataCollectors, Reporter.DESERIALIZE_JSON, 'Deserializing JSON');
			this.#addTestData(worksheet, currentRow++, 1, jsonName, testData,
				jsonDataCollector, testDataCollectors, Reporter.SERIALIZE_JSON, 'Serializing JSON');

			ExcelGenerator.#setTitle(worksheet, currentRow, 1, 'Total');
			ExcelGenerator.#setValue(worksheet, currentRow++, 2, jsonDataCollector.sum);
			this.#averagesPerJson[jsonName][Reporter.TOTAL].add(jsonDataCollector.sum);
			this.#averageAllJsons[Reporter.TOTAL].add(jsonDataCollector.sum);
			testDataCollectors[Reporter.TOTAL].add(jsonDataCollector.sum);

			this.#addTestData(worksheet, currentRow++, 1, jsonName, testData,
				jsonDataCollector, testDataCollectors, Reporter.TOTAL_INCLUDE_CONTEXT_SWITCH, 'Total Including Context Switch');

			++currentRow;
		}

		currentRow = 1;
		ExcelGenerator.#setColorfulTitle(worksheet, currentRow++, 4, 'Averages of this Test');

		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Generating JSONs');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, testDataCollectors[Reporter.GENERATE_JSON].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Iterating JSONs Iteratively - BFS');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, testDataCollectors[Reporter.ITERATE_ITERATIVELY].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Iterating JSONs Recursively - DFS');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, testDataCollectors[Reporter.ITERATE_RECURSIVELY].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Deserializing JSONs');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, testDataCollectors[Reporter.DESERIALIZE_JSON].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Serializing JSONs');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, testDataCollectors[Reporter.SERIALIZE_JSON].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Totals');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, testDataCollectors[Reporter.TOTAL].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Totals Including Context Switch');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, testDataCollectors[Reporter.TOTAL_INCLUDE_CONTEXT_SWITCH].average);
	}

	static #setColorfulTitle(worksheet, row, startColumn, title) {
		const titleCell = worksheet.getCell(row, startColumn);
		titleCell.value = title;
		titleCell.border = ExcelGenerator.#BORDER_STYLE;
		titleCell.alignment = ExcelGenerator.#CENTER_STYLE;
		titleCell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '9AA9F6' } };
		worksheet.mergeCells(row, startColumn, row, startColumn + 1);
	}

	static #setTitle(worksheet, row, column, title) {
		const cell = worksheet.getCell(row, column);
		cell.value = title;
		cell.border = ExcelGenerator.#BORDER_STYLE;
	}

	static #setValue(worksheet, row, column, value) {
		const cell = worksheet.getCell(row, column);
		cell.value = Math.round(value * 1000) / 1000;
		cell.border = ExcelGenerator.#BORDER_STYLE;
		cell.alignment = ExcelGenerator.#CENTER_STYLE;
	}

	#addTestData(worksheet, currentRow, startColumn, jsonName, testData, jsonDataCollector, testDataCollectors, testName, title) {
		const value = testData[testName];
		ExcelGenerator.#setTitle(worksheet, currentRow, startColumn, title);
		ExcelGenerator.#setValue(worksheet, currentRow, startColumn + 1, value);
		jsonDataCollector.add(value);
		this.#averagesPerJson[jsonName][testName].add(value);
		this.#averageAllJsons[testName].add(value);
		testDataCollectors[testName].add(value);
	}

	/**
	 * Resize the columns to have readable length.
	 * @param {Worksheet} workSheet The worksheet that going to be update.
	 * @param {number} minimumColumnWidth The minimum width of each column (does not affect the pre-defined columns).
	 * @param {object} [options] Optional settings.
	 * @param {Map<number, number>} [options.preDefinedColumns] Maps from column index to his pre defined width (those columns won't be set by the auto sizing).
	 */
	static #resizeColumns(workSheet, minimumColumnWidth, options = {}) {
		const hasPreDefinedColumns = options.hasOwnProperty("preDefinedColumns");
		const preDefinedColumns = hasPreDefinedColumns && options.preDefinedColumns;

		workSheet.columns.forEach(column => {
			let maxLength = minimumColumnWidth;
			column.eachCell(cell => {
				if (cell === cell.master) {
					const longestLine = cell.text.split('\n').reduce((accumulator, current) => Math.max(accumulator, current.length), 0);
					maxLength = Math.max(maxLength, longestLine + 2);
				}
			});
			column.width = maxLength;
		});

		if (hasPreDefinedColumns) {
			for (const [index, width] of preDefinedColumns.entries())
				workSheet.getColumn(index).width = width;
		}
	}
	//#endregion

	//#region Add summary worksheet
	#addAverageWorksheet() {
		const worksheet = this.#workbook.addWorksheet('Average');
		this.#addAvgData(worksheet);
		ExcelGenerator.#resizeColumns(worksheet, 14, { preDefinedColumns: new Map([
			[1, 42],
			[4, 46]
		]) });
	}

	#addAvgData(worksheet) {
		let currentRow = 1;
		for (const jsonName of this.#jsonNames) {
			const testData = this.#averagesPerJson[jsonName];

			ExcelGenerator.#setColorfulTitle(worksheet, currentRow++, 1, jsonName);

			ExcelGenerator.#addAverageData(worksheet, currentRow++, 1, testData,
				Reporter.GENERATE_JSON, 'Average Generating JSONs');
			ExcelGenerator.#addAverageData(worksheet, currentRow++, 1, testData,
				Reporter.ITERATE_ITERATIVELY, 'Average Iterating JSONs Iteratively - BFS');
			ExcelGenerator.#addAverageData(worksheet, currentRow++, 1, testData,
				Reporter.ITERATE_RECURSIVELY, 'Average Iterating JSONs Recursively - DFS');
			ExcelGenerator.#addAverageData(worksheet, currentRow++, 1, testData,
				Reporter.DESERIALIZE_JSON, 'Average Deserializing JSONs');
			ExcelGenerator.#addAverageData(worksheet, currentRow++, 1, testData,
				Reporter.SERIALIZE_JSON, 'Average Serializing JSONs');
			ExcelGenerator.#addAverageData(worksheet, currentRow++, 1, testData,
				Reporter.TOTAL, 'Average Totals');
			ExcelGenerator.#addAverageData(worksheet, currentRow++, 1, testData,
				Reporter.TOTAL_INCLUDE_CONTEXT_SWITCH, 'Average Totals Including Context Switch');

			++currentRow;
		}

		currentRow = 1;
		ExcelGenerator.#setColorfulTitle(worksheet, currentRow++, 4, 'Averages of all Tests');

		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Generating all JSONs');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, this.#averageAllJsons[Reporter.GENERATE_JSON].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Iterating all JSONs Iteratively - BFS');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, this.#averageAllJsons[Reporter.ITERATE_ITERATIVELY].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Iterating all JSONs Recursively - DFS');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, this.#averageAllJsons[Reporter.ITERATE_RECURSIVELY].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Deserializing all JSONs');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, this.#averageAllJsons[Reporter.DESERIALIZE_JSON].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Serializing all JSONs');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, this.#averageAllJsons[Reporter.SERIALIZE_JSON].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Totals');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, this.#averageAllJsons[Reporter.TOTAL].average);
		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Average Totals Including Context Switch');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, this.#averageAllJsons[Reporter.TOTAL_INCLUDE_CONTEXT_SWITCH].average);

		++currentRow;

		ExcelGenerator.#setTitle(worksheet, currentRow, 4, 'Totals of all Tests Including Context Switch');
		ExcelGenerator.#setValue(worksheet, currentRow++, 5, this.#lengthWholeTest);
	}

	static #addAverageData(worksheet, currentRow, startColumn, testData, testName, title) {
		const value = testData[testName].average;
		ExcelGenerator.#setTitle(worksheet, currentRow, startColumn, title);
		ExcelGenerator.#setValue(worksheet, currentRow, startColumn + 1, value);
	}
	//#endregion

	//#region Add about worksheet
	/**
	 * Creates about worksheet with the test input parameters.
	 */
	#createAboutWorksheet() {
		const worksheet = this.#workbook.addWorksheet('About');

		let currentRow = 1;
		for (const config of this.#inputConfiguration) {
			ExcelGenerator.#setColorfulTitle(worksheet, currentRow++, 1, config["name"]);

			ExcelGenerator.#setTitle(worksheet, currentRow, 1, 'Size');
			ExcelGenerator.#setTitle(worksheet, currentRow++, 2, config["size"]);

			ExcelGenerator.#setTitle(worksheet, currentRow, 1, 'Number Of Letters');
			ExcelGenerator.#setTitle(worksheet, currentRow++, 2, config["numberOfLetters"]);

			ExcelGenerator.#setTitle(worksheet, currentRow, 1, 'Depth');
			ExcelGenerator.#setTitle(worksheet, currentRow++, 2, config["depth"]);

			ExcelGenerator.#setTitle(worksheet, currentRow, 1, 'Number Of Children');
			ExcelGenerator.#setTitle(worksheet, currentRow++, 2, config["numberOfChildren"]);

			ExcelGenerator.#setTitle(worksheet, currentRow, 1, 'Path');
			ExcelGenerator.#setTitle(worksheet, currentRow++, 2, config["path"]);

			++currentRow;
		}

		ExcelGenerator.#resizeColumns(worksheet, 14);
	}
	//#endregion

	/**
	 * Saves the generated excel to file.
	 * @param {string} pathToFile The path to the file to create.
	 * @return {ExcelGenerator} The this instance of the class.
	 */
	async saveAs(pathToFile) {
		this.#addAverageWorksheet();
		this.#createAboutWorksheet();
		await this.#workbook.xlsx.writeFile(pathToFile);
		return this;
	}
}

module.exports = {
	ExcelGenerator
}
