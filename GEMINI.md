# Gemini Code Assistant Report for FQS

This document provides an AI-generated overview of the FQS music notation project, based on an analysis of the codebase and conversations with the project owner. Its purpose is to serve as a quick-reference guide for developers and contributors.

## Project Overview

FQS is a lightweight, text-based music notation system designed to run entirely in a web browser. Its primary goal is to offer a more intuitive and less cognitively demanding alternative to conventional music notation, particularly for monophonic (single-voice) instruments and vocal music.

The system renders a simple text format (`.fqs`) into a clean, readable musical staff. A key innovation is its use of color to represent pitch alterations (sharps and flats), which eliminates the need for key signatures and clefs. The vertical spacing of notes is compressed and proportional to the actual pitch intervals, allowing multiple octaves to be represented clearly in a compact space.

The project is implemented in vanilla JavaScript, HTML, and CSS, with no external dependencies, making it highly portable and self-contained.

## MIDI Parser Development (`midi_parser_go` branch)

The project is currently focused on developing a robust MIDI parser to handle the full complexity of FQS notation. To ensure correctness and simplify debugging, a new parser is being developed in Go (`midi_parser_go/`) using a test-driven development (TDD) approach.

### Current Status

The Go parser correctly handles:
-   Single-note melodies.
-   Chords with correct timing and duration.
-   Rhythmic holds (`-`).
-   A `roll` parameter in the `midi:` keyword to control chord articulation (simultaneous vs. arpeggiated).

The core logic now uses a two-pass algorithm:
1.  **Pass 1 (`calculateNoteStartTimes`):** Iterates through the lyric line to determine the precise start time of every note, including micro-delays for rolled chords.
2.  **Pass 2 (`buildNoteEvents`):** Calculates the duration of each note by subtracting its start time from the start time of the subsequent note.

This approach has proven successful and is validated by a growing suite of unit tests in `parser_test.go`.

### Next Steps

With the core algorithm validated, the immediate next steps are to expand the Go parser's capabilities by adding test cases for the following features, and then implementing the logic to make them pass:

1.  **Rests (`:`):** Ensure that rests correctly terminate any preceding held notes.
2.  **Tuplets:** Validate that non-standard tuplets (e.g., `tupletSize: 3`) are timed correctly.
3.  **Partial Beats:** Handle cases where a beat is not fully specified (e.g., a single eighth note in a 4/4 measure).
4.  **Cross-Line Holds:** Implement logic to allow notes to be held across line breaks.

Once the Go parser is complete and fully tested, the validated logic will be ported back to the main JavaScript `FqsToMidiParser.js` to finalize the MIDI playback feature in the web application.
