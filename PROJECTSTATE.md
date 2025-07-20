### Project State Summary: Chord Rendering and Future Direction

**1. The Goal**

The primary objective of this work session was to improve the visual rendering of chords to make them more distinct from single notes.

**2. Chord Rendering Implementation**

After exploring several options, the following solution was implemented:

*   **Parsing:** The `PitchLine` parser in `src/classes/Pitch.js` was updated to assign a unique `chordGroupNumber` to each chord. This allows the rendering logic to reliably identify all notes belonging to a specific chord, even when chords are adjacent.
*   **Rendering:** The rendering logic in `PitchLine.js` now iterates through the rendered notes. For each group of notes sharing a `chordGroupNumber`, it draws a single horizontal line that spans from the first note to the last note of the chord. This line is positioned slightly above the highest note in the chord, providing a clean and clear visual marker.

**3. Deprecated Features**

*   **Inline Images:** The task to change image display from a popup to an inline element was attempted but led to significant rendering complexities. This feature has been deprecated for the time being to focus on core functionality. The image-related code has been reverted to its previous state (popup-based).

**4. Current Status: Stable Checkpoint**

The new chord markers are implemented and working correctly. This represents a stable checkpoint suitable for a commit.

**5. Next Steps**

The next major development goal is to explore the feasibility and implementation of **MIDI playback** for the rendered scores.
