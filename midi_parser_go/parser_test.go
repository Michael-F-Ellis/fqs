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
		if a[i].Kind != b[i].Kind || a[i].Note != b[i].Note || !almostEqual(a[i].Time, b[i].Time) || !almostEqual(a[i].Duration, b[i].Duration) {
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
	p.Parse()
	if len(p.Events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(p.Events))
	}
	// check the content of the event
	if p.Events[0].Note != 60 {
		t.Errorf("Expected note 60, got %d", p.Events[0].Note)
	}
	if p.Events[0].Time != 0.0 {
		t.Errorf("Expected time 0.0, got %f", p.Events[0].Time)
	}
	if p.Events[0].Duration != 1.0 {
		t.Errorf("Expected duration 1.0, got %f", p.Events[0].Duration)
	}
}

func TestParseMultiple(t *testing.T) {
	testCases := []struct {
		name           string
		score          Score
		expectedEvents []MusicEvent
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
			expectedEvents: []MusicEvent{
				{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0},
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
			expectedEvents: []MusicEvent{
				{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 0.5},
				{Kind: NoteEvent, Note: 62, Time: 0.5, Duration: 0.5},
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
			expectedEvents: []MusicEvent{
				{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0},
				{Kind: NoteEvent, Note: 64, Time: 0.5, Duration: 0.5},
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
			expectedEvents: []MusicEvent{
				{Kind: NoteEvent, Note: 60, Time: 0.0, Duration: 1.0},
				{Kind: NoteEvent, Note: 64, Time: 0.0, Duration: 1.0},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			p := NewMidiParser(&tc.score)
			p.Parse()
			if !compareNoteEvents(p.Events, tc.expectedEvents) {
				t.Errorf("Expected events %v, got %v", tc.expectedEvents, p.Events)
			}
		})
	}
}
