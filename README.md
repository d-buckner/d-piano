# d-piano

A web audio piano instrument

## About

This is a fork of [@tonejs/piano](https://github.com/Tonejs/Piano) by Yotam Mann with performance optimizations and more active maintaince. Built on high-quality samples from [Salamander Grand Piano](https://github.com/sfztools/salamander-grand-piano).

## Features

- **High-quality samples** - Up to 16 velocity levels across 88 keys (Yamaha C5)
- **Complete instrument** - Includes pedal sounds and string harmonics
- **Progressive loading** - Loads 1 velocity level immediately for fast startup, then upgrades to full quality in the background during browser idle time
- **Cache-aware** - Probes the Cache Storage API at startup; if target-quality samples are already cached, starts at full quality immediately rather than the single-velocity warm-up pass
- **Buffer caching** - Audio buffers are shared across multiple piano instances and across progressive upgrade steps — no re-fetching

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
// Create the piano — progressive loading is automatic
const piano = new Piano({
	velocities: 8  // target quality; default is 8
})

// Connect to speaker output
piano.toDestination()

// Resolves as soon as the first pass (1 velocity) is ready to play.
// Upgrading to full quality happens automatically in the background.
piano.load().then(() => {
	console.log('Piano ready — playing at 1 velocity, upgrading in background')
})
```

### How progressive loading works

`load()` resolves after a fast first pass (1 velocity layer) so you can start playing immediately. The upgrade to the target velocity count happens in the background via `requestIdleCallback`, expanding the velocity layers in-place without interrupting notes that are already playing.

If the target samples are already in the Cache Storage API, the piano starts at full quality immediately instead of going through the single-velocity warm-up pass first. This pairs well with `preloadSamples` and any service worker caching strategy in your own app.

```
Cold load (nothing cached):
  load() resolves → playing at 1 velocity
  [idle] → upgrades to 8 velocities in-place, no interruption

Warm load (samples cached):
  load() resolves → playing at 8 velocities immediately
```

### Preloading samples

Use `preloadSamples` to fetch samples ahead of time without importing the full Tone.js piano. Combined with a service worker caching strategy in your app, this means `Piano` will detect the cached samples on the next load and start at full quality immediately.

```javascript
import { preloadSamples } from 'd-piano'

await preloadSamples(8, {
	baseUrl: '/assets/samples/piano/',
	minNote: 21,
	maxNote: 108,
})
```

## API Reference

### Piano Options

```typescript
interface PianoOptions {
	velocities: number;    // Target velocity levels (default: 8, max: 16). Progressive
	                       // loading starts at 1 and upgrades to this in the background.
	minNote: number;       // Lowest MIDI note to load (default: 21)
	maxNote: number;       // Highest MIDI note to load (default: 108)
	release: boolean;      // Include release sounds (default: false)
	pedal: boolean;        // Include pedal sounds (default: true)
	url: string;           // Sample directory URL
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

Start loading samples. Resolves as soon as the first velocity pass is ready to play. The upgrade to full velocity resolution continues in the background and requires no further interaction.

#### `.loaded: boolean`

`true` once the first velocity pass has finished loading and the piano is ready to play.

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