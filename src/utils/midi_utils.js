const noteToMidiOffset = {
    'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11
};

const accidentalToMidiOffset = {
    '♮': 0,
    '♯': 1,
    '𝄪': 2,
    '♭': -1,
    '𝄫': -2,
    '': 0,
    '?': 0
};

/**
 * Converts an FQS Pitch object to a MIDI note number.
 * @param {Pitch} pitch The FQS Pitch object.
 * @param {string} ref The reference for the staff's bottom line (e.g., "G4" or just "4").
 * @returns {number} The corresponding MIDI note number.
 */
export function pitchToMidi(pitch, ref = 'G4') {
    if (!pitch) return null;

    let refOctave;

    // Robustly parse the reference string to get the octave number.
    // It can be "G4", "4", "c3", etc. We only care about the number.
    const match = ref.match(/-?\d+/);
    if (match) {
        refOctave = parseInt(match[0], 10);
    } else {
        // If the ref is invalid, default to octave 4 to avoid NaN.
        console.error(`Invalid MIDI reference format: ${ref}. Defaulting to octave 4.`);
        refOctave = 4;
    }

    // For a reference like "G4", the reference octave is 4.
    // The base for MIDI calculation is C in the *next* octave, i.e., C5.
    const refCOctave = refOctave + 1;
    const refCMidiNote = (refCOctave + 1) * 12;

    // Start with the reference C, add the pitch's letter offset,
    // then add the FQS octave offset (which is relative to the staff's "bottom octave").
    // A pitch's letter is relative to C, so we don't need to subtract C's offset.
    const note_with_octave = refCMidiNote + noteToMidiOffset[pitch.letter] + (pitch.octave * 12);

    // Add the accidental offset from the key signature or a local accidental.
    const accidentalOffset = accidentalToMidiOffset[pitch.accidentalClass] || 0;

    return note_with_octave + accidentalOffset;
}