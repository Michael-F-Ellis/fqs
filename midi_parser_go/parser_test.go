package midi_parser

import (
	"math"
	"testing"
)

const float64EqualityThreshold = 1e-9

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) <= float64EqualityThreshold
}

func compareNoteEvents(a, b []NoteEvent) bool {
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

func TestParseSingleNotes(t *testing.T) {
	score := Score{
		MidiParams: MidiParams{Tempo: 60, Roll: "on"},
		PitchLines: []PitchLine{
			{
				Pitches: []Pitch{
					{MidiNote: 60}, {MidiNote: 62}, {MidiNote: 64}, {MidiNote: 65}, {MidiNote: 67}, {MidiNote: 69},
				},
			},
		},
		LyricLines: []LyricLine{
			{
				Tuplets: []Tuplet{
					{Text: "*", TupletSize: 1}, {Text: "*", TupletSize: 1}, {Text: "*", TupletSize: 1},
					{Text: "*", TupletSize: 1}, {Text: "*", TupletSize: 1}, {Text: "*", TupletSize: 1},
				},
			},
		},
	}

	expected := [][]NoteEvent{
		{
			{Note: 60, Time: 0.0, Duration: 1.0}, {Note: 62, Time: 1.0, Duration: 1.0},
			{Note: 64, Time: 2.0, Duration: 1.0}, {Note: 65, Time: 3.0, Duration: 1.0},
			{Note: 67, Time: 4.0, Duration: 1.0}, {Note: 69, Time: 5.0, Duration: 1.0},
		},
	}

	result := Parse(score)

	if !compareNoteEvents(result[0], expected[0]) {
		t.Errorf("TestParseSingleNotes failed.")
		t.Logf("Expected: %+v", expected[0])
		t.Logf("Got:      %+v", result[0])
	}
}

func TestCalculateNoteStartTimes(t *testing.T) {
	t.Run("Chords and single notes", func(t *testing.T) {
		pitchLine := PitchLine{
			Pitches: []Pitch{
				{MidiNote: 60, IsChordPitch: true, ChordGroupNumber: 1}, // C4
				{MidiNote: 62, IsChordPitch: true, ChordGroupNumber: 1}, // D4
				{MidiNote: 64, IsChordPitch: true, ChordGroupNumber: 2}, // E4
				{MidiNote: 65, IsChordPitch: true, ChordGroupNumber: 2}, // F4
				{MidiNote: 67, IsChordPitch: true, ChordGroupNumber: 2}, // G4
				{MidiNote: 69, IsChordPitch: false},                     // A4
			},
		}
		lyricLine := LyricLine{
			Tuplets: []Tuplet{
				{Text: "(*)", TupletSize: 1},
				{Text: "-", TupletSize: 1},
				{Text: "(*)", TupletSize: 1},
				{Text: "(*)", TupletSize: 1},
			},
		}
		beatDuration := 1.0 // Tempo 60
		rollChords := true

		expectedTimes := []float64{
			0.0,           // C4
			0.5,           // D4 (rolled)
			2.0,           // E4
			2.0 + 1.0/3.0, // F4 (rolled)
			2.0 + 2.0/3.0, // G4 (rolled)
			3.0,           // A4
		}

		resultTimes := calculateNoteStartTimes(lyricLine, pitchLine, beatDuration, rollChords)

		if len(resultTimes) != len(expectedTimes) {
			t.Fatalf("Expected %d start times, but got %d.", len(expectedTimes), len(resultTimes))
		}
		for i, expected := range expectedTimes {
			if !almostEqual(resultTimes[i], expected) {
				t.Errorf("Time mismatch at index %d. Expected %f, Got %f", i, expected, resultTimes[i])
			}
		}
	})
}

func TestParseChordsAndHolds(t *testing.T) {
	score := Score{
		MidiParams: MidiParams{Tempo: 60, Roll: "on"},
		PitchLines: []PitchLine{
			{
				Pitches: []Pitch{
					{MidiNote: 60, IsChordPitch: true, ChordGroupNumber: 1},
					{MidiNote: 62, IsChordPitch: true, ChordGroupNumber: 1},
					{MidiNote: 64, IsChordPitch: true, ChordGroupNumber: 2},
					{MidiNote: 65, IsChordPitch: true, ChordGroupNumber: 2},
					{MidiNote: 67, IsChordPitch: true, ChordGroupNumber: 2},
					{MidiNote: 69, IsChordPitch: false},
				},
			},
		},
		LyricLines: []LyricLine{
			{
				Tuplets: []Tuplet{
					{Text: "(*)", TupletSize: 1},
					{Text: "-", TupletSize: 1},
					{Text: "(*)", TupletSize: 1},
					{Text: "(*)", TupletSize: 1},
				},
			},
		},
	}

	expected := [][]NoteEvent{
		{
			{Note: 60, Time: 0.0, Duration: 0.5},
			{Note: 62, Time: 0.5, Duration: 1.5},
			{Note: 64, Time: 2.0, Duration: 1.0 / 3.0},
			{Note: 65, Time: 2.0 + 1.0/3.0, Duration: 1.0 / 3.0},
			{Note: 67, Time: 2.0 + 2.0/3.0, Duration: 1.0 / 3.0},
			{Note: 69, Time: 3.0, Duration: 1.0},
		},
	}

	result := Parse(score)

	if len(result) == 0 || !compareNoteEvents(result[0], expected[0]) {
		t.Errorf("TestParseChordsAndHolds failed.")
		t.Logf("Expected: %+v", expected[0])
		if len(result) > 0 {
			t.Logf("Got:      %+v", result[0])
		} else {
			t.Logf("Got:      []")
		}
	}
}
