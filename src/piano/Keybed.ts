import { ToneAudioBuffers, ToneBufferSource } from 'tone';

import { PianoComponent } from './Component';
import { getReleasesUrl } from './Salamander';
import { randomBetween } from './Util';

import type { PianoComponentOptions, UrlsMap } from './Component';


interface KeybedOptions extends PianoComponentOptions {
	minNote: number
	maxNote: number
}

export class Keybed extends PianoComponent {

	/**
	 * All of the buffers of keybed clicks
	 */
	private _buffers: ToneAudioBuffers;

	/**
	 * The urls to load
	 */
	private _urls: UrlsMap = {};

	constructor(options: KeybedOptions) {
		super(options);

		for (let i = options.minNote; i <= options.maxNote; i++) {
			this._urls[i] = getReleasesUrl(i);
		}
	}

	protected _internalLoad(): Promise<void> {
		return new Promise(success => {
			this._buffers = new ToneAudioBuffers(this._urls, success, this.samples);
		});
	}

	start(note: number, time: number, velocity: number): void {
		if (this._enabled && this._buffers.has(note)) {
			const source = new ToneBufferSource({
				context: this.context,
				url: this._buffers.get(note),
			}).connect(this.output);
			// randomize the velocity slightly
			source.start(time, 0, undefined, 0.015 * velocity * randomBetween(0.5, 1));
		}
	}
}
