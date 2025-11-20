# Gemini Code Assistant Report for FQS

This document provides an AI-generated overview of the FQS music notation project, based on an analysis of the codebase and conversations with the project owner. Its purpose is to serve as a quick-reference guide for developers and contributors.

## Project Overview

FQS is a lightweight, text-based music notation system designed to run entirely in a web browser. Its primary goal is to offer a more intuitive and less cognitively demanding alternative to conventional music notation, particularly for monophonic (single-voice) instruments and vocal music.

The system renders a simple text format (`.fqs`) into a clean, readable musical staff. A key innovation is its use of color to represent pitch alterations (sharps and flats), which eliminates the need for key signatures and clefs. The vertical spacing of notes is compressed and proportional to the actual pitch intervals, allowing multiple octaves to be represented clearly in a compact space.

The project is implemented in vanilla JavaScript, HTML, and CSS, with no external dependencies, making it highly portable and self-contained.

## Language Documentation

The file `reference.fqs` serves as the canonical documentation for the FQS notation language. It should be consulted for any questions regarding syntax and semantics.

## Parser Integration

As of 2025-08-28, a new PEG-based parser has been developed to replace the original ad-hoc parsing logic.

**Status:** Complete and ready for integration.

- **Grammar:** A formal PEG grammar has been defined in `grammar.peg`.
- **Parser Generation:** The main build script, `build.py`, has been updated to use the `peggy` npm package to compile `grammar.peg` into a standalone JavaScript parser located at `src/utils/fqs_parser.js`.
- **Testing:** A test harness, `ast-test.html`, was created to validate the parser against the `reference.fqs` file. After iterative debugging, the parser now successfully processes the entire reference file and generates a complete and correct Abstract Syntax Tree (AST) for each score.

### Next Steps

The next major task is to integrate the new parser into the main application.

1.  **Replace `preprocessScore`:** The primary goal is to replace the contents of `src/utils/preprocess.js`. The new `preprocessScore` function will:
    a.  Import the generated parser from `src/utils/fqs_parser.js`.
    b.  Implement the two-stage parsing strategy: first, split the input text by the `EndOfScore` delimiter, then map over the resulting array of score strings, calling the generated parser on each one.
    c.  Return the array of generated ASTs.

2.  **Adapt Application Logic:** The main application logic, starting in `src/classes/Score.js`, must be refactored to work with the new ASTs. Currently, the application consumes the data structure produced by the old preprocessor. This will likely involve creating one `Score` object per AST.

3.  **Future Grammar Enhancements:** The current grammar returns the content of `music:`, `pitch:`, and `lyric:` lines as simple strings. A future enhancement would be to extend the grammar to parse these strings into a detailed structure of notes, rhythms, and chords. This would make the AST even more powerful and simplify the rendering logic further.

## Automated Testing Workflow

To improve the speed and reliability of the development cycle, an automated testing workflow has been implemented using Playwright.

**File:** `run_test.py`
**Usage:** `./.venv/bin/python3 run_test.py`

This script automates the following process:
1.  **Builds** the project using `build.py`.
2.  **Starts** a local web server.
3.  **Launches** a headless browser using Playwright.
4.  **Navigates** to a test page (`pre-fqs.html`) and automatically loads a test file (`mididev.fqs`) using a URL parameter.
5.  **Captures** all browser console logs and prints them to the terminal.
6.  **Shuts down** the server and browser.

This provides a fast and consistent way to test changes and capture debug information without manual intervention.

## MIDI Playback

The project includes a MIDI playback feature powered by Tone.js, allowing users to listen to their scores directly in the browser.

### MIDI Implementation Details

-   **FQS to MIDI Parsing:** The `FqsToMidiParser.js` class is responsible for converting the rhythmic information from a score into a series of note events.
-   **Pitch to MIDI Conversion:** The `pitchToMidi` utility in `midi_utils.js` calculates the absolute MIDI note number for each pitch based on the score's key signature, accidentals, and the reference octave (`ref` parameter).
-   **Playback:** The `MidiPlayer.js` class schedules these events with Tone.js. It correctly converts MIDI note numbers into frequencies before sending them to the synthesizer.

### Status: Functional

The MIDI playback feature is now fully functional. The following critical bugs have been resolved:
-   **Incorrect Octave:** The `pitchToMidi` function was corrected to use the proper reference octave (e.g., C5 for a `G4` reference) for its calculations.
-   **Incorrect Playback Pitch:** The `MidiPlayer` was updated to convert MIDI note numbers to frequency (using `Tone.Midi().toFrequency()`) before passing them to the Tone.js synth, which resolved notes playing at the wrong pitch.
-   **Lyric Parsing:** The `FqsToMidiParser` now correctly handles tuplets containing lyrics (e.g., "Twin.kle"), preventing crashes.
-   **Documentation:** A new "MIDI Playback" section was added to `reference.fqs`.

## Score Parsing and Rendering Refinements

Recent work has focused on improving the robustness of the score parser and the clarity of the editing interface.

### Status: Complete

-   **Header Regularization:** The score pre-processor has been updated to enforce a consistent header structure. It now correctly identifies the header block, provides sensible defaults for missing keywords (`zoom:`, `midi:`, etc.), and reports errors if non-header keywords are found, preventing mis-parsing.
-   **Rendering Crash Fixed:** A persistent `NaN` error that caused rendering to fail has been eliminated. The root cause was a regular expression typo in the `musicToPitchLyric` function that generated invalid rhythmic data.
-   **Improved Editor Experience:** The logic for reconstructing score sections for the editor has been refined. Internally-generated rhythmic data (e.g., `lyric: * * *`) is no longer inserted into the editor, preventing user confusion and ensuring only user-provided text is displayed for editing.

### Next Steps

The next major development task will be to implement a feature allowing users to specify the vertical layout order of music and its accompanying annotations (e.g., chords, lyrics, per-note expressions).