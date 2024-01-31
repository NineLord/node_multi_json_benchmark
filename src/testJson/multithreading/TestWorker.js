//#region Imports
// 3rd Party
const workerPool = require('workerpool');

// Project
const { generateJson } = require('../../jsonGenerate/Generator');
const { breadthFirstSearch } = require('../../searchTree/breadthFirstSearch');
const { depthFirstSearch } = require('../../searchTree/depthFirstSearch');
//#endregion

/**
 * Parse the given string into JSON object.
 * @param {string} input String to be parsed.
 * @return {object} The parsed string.
 */
function deserialize(input) {
	return JSON.parse(input);
}

/**
 * Serializing the given object.
 * @param {object} input Object to be serialized.
 * @return {string} Serialized object.
 */
function serialize(input) {
	return JSON.stringify(input);
}

workerPool.worker({
	generateJson, breadthFirstSearch, depthFirstSearch, deserialize, serialize
});
