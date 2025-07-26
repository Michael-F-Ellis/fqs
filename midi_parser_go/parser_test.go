package midi_parser

import (
	"math"
	"testing"
)

const float64EqualityThreshold = 1e-9

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) <= float64EqualityThreshold
}

func compareNoteEvents(a, b []MusicEvent) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].Kind != b[i].Kind || a[i].Note != b[i].Note || !almostEqual(a[i].Time, b[i].Time) || !almostEqual(a[i].Duration, b[i].Duration) || a[i].NumNotesInChord != b[i].NumNotesInChord {
			return false
		}
	}
	return true
}

func compareMultipleLines(a, b [][]MusicEvent) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if !compareNoteEvents(a[i], b[i]) {
			return false
		}
	}
	return true
}

func TestParse(t *testing.T) {
	// score containing one line with one note
	score := Score{
		MidiParams: MidiParams{Tempo: 60, Roll: "on"},
		PitchLines: []PitchLine{
			{
				Pitches: []Pitch{
					{MidiNote: 60},
				},
			},
		},
		LyricLines: []LyricLine{
			{
				Tuplets: []Tuplet{
					{Text: "*", TupletSize: 1},
				},
			},
		},
	}
	p := NewMidiParser(&score)
	events := p.Parse()
	if len(events) != 1 || len(events[0]) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	// check the content of the event
	if events[0][0].Note != 60 {
		t.Errorf("Expected note 60, got %d", events[0][0].Note)
	}
	if events[0][0].Time != 0.0 {
		t.Errorf("Expected time 0.0, got %f", events[0][0].Time)
	}
	if events[0][0].Duration != 1.0 {
		t.Errorf("Expected duration 1.0, got %f", events[0][0].Duration)
	}
}

func TestParseMultiple(t *testing.T) {
	testCases := []struct {
		name           string
		score          Score
		expectedEvents [][]MusicEvent
	}{
		{
			name: "single note",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "on"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "*", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0},
				},
			},
		},
		{
			name: "two notes",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "on"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
							{MidiNote: 62},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "**", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 0.5},
					{Kind: NoteEvent, Note: 62, Time: 0.5, Duration: 0.5},
				},
			},
		},
		{
			name: "roll_on_chord",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "on"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
							{MidiNote: 64},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "(**)", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, NumNotesInChord: 2, Note: 60, Time: 0.0, Duration: 1.0},
					{Kind: NoteEvent, NumNotesInChord: 2, Note: 64, Time: 0.5, Duration: 0.5},
				},
			},
		},
		{
			name: "roll_off_chord",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "off"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
							{MidiNote: 64},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "(**)", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, NumNotesInChord: 2, Note: 60, Time: 0.0, Duration: 1.0},
					{Kind: NoteEvent, NumNotesInChord: 2, Note: 64, Time: 0.0, Duration: 1.0},
				},
			},
		},
		{
			name: "two_chords_rolled",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "on"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
							{MidiNote: 64},
							{MidiNote: 60},
							{MidiNote: 64},
							{MidiNote: 67},
							{MidiNote: 71},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "(**)(****)", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, NumNotesInChord: 2, Note: 60, Time: 0.0, Duration: 0.5},
					{Kind: NoteEvent, NumNotesInChord: 2, Note: 64, Time: 0.25, Duration: 0.25},
					{Kind: NoteEvent, NumNotesInChord: 4, Note: 60, Time: 0.5, Duration: 0.5},
					{Kind: NoteEvent, NumNotesInChord: 4, Note: 64, Time: 0.625, Duration: 0.375},
					{Kind: NoteEvent, NumNotesInChord: 4, Note: 67, Time: 0.75, Duration: 0.25},
					{Kind: NoteEvent, NumNotesInChord: 4, Note: 71, Time: 0.875, Duration: 0.125},
				},
			},
		},
		{
			name: "multi_line",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "on"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
						},
					},
					{
						Pitches: []Pitch{
							{MidiNote: 62},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "*", TupletSize: 1},
						},
					},
					{
						Tuplets: []Tuplet{
							{Text: "*", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0},
				},
				{
					{Kind: NoteEvent, Note: 62, Time: 1.0, Duration: 1.0},
				},
			},
		},
		{
			name: "hold_across_tuplets",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "on"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "*", TupletSize: 1},
							{Text: "-", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 2.0},
				},
			},
		},
		{
			name: "hold_across_lines",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "on"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
						},
					},
					{},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "*", TupletSize: 1},
						},
					},
					{
						Tuplets: []Tuplet{
							{Text: "-", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 2.0},
				},
				{},
			},
		},
		{
			name: "rest_consumes_hold",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "on"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
							{MidiNote: 60},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "*", TupletSize: 1},
							{Text: "-;*", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.3333333333333333},
					{Kind: NoteEvent, Note: 60, Time: 1.6666666666666665, Duration: 0.3333333333333333},
				},
			},
		},
		{
			name: "multi_beat_tuplet",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "off"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
							{MidiNote: 62},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "**", TupletSize: 2},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0},
					{Kind: NoteEvent, Note: 62, Time: 1.0, Duration: 1.0},
				},
			},
		},
		{
			name: "partial_beat_simple",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "off"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "*_", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 0.5},
				},
			},
		},
		{
			name: "partial_beat_complex",
			score: Score{
				MidiParams: MidiParams{Tempo: 60, Roll: "off"},
				PitchLines: []PitchLine{
					{
						Pitches: []Pitch{
							{MidiNote: 60},
							{MidiNote: 62},
						},
					},
				},
				LyricLines: []LyricLine{
					{
						Tuplets: []Tuplet{
							{Text: "*", TupletSize: 1},
							{Text: ";-*__", TupletSize: 1},
						},
					},
				},
			},
			expectedEvents: [][]MusicEvent{
				{
					{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0},
					{Kind: NoteEvent, Note: 62, Time: 1.4, Duration: 0.2},
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			p := NewMidiParser(&tc.score)
			actualEvents := p.Parse()
			if !compareMultipleLines(actualEvents, tc.expectedEvents) {
				t.Errorf("Expected events \n%v, got \n%v", tc.expectedEvents, actualEvents)
			}
		})
	}
}
