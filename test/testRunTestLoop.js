const { RunTestLoop } = require('../src/testJson/multithreading/RunTestLoop');
const { reporter } = require('../src/testJson/Reporter');

(async () => {
	const testRunner = new RunTestLoop(3, 5, 2_000_000);
	const tests = [];
	tests.push(testRunner.runTest('Big', 8, 3, 2, JSON.stringify({a:1,b:{c:2}})));
	tests.push(testRunner.runTest('Small', 8, 3, 2, JSON.stringify({a:1,b:{c:2}})));
	tests.push(testRunner.runTest('Medium', 8, 3, 2, JSON.stringify({a:1,b:{c:2}})));
	tests.push(testRunner.signalFinishedSubmittingTests());
	await Promise.all(tests);
	console.log(JSON.stringify(reporter, null, 2));
})();
