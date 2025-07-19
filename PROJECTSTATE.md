### Project State Summary: FQS Rhythmic Indicators & Staff Rendering

**1. The Goal**

The primary objective of this work session was to overhaul the rhythmic notation and fix a long-standing issue with the vertical placement of rests and holds.

**2. Rhythmic Indicator Evolution**

The implementation of a new rhythmic indicator was an iterative process of experimentation and refinement:

*   **Initial Concept (Cluttered Pie):** The first idea of a pie-chart-like wedge for each note was abandoned as visually cluttered.
*   **Consolidated "Clock":** The concept evolved into a single "clock" per unevenly divided beat, with "hands" pointing to the start time of each rhythmic component. This was a significant improvement.
*   **Numbered Annulus (Current Implementation):** The "clock" was transformed into a "numbered annulus" for every beat. This is the current, successful implementation.
    *   A ring is drawn for every beat, centered under the first note/rest.
    *   The beat number is displayed in the center of the ring.
    *   For all beats, the ring is segmented by "spokes" that indicate the start of each rhythmic subdivision.
*   **Tuplets & Partial Beats:** The numbered annulus was extended to handle complex rhythmic cases:
    *   **Tuplets:** Multi-beat tuplets are now indicated by a small red number below the main annulus glyph, with subsequent beats in the tuplet represented by bare numerals correctly positioned under their corresponding notes.
    *   **Partial Beats:** Beats with reduced duration (e.g., `cde_`) are now indicated by a small blue fraction (e.g., `3/4`) below the annulus. The spokes of the annulus correctly reflect the note divisions as if it were a whole beat.

**3. Staff Rendering Fix**

A key bug was fixed in the rendering of rests (`;`) and holds (`-`). Previously, they were always rendered in the vertical center of the staff. The logic in `src/classes/Pitch.js` was rewritten to ensure they are now rendered at the same y-position as the preceding pitch, or the subsequent pitch if they appear at the beginning of a line. The styling of chord-member pitches was also corrected during this refactoring.

**4. Current Status: Stable Checkpoint**

The new rhythmic indicators are feature-complete and working correctly. The staff rendering for rests and holds is fixed. This represents a stable checkpoint suitable for a commit.

**5. Next Steps**

The next development goals are:
1.  Make the rendering of chords on the staff more visually distinctive.
2.  Change the display of images from a popup to be inline with the score content.