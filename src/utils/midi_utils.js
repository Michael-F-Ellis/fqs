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
 * @param {string} ref The reference pitch for the staff (e.g., "G2").
 * @returns {number} The corresponding MIDI note number.
 */
export function pitchToMidi(pitch, ref = 'G3') {
    if (!pitch) return null;

    // Parse the reference string, e.g., "G2" -> letter: "g", octave: 2
    const refMatch = ref.toLowerCase().match(/^([a-g])(\d)$/);
    if (!refMatch) {
        throw new Error(`Invalid MIDI reference format: ${ref}. Expected format like "G2".`);
    }
    const refLetter = refMatch[1];
    const refOctave = parseInt(refMatch[2], 10);

    // Calculate the MIDI number for the reference note (the "G" on the bottom line)
    // MIDI standard: C4 is 60.
    const refMidiNote = 12 * (refOctave + 1) + noteToMidiOffset[refLetter];

    // The FQS rendering engine places G on the bottom line. The `pitch.octave` is relative
    // to a center octave (0), and the `vOffset` in the Pitch class handles the position
    // on the staff. We need to combine these to get the absolute pitch.
    // A pitch's letter and its `octave` property give us its position relative to C in the center octave.
    
    // Let's establish the MIDI note for C in the center FQS octave (pitch.octave = 0).
    // The reference note `ref` is on the bottom line of the staff. In FQS rendering,
    // the bottom line corresponds to G. So, a pitch with letter 'g' and octave 0
    // should map to `refMidiNote`.
    const g_in_center_octave_midi = refMidiNote;
    
    // From this, we can find C in the center octave. G is 7 semitones above C.
    const c_in_center_octave_midi = g_in_center_octave_midi - noteToMidiOffset['g'];

    // Now, calculate the final MIDI note for the given pitch.
    const noteBase = c_in_center_octave_midi + (pitch.octave * 12) + noteToMidiOffset[pitch.letter];
    const accidentalOffset = accidentalToMidiOffset[pitch.accidentalClass] || 0;

    return noteBase + accidentalOffset;
}