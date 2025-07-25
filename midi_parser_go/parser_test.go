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
		if a[i].Note != b[i].Note || !almostEqual(a[i].Time, b[i].Time) || !almostEqual(a[i].Duration, b[i].Duration) {
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
