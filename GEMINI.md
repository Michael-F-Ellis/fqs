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
-   **`counter` Keyword**: This feature is slated for a significant enhancement to provide detailed rhythmic information, with the goal of making the current rhythm markers obsolete.
-   **`intervals` Keyword**: The functionality to display musical intervals between notes will be retained.
-   **Side Features**: YouTube integration, image embedding, and GitHub integration will persist but are not the current development focus.
-   **Deprecated Features**: The `pernote`, `perbeat`, and `perbar` annotation keywords are being de-emphasized, as this functionality can be replicated by annotating a PDF export of the score.

## Key Differentiators

FQS distinguishes itself from other notation systems (including other text-based systems like ABC.js) in several ways:

-   **Elimination of Key Signatures/Clefs**: Simplifies reading by using color and absolute note names.
-   **Proportional Vertical Spacing**: The vertical position of a note directly corresponds to its pitch, with semitones spaced equally.
-   **Visible Note Names**: Aids in sight-reading and memorization.
-   **Intuitive Rhythm Notation**: Handles complex tuplets and beat subdivisions with a simple, consistent syntax (e.g., `bc` for eighths, `bcd` for triplets).

## Immediate Development Goals

The next major development task is to prototype and implement an enhanced `counter` feature. This new system will represent the timing and duration of notes within a beat using a circular "pie chart" visualization.

For example, for an uneven rhythm like `c--d` (a 3:1 ratio), the `d` note would have a circle beneath it with the final quadrant shaded, visually indicating it occupies the last 25% of the beat's duration. This will require creating a new SVG rendering function that can draw a shaded pie segment based on a note's start and end beat fraction.

## Codebase Structure

The project is organized around a few key files:

-   `pre-fqs.html`: The main HTML file that provides the user interface and loads the necessary JavaScript modules.
-   `fqs.js`: Contains the top-level `Book` class, which manages the collection of scores on the page.
-   `fqs.css`: Defines the styling for the rendered notation and the user interface.
-   `src/classes/Score.js`: A critical file containing the `Score` class, which is responsible for parsing the `.fqs` text and rendering a single musical score.
-   `src/classes/*.js`: Other class files in this directory handle specific parts of the notation, such as `Chord.js`, `LyricLine.js`, and `RhythmMarkers.js`.
-   `reference.fqs`: A comprehensive reference document written in FQS itself, demonstrating the full syntax.
-   `build.py`: A Python script used to assemble the final `fqs.html` from `pre-fqs.html` and other resources.
