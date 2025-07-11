import { ToneAudioBuffers } from 'tone';

import SharedAudioBuffer from './SharedAudioBuffer';


export default class SharedAudioBuffers extends ToneAudioBuffers {
	add(name: string | number, url: string | AudioBuffer | SharedAudioBuffer, callback?: () => void, onerror?: (_e: Error) => void): this {
		// Defensive check for _buffers property existence
		const buffers = (this as any)._buffers;
		if (!buffers || typeof buffers.set !== 'function') {
			throw new Error('SharedAudioBuffers: ToneAudioBuffers internal structure has changed');
		}

		if (typeof url === 'string') {
			// Create SharedAudioBuffer instead of ToneAudioBuffer
			const fullUrl = this.baseUrl + url;
			const buffer = new SharedAudioBuffer(fullUrl, callback, onerror);
			buffers.set(name.toString(), buffer);
		} else {
			const buffer = new SharedAudioBuffer(url, callback, onerror);
			buffers.set(name.toString(), buffer);
		}
		return this;
	}
}
