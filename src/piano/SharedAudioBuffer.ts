import { ToneAudioBuffer } from 'tone';


const cache: Map<string, AudioBuffer> = new Map();
const loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();

export default class SharedAudioBuffer extends ToneAudioBuffer {
	private _cachedUrl?: string;

	constructor(url?: string | AudioBuffer | ToneAudioBuffer, onload?: () => void, onerror?: (_e: Error) => void) {
		super(url, onload, onerror);
		if (typeof url === 'string') {
			this._cachedUrl = url;
		}
	}

	async load(url?: string): Promise<this> {
		const loadUrl = url || this._cachedUrl;
		if (!loadUrl) {
			throw new Error('No url provided');
		}

		// Store URL for future reference
		if (url) {
			this._cachedUrl = url;
		}

		const cached = cache.get(loadUrl);
		if (cached) {
			this.set(cached);
			return this;
		}

		// Check if we're already loading this URL
		const loadingPromise = loadingPromises.get(loadUrl);
		if (loadingPromise) {
			const buffer = await loadingPromise;
			this.set(buffer);
			return this;
		}

		// Start loading and track the promise
		const promise = this.loadFromNetwork(url);
		loadingPromises.set(loadUrl, promise);

		try {
			const buffer = await promise;
			cache.set(loadUrl, buffer);
			this.set(buffer);
			return this;
		} finally {
			loadingPromises.delete(loadUrl);
		}
	}

	private async loadFromNetwork(url?: string): Promise<AudioBuffer> {
		try {
			await super.load(url);
			const buffer = this.get();
			if (!buffer) {
				throw new Error(`Failed to decode audio buffer for URL: ${url || this._cachedUrl}`);
			}
			return buffer;
		} catch (error) {
			// Enhance error with context
			const loadUrl = url || this._cachedUrl;
			throw new Error(`AudioBuffer load failed for '${loadUrl}': ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
