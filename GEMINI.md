# Gemini Code Assistant Report for FQS

This document provides an AI-generated overview of the FQS music notation project, based on an analysis of the codebase and conversations with the project owner. Its purpose is to serve as a quick-reference guide for developers and contributors.

## Project Overview

FQS is a lightweight, text-based music notation system designed to run entirely in a web browser. Its primary goal is to offer a more intuitive and less cognitively demanding alternative to conventional music notation, particularly for monophonic (single-voice) instruments and vocal music.

The system renders a simple text format (`.fqs`) into a clean, readable musical staff. A key innovation is its use of color to represent pitch alterations (sharps and flats), which eliminates the need for key signatures and clefs. The vertical spacing of notes is compressed and proportional to the actual pitch intervals, allowing multiple octaves to be represented clearly in a compact space.

The project is implemented in vanilla JavaScript, HTML, and CSS, with no external dependencies, making it highly portable and self-contained.

## Current State (`simpler` branch)

The `simpler` branch represents a focused effort to refine the core notation system. The development philosophy is to de-emphasize features that can be handled by external tools, such as marking up a PDF export.

### Key Features and Priorities:

-   **Core Notation**: The primary focus is on the text-based language for representing pitches, rhythms, chords, and lyrics.
-   **`counter` Keyword**: This feature displays a "numbered annulus" (a segmented ring with the beat number in the center) for each beat, serving as the primary visual indicator for rhythm.
-   **Chord Rendering**: Chords are now rendered with a horizontal line marker spanning the constituent notes, providing a clear visual distinction from single melody notes. The parser assigns a unique group number to each chord to ensure correct rendering.
-   **`intervals` Keyword**: The functionality to display musical intervals between notes is retained.
-   **Side Features**: YouTube integration and GitHub integration will persist but are not the current development focus.

### Deprecated Features:

-   **Annotation Keywords**: The `pernote`, `perbeat`, and `perbar` annotation keywords are de-emphasized, as this functionality can be replicated by annotating a PDF export.
-   **Image Display**: The feature to display images via an `image:` keyword is deprecated. The previous implementation used a popup, and an attempt to move to inline rendering proved overly complex for the current development stage.

## Key Differentiators

FQS distinguishes itself from other notation systems (including other text-based systems like ABC.js) in several ways:

-   **Elimination of Key Signatures/Clefs**: Simplifies reading by using color and absolute note names.
-   **Proportional Vertical Spacing**: The vertical position of a note directly corresponds to its pitch, with semitones spaced equally.
-   **Visible Note Names**: Aids in sight-reading and memorization.
-   **Intuitive Rhythm Notation**: The "numbered annulus" glyph provides a single, clear visual for beat subdivisions, tuplets, and partial beats.

## Immediate Development Goals

With the chord rendering improvements now complete, the next major development task is:

1.  **MIDI Playback**: A basic implementation of MIDI playback using `Tone.js` is in progress. The core architecture is in place, with line-level play/stop controls. The immediate next steps are to debug and correct the rhythm and chord playback logic within the `FqsToMidiParser`.