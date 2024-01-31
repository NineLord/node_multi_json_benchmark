const { reporter } = require('../src/testJson/Reporter');
const Reporter = require('../src/testJson/Reporter');

function bigJson() {
	let count = 0;
	for (let i = 0; i < 1_000_000; i++) {
		count++;
	}
	return count;
}

function smallJson() {
	let count = 0;
	for (let i = 0; i < 10_000; i++) {
		count++;
	}
	return count;
}

console.log(reporter.measure("Test_1", "Big", Reporter.GENERATE_JSON, bigJson) === 1_000_000);
console.log(reporter.measure("Test_1", "Small", Reporter.GENERATE_JSON, smallJson) === 10_000);
console.log(reporter.measure("Test_1", "Big", Reporter.SERIALIZE_JSON, bigJson) === 1_000_000);

console.log(reporter.measure("Test_2", "Big", Reporter.GENERATE_JSON, bigJson) === 1_000_000);
console.log(reporter.measure("Test_2", "Small", Reporter.GENERATE_JSON, smallJson) === 10_000);
console.log(reporter.measure("Test_2", "Big", Reporter.SERIALIZE_JSON, bigJson) === 1_000_000);

console.log(`Report: ${JSON.stringify(reporter, null, 2)}`);
