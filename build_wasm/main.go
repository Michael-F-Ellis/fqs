//go:build js

package main

import (
	"encoding/json"
	"fqs/midi_parser_go"
	"syscall/js"
)

// parseFqsWasm is the wrapper function that will be called from JavaScript.
// It takes a JSON string representing the score, parses it, and returns a JSON
// string of the MIDI events.
func parseFqsWasm(this js.Value, args []js.Value) interface{} {
	if len(args) != 1 {
		return "Error: Invalid number of arguments. Expected 1 (score JSON)."
	}

	scoreJSON := args[0].String()
	var score midi_parser_go.Score

	// Unmarshal the JSON string into our Go Score struct
	if err := json.Unmarshal([]byte(scoreJSON), &score); err != nil {
		return "Error: Failed to unmarshal score JSON: " + err.Error()
	}

	// Create a new parser and parse the score
	parser := midi_parser_go.NewMidiParser(&score)
	events := parser.Parse()

	// Marshal the resulting events back to a JSON string
	resultJSON, err := json.Marshal(events)
	if err != nil {
		return "Error: Failed to marshal result events to JSON: " + err.Error()
	}

	return string(resultJSON)
}

func main() {
	c := make(chan struct{}, 0)
	// Expose the parseFqsWasm function to the global JavaScript scope
	// under the name `parseFQS`.
	js.Global().Set("parseFQS", js.FuncOf(parseFqsWasm))
	<-c // Keep the Go program running
}
