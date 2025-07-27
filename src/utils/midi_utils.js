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
export function pitchToMidi(pitch, ref = 'G4') {
    if (!pitch) return null;

    const refMatch = ref.toLowerCase().match(/^([a-g])(-?\d+)$/);
    if (!refMatch) {
        throw new Error(`Invalid MIDI reference format: ${ref}. Expected format like "G4".`);
    }
    const refLetter = refMatch[1];
    const refOctave = parseInt(refMatch[2], 10);

    // MIDI standard: C4 (middle C) is 60.
    // Calculate the MIDI note for the reference pitch.
    const refMidiNote = (refOctave + 1) * 12 + noteToMidiOffset[refLetter];

    // In FQS, the reference pitch (e.g., G4) corresponds to a pitch object with letter 'g' and octave 0.
    // So, we calculate the MIDI note for 'g' in octave 0.
    const g_in_octave_0_midi = refMidiNote;

    // The MIDI note for any other pitch is relative to this reference.
    // 1. Start with the base MIDI note for the letter in the same octave as our reference G.
    const note_in_ref_octave = g_in_octave_0_midi - noteToMidiOffset['g'] + noteToMidiOffset[pitch.letter];
    
    // 2. Add the octave offset from the pitch object.
    const note_with_octave = note_in_ref_octave + (pitch.octave * 12);

    // 3. Add the accidental offset.
    const accidentalOffset = accidentalToMidiOffset[pitch.accidentalClass] || 0;

    return note_with_octave + accidentalOffset;
}