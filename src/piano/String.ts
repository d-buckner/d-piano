import { Sampler, ToneAudioNode } from 'tone';

import { getNotesUrl } from './Salamander';
import SharedAudioBuffer from './SharedAudioBuffer';

import type { PianoComponentOptions, UrlsMap } from './Component';
import type { SharedBufferMap } from './types';


interface PianoStringOptions extends PianoComponentOptions {
	notes: number[]
	velocity: number
}

/**
 * A single velocity of strings
 */
export class PianoString extends ToneAudioNode {

	readonly name = 'PianoString';

	private _sampler: Sampler;

	output: Sampler;

	input: undefined;

	private _urls: UrlsMap = {};

	readonly samples: string;

	constructor(options: PianoStringOptions) {
		super(options);

		// create the urls
		options.notes.forEach(note => this._urls[note] = getNotesUrl(note, options.velocity));

		this.samples = options.samples;
	}

	async load(): Promise<void> {
		// Pre-load all audio buffers using SharedAudioBuffer for caching
		const urls: SharedBufferMap = {};
		
		const loadPromises = Object.entries(this._urls).map(async ([note, url]) => {
			const fullUrl = this.samples + url;
			const sharedBuffer = new SharedAudioBuffer(fullUrl);
			await sharedBuffer.load();
			urls[note] = sharedBuffer;
		});

		await Promise.all(loadPromises);

		// Create sampler with pre-loaded SharedAudioBuffers
		return new Promise(onload => {
			this._sampler = this.output = new Sampler({
				attack: 0,
				curve: 'exponential',
				onload,
				release: 0.4,
				urls,
				volume: 3,
			});
		});
	}

	triggerAttack(note: string, time: number, velocity: number): void {
		this._sampler.triggerAttack(note, time, velocity);
	}

	triggerRelease(note: string, time: number): void {
		this._sampler.triggerRelease(note, time);
	}
}
