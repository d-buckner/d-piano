# d-piano

A web audio piano instrument

## About

This is a fork of [@tonejs/piano](https://github.com/Tonejs/Piano) by Yotam Mann with performance optimizations and more active maintaince. Built on high-quality samples from [Salamander Grand Piano](https://github.com/sfztools/salamander-grand-piano).

## Features

- **High-quality samples** - Up to 16 velocity levels across 88 keys (Yamaha C5)
- **Complete instrument** - Includes pedal sounds and string harmonics
- **Buffer caching** - Audio buffers are cached and shared across multiple piano instances

## Install

Install the npm package:

```bash
npm install --save d-piano
```

d-piano requires Tone.js as a peer dependency:

```bash
npm install --save tone
```

## Usage

### Import

```javascript
import { Piano } from 'd-piano'
```

### Create and load samples

```javascript
// create the piano and load 5 velocity steps
const piano = new Piano({
	velocities: 5
})

// connect it to the speaker output
piano.toDestination()

// load all samples (returns a promise)
piano.load().then(() => {
	console.log('Piano loaded!')
})
```

### Multiple Piano Instances (Optimized)

The enhanced caching system makes creating multiple pianos efficient:

```javascript
// Create multiple piano instances - audio buffers are shared automatically
const piano1 = new Piano({ velocities: 3 })
const piano2 = new Piano({ velocities: 5 })
const piano3 = new Piano({ velocities: 1 })

// Load all pianos - samples are fetched only once and shared
Promise.all([
	piano1.load(),
	piano2.load(), 
	piano3.load()
]).then(() => {
	console.log('All pianos loaded with optimized caching!')
})
```

## API Reference

### Piano Options

```typescript
interface PianoOptions {
	velocities: number;    // Number of velocity steps to load (default: 1, max: 16)
	minNote: number;       // Lowest MIDI note to load (default: 21)
	maxNote: number;       // Highest MIDI note to load (default: 108)
	release: boolean;      // Include release sounds (default: false)
	pedal: boolean;        // Include pedal sounds (default: true)
	url: string;           // Custom sample URL (optional)
	maxPolyphony: number;  // Max simultaneous notes (default: 32)
	volume: {              // Component volume levels in dB (default: 0)
		pedal: number;
		strings: number;
		keybed: number;
		harmonics: number;
	}
}
```

### Methods

#### `.keyDown({ note: string, time?: Time, velocity?: number })`

Press a note down on the piano. 

```javascript
// Play a 'C4' immediately
piano.keyDown({ note: 'C4' })

// Play a 'C4' 1 second from now with velocity 0.8
piano.keyDown({ note: 'C4', time: '+1', velocity: 0.8 })
```

#### `.keyUp({ note: string, time?: Time })`

Release a note at the given time.

```javascript
// Release the pressed 'C4' immediately
piano.keyUp({ note: 'C4' })
```

#### `.pedalDown({ time?: Time })`

Press and hold the sustain pedal. Notes played while the pedal is down will be sustained until the pedal is released.

#### `.pedalUp({ time?: Time })`

Release the sustain pedal and dampen any sustained notes.

#### `.load(): Promise<void>`

Load all audio samples. Returns a promise that resolves when loading is complete.

#### `.dispose()`

Clean up the piano instance and free resources.

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Credits

This project builds upon the great work of:

- **[@tonejs/piano](https://github.com/Tonejs/Piano)** by [Yotam Mann](https://github.com/tambien) - The original high-quality piano instrument that serves as the foundation for this project
- **[Tone.js](https://tonejs.github.io/)** by [Yotam Mann](https://github.com/tambien) - The Web Audio framework that powers the audio engine
- **[Salamander Grand Piano](https://github.com/sfztools/salamander-grand-piano)** - The high-quality piano samples used in this instrument

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.