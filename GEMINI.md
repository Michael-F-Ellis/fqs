# Gemini Code Assistant Report for FQS

This document provides an AI-generated overview of the FQS music notation project, based on an analysis of the codebase and conversations with the project owner. Its purpose is to serve as a quick-reference guide for developers and contributors.

## Project Overview

FQS is a lightweight, text-based music notation system designed to run entirely in a web browser. Its primary goal is to offer a more intuitive and less cognitively demanding alternative to conventional music notation, particularly for monophonic (single-voice) instruments and vocal music.

The system renders a simple text format (`.fqs`) into a clean, readable musical staff. A key innovation is its use of color to represent pitch alterations (sharps and flats), which eliminates the need for key signatures and clefs. The vertical spacing of notes is compressed and proportional to the actual pitch intervals, allowing multiple octaves to be represented clearly in a compact space.

The project is implemented in vanilla JavaScript, HTML, and CSS, with no external dependencies, making it highly portable and self-contained.

## Language Documentation

The file `reference.fqs` serves as the canonical documentation for the FQS notation language. It should be consulted for any questions regarding syntax and semantics.

## MIDI Parser Development (`midi_parser_go` branch)

The project is focused on developing a robust MIDI parser to handle the full complexity of FQS notation. A new parser has been developed in Go (`midi_parser_go/`) using a test-driven development (TDD) approach, and its logic is now considered feature-complete for the core FQS rhythm syntax.

### Current Status & Implemented Features

The Go parser, validated by a comprehensive test suite in `parser_test.go`, now correctly handles:
-   Single notes, chords (rolled and unrolled), and multiple chords within a single beat.
-   Multi-line scores with continuous timing.
-   Rhythmic holds (`-`) and rests (`;`), including correct duration calculation when holds cross tuplets and line breaks.
-   Tuplets that span multiple beats (e.g., `2**`).
-   Partial beats indicated by underscores (e.g., `*_`, `;-*__`).

The parser uses a line-by-line processing model where a `holdAccumulator` state is carried between lines to correctly calculate durations for notes sustained across line breaks.

### Next Steps

With the Go parser's logic validated, the next phase is to integrate it into the main JavaScript application. This presents a key architectural decision:

1.  **Port to JavaScript:** Manually translate the validated Go logic into the project's main `FqsToMidiParser.js` file.
2.  **Compile to WebAssembly (WASM):** Compile the Go parser to a WASM module and build a JavaScript interface to run it directly in the browser.

This decision will be the primary topic of the next development session. The existing JavaScript function `LyricLine.extractRhythm()` may simplify the effort, as it can pre-process lyrical text into the asterisk-based rhythm format the Go parser now understands.