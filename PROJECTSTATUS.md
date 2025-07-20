# Project Status

## MIDI Playback (In Progress)

- **Goal**: Implement basic MIDI playback to allow users to aurally verify their notation.
- **Current State**:
    - A `MidiPlayer` class has been implemented using `Tone.js`.
    - The FQS parser now calculates and stores MIDI note numbers for each pitch.
    - Line-level play/stop controls have been added to the UI.
    - Basic playback functionality is working.
- **Known Issues**:
    - Rhythm playback is uneven and does not correctly handle complex rhythms or tuplets.
    - Chord playback is not yet implemented correctly.
- **Next Steps**:
    - Debug and refine the rhythm generation in `FqsToMidiParser`.
    - Correctly implement chord playback.
    - Remove extensive debugging logs once the feature is stable.
