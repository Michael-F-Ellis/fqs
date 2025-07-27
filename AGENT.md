# FQS Development Guide

## Build & Test Commands
- `npm test` - Run Jest tests  
- `python3 build.py [version]` - Build fqs.html from pre-fqs.html
- `cd midi_parser_go && go test` - Test Go WASM parser
- `cd midi_parser_go && GOOS=js GOARCH=wasm go build -o ../fqs_parser.wasm main.go parser.go` - Build WASM module

## Architecture
- **Core**: Single-page web app built from pre-fqs.html → fqs.html 
- **Frontend**: Vanilla JS modules in src/ (ES6 imports, classes)
- **WASM**: Go-based MIDI parser (midi_parser_go/) compiled to WebAssembly
- **Entry point**: fqs.js imports all modules, main classes: Book, Score, PitchLine, LyricLine
- **Testing**: Jest with experimental VM modules for ES6 support

## Code Style
- Use ES6 modules with explicit imports/exports
- PascalCase for classes (Score, Book, MidiPlayer)
- camelCase for variables/functions  
- No comments unless complex logic requires context
- Import modules at top of file with relative paths
- Use Map() for collections, Set() for unique values
- Class constructors take container element + dependencies
- Error handling via console.error() and early returns
