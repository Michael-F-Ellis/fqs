# Gemini Code Assistant Report for FQS

This document provides an AI-generated overview of the FQS music notation project, based on an analysis of the codebase and conversations with the project owner. Its purpose is to serve as a quick-reference guide for developers and contributors.

## Project Overview

FQS is a lightweight, text-based music notation system designed to run entirely in a web browser. Its primary goal is to offer a more intuitive and less cognitively demanding alternative to conventional music notation, particularly for monophonic (single-voice) instruments and vocal music.

The system renders a simple text format (`.fqs`) into a clean, readable musical staff. A key innovation is its use of color to represent pitch alterations (sharps and flats), which eliminates the need for key signatures and clefs. The vertical spacing of notes is compressed and proportional to the actual pitch intervals, allowing multiple octaves to be represented clearly in a compact space.

The project is implemented in vanilla JavaScript, HTML, and CSS, with no external dependencies, making it highly portable and self-contained.

## Language Documentation

The file `reference.fqs` serves as the canonical documentation for the FQS notation language. It should be consulted for any questions regarding syntax and semantics.

## MIDI Parser Development

The project's focus has been on developing a robust MIDI parser to enable playback of FQS scores using Tone.js.

### Abandoned Approaches (Go/WASM/GopherJS)

Initial development of the parser logic was done in Go (`midi_parser_go/`) to leverage strong typing and test-driven development. The logic was successfully proven out in Go.

Several approaches were attempted to integrate this Go logic into the main JavaScript application:
1.  **Go to WebAssembly (WASM):** This approach involved compiling the Go code to a `.wasm` binary. It was ultimately abandoned due to significant complexities and brittleness in the JS-Go interoperability layer, particularly with respect to the `wasm_exec.js` bootstrap file and asynchronous timing issues.
2.  **GopherJS:** This approach involved transpiling the Go code to JavaScript. It was abandoned due to toolchain incompatibilities between the latest version of GopherJS and the project's Go version (1.24).

After significant debugging, both Go-based integration strategies were deemed too fragile and time-consuming for this project.

### Current Implementation: Pure JavaScript Parser

The validated logic from the Go parser was manually translated into a pure JavaScript class, `src/midi/FqsToMidiParser.js`. This approach was chosen for its simplicity, ease of integration, and maintainability within the existing vanilla JavaScript codebase.

A corresponding test suite was created by translating the Go test cases to JavaScript, located in `tests/FqsToMidiParser.test.js`, with an HTML runner at `tests/test_midi_parser.html`.

### Current Status & Next Steps

The new JavaScript parser is fully integrated into the application. The `Score.js` class now uses it to generate note events for MIDI playback.

Playback is partially functional:
-   Rhythmic information is parsed correctly.
-   MIDI events are successfully passed to the `MidiPlayer.js` and scheduled with Tone.js.

However, significant bugs remain in the pitch calculation logic:
-   **Incorrect Octave:** Pitches are playing one or more octaves lower than specified.
-   **Ignored Alterations:** Sharps and flats from key signatures are not being correctly applied to the MIDI note numbers, though they are identified correctly by the parser.

The immediate next step is to debug the `pitchToMidi` utility and the data flow through the `Pitch` and `PitchLine` classes to resolve these pitch calculation errors.
