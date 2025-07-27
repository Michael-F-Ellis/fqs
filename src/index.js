import { FqsToMidiParser } from './midi/FqsToMidiParser.js';
export { defaultParameters, updateFontSizes } from './utils/parameters.js';

/**
 * A test function to demonstrate the FqsToMidiParser.
 * This can be called from the browser console.
 */
function testParser() {
    console.log("Testing FQS to MIDI Parser...");

    const testScore = {
        MidiParams: { Tempo: 120, Roll: "off" },
        PitchLines: [
            { Pitches: [{ MidiNote: 60 }, { MidiNote: 62 }, { MidiNote: 64 }] },
            { Pitches: [] } // Represents a line with no music
        ],
        LyricLines: [
            { Tuplets: [{ text: "* * *", tupletSize: 1 }] },
            { Tuplets: [] } // Represents a line with no music
        ],
    };

    try {
        const parser = new FqsToMidiParser(testScore);
        const events = parser.parse();
        console.log("Successfully parsed score:", events);
    } catch (error) {
        console.error("Parser test failed:", error);
    }
}

// Expose the test function to the global scope for easy debugging.
window.testParser = testParser;

// Automatically run the test when the module loads.
testParser();
