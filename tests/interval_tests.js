import { IntervalCalculator, PitchLine } from '../fqs.js';

class IntervalTest {
	static testCases = [
		// Pefect 5th descending
		{
			input: "f c",
			expected: "P4-"
		},
		// Basic diatonic intervals following rule of fourths
		{
			input: "c d e f g a b c",
			expected: "M2+ M2+ m2+ M2+ M2+ M2+ m2+"
		},
		// Perfect intervals with explicit octave changes
		{
			input: "c f c ^g c",
			expected: "P4+ P4- P5+ P4+"
		},
		// Same notes without octave markers showing different intervals
		{
			input: "c f c g c",
			expected: "P4+ P4- P4- P4+"
		},
		// Altered intervals requiring explicit octave marking
		{
			input: "c #f ^&b d",
			expected: "A4+ d11+ M3+"
		},
		// Compound intervals with explicit octave marks
		{
			input: "c /c ^^c ///c",
			expected: "P8- P15+ P22-"
		},
		// Double alterations with rule of fourths
		{
			input: "c &&f c ^##g",
			expected: "dd4+ dd4- AA5+"
		},
		// Descending intervals following closest pitch rule
		{
			input: "^g /c &a /&b",
			expected: "P5- M3- m7-"
		},
		// Mixed direction with alterations and explicit octave changes
		{
			input: "c &e #f ^^&c",
			expected: "m3+ A2+ dd12+"
		}
	];

	static displayResult(testCase, index, result, expected) {
		console.log(`result: ${result}`);
		const resultDiv = document.getElementById('test-results');
		const testDiv = document.createElement('div');
		const passed = result === expected;

		testDiv.innerHTML = `
			<h3 class="${passed ? 'test-pass' : 'test-fail'}">
				Test ${index + 1}: ${passed ? 'PASSED' : 'FAILED'}
			</h3>
			<div class="test-details">
				Input: ${testCase.input}<br>
				Expected: ${expected}<br>
				Got: ${result}
			</div>
		`;

		resultDiv.appendChild(testDiv);
	}

	static runTests() {
		const calculator = new IntervalCalculator();

		this.testCases.forEach((testCase, index) => {
			console.log(`input: ${testCase.input}`);
			const pitchLine = new PitchLine(testCase.input);
			const intervals = [];

			// Calculate intervals between adjacent pitches
			for (let i = 0; i < pitchLine.pitches.length - 1; i++) {
				intervals.push(calculator.calculateInterval(
					pitchLine.pitches[i],
					pitchLine.pitches[i + 1]
				));
				console.log(`interval: ${intervals[i].number} ${intervals[i].quality} ${intervals[i].ascending ? 'ascending' : 'descending'}`);
			}

			const result = intervals.map(i => this.intervalToShorthand(i)).join(' ');
			this.displayResult(testCase, index, result, testCase.expected);
		});
	}

	static intervalToShorthand(interval) {
		const qualityMap = new Map([
			['minor', 'm'],
			['major', 'M'],
			['perfect', 'P'],
			['diminished', 'd'],
			['augmented', 'A'],
			['double diminished', 'dd'],
			['double augmented', 'AA']
		]);

		const quality = qualityMap.get(interval.quality);
		const direction = interval.ascending ? '+' : '-';
		return `${quality}${interval.number}${direction}`;
	}
}

export { IntervalTest };