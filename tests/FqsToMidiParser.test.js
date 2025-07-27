// tests/FqsToMidiParser.test.js

const NoteEvent = 1;

export const testCases = [
    {
        name: "single note",
        score: {
            MidiParams: { Tempo: 60, Roll: "on" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "*", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [{ Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0, NumNotesInChord: 0 }],
        ],
    },
    {
        name: "two notes",
        score: {
            MidiParams: { Tempo: 60, Roll: "on" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }, { MidiNote: 62 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "**", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [
                { Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 0.5, NumNotesInChord: 0 },
                { Kind: NoteEvent, Note: 62, Time: 0.5, Duration: 0.5, NumNotesInChord: 0 },
            ],
        ],
    },
    {
        name: "roll_on_chord",
        score: {
            MidiParams: { Tempo: 60, Roll: "on" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }, { MidiNote: 64 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "(**)", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [
                { Kind: NoteEvent, NumNotesInChord: 2, Note: 60, Time: 0.0, Duration: 1.0 },
                { Kind: NoteEvent, NumNotesInChord: 2, Note: 64, Time: 0.5, Duration: 0.5 },
            ],
        ],
    },
    {
        name: "roll_off_chord",
        score: {
            MidiParams: { Tempo: 60, Roll: "off" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }, { MidiNote: 64 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "(**)", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [
                { Kind: NoteEvent, NumNotesInChord: 2, Note: 60, Time: 0.0, Duration: 1.0 },
                { Kind: NoteEvent, NumNotesInChord: 2, Note: 64, Time: 0.0, Duration: 1.0 },
            ],
        ],
    },
    {
        name: "two_chords_rolled",
        score: {
            MidiParams: { Tempo: 60, Roll: "on" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }, { MidiNote: 64 }, { MidiNote: 60 }, { MidiNote: 64 }, { MidiNote: 67 }, { MidiNote: 71 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "(**)(****)", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [
                { Kind: NoteEvent, NumNotesInChord: 2, Note: 60, Time: 0.0, Duration: 0.5 },
                { Kind: NoteEvent, NumNotesInChord: 2, Note: 64, Time: 0.25, Duration: 0.25 },
                { Kind: NoteEvent, NumNotesInChord: 4, Note: 60, Time: 0.5, Duration: 0.5 },
                { Kind: NoteEvent, NumNotesInChord: 4, Note: 64, Time: 0.625, Duration: 0.375 },
                { Kind: NoteEvent, NumNotesInChord: 4, Note: 67, Time: 0.75, Duration: 0.25 },
                { Kind: NoteEvent, NumNotesInChord: 4, Note: 71, Time: 0.875, Duration: 0.125 },
            ],
        ],
    },
    {
        name: "multi_line",
        score: {
            MidiParams: { Tempo: 60, Roll: "on" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }] },
                { Pitches: [{ MidiNote: 62 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "*", tupletSize: 1 }] },
                { Tuplets: [{ text: "*", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [{ Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0, NumNotesInChord: 0 }],
            [{ Kind: NoteEvent, Note: 62, Time: 1.0, Duration: 1.0, NumNotesInChord: 0 }],
        ],
    },
    {
        name: "hold_across_tuplets",
        score: {
            MidiParams: { Tempo: 60, Roll: "on" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "*", tupletSize: 1 }, { text: "-", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [{ Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 2.0, NumNotesInChord: 0 }],
        ],
    },
    {
        name: "hold_across_lines",
        score: {
            MidiParams: { Tempo: 60, Roll: "on" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }] },
                { Pitches: [] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "*", tupletSize: 1 }] },
                { Tuplets: [{ text: "-", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [{ Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 2.0, NumNotesInChord: 0 }],
            [],
        ],
    },
    {
        name: "rest_consumes_hold",
        score: {
            MidiParams: { Tempo: 60, Roll: "on" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }, { MidiNote: 60 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "*", tupletSize: 1 }, { text: "-;*", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [
                { Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.3333333333333333, NumNotesInChord: 0 },
                { Kind: NoteEvent, Note: 60, Time: 1.6666666666666665, Duration: 0.3333333333333333, NumNotesInChord: 0 },
            ],
        ],
    },
    {
        name: "multi_beat_tuplet",
        score: {
            MidiParams: { Tempo: 60, Roll: "off" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }, { MidiNote: 62 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "**", tupletSize: 2 }] },
            ],
        },
        expectedEvents: [
            [
                { Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0, NumNotesInChord: 0 },
                { Kind: NoteEvent, Note: 62, Time: 1.0, Duration: 1.0, NumNotesInChord: 0 },
            ],
        ],
    },
    {
        name: "partial_beat_simple",
        score: {
            MidiParams: { Tempo: 60, Roll: "off" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "*_", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [{ Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 0.5, NumNotesInChord: 0 }],
        ],
    },
    {
        name: "partial_beat_complex",
        score: {
            MidiParams: { Tempo: 60, Roll: "off" },
            PitchLines: [
                { Pitches: [{ MidiNote: 60 }, { MidiNote: 62 }] },
            ],
            LyricLines: [
                { Tuplets: [{ text: "*", tupletSize: 1 }, { text: ";-*__", tupletSize: 1 }] },
            ],
        },
        expectedEvents: [
            [
                { Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0, NumNotesInChord: 0 },
                { Kind: NoteEvent, Note: 62, Time: 1.4, Duration: 0.2, NumNotesInChord: 0 },
            ],
        ],
    },
];
