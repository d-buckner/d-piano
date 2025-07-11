import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock ToneAudioBuffer to focus on testing our caching logic
vi.mock('tone', () => ({
	ToneAudioBuffer: class MockToneAudioBuffer {
		loaded = false;

		_buffer: AudioBuffer | null = null;

		_url = '';

		constructor(url?: string, onload?: () => void) {
			if (url) {
				this._url = url;
			}
			if (onload) {
				// Simulate async loading
				setTimeout(onload, 10);
			}
		}

		async load(url?: string) {
			const loadUrl = url || this._url;
			
			// Call the parent class load method (simulated)
			if (global.fetch) {
				const response = await global.fetch(loadUrl);
				const arrayBuffer = await response.arrayBuffer();
				const context = { decodeAudioData: () => Promise.resolve({} as AudioBuffer) };
				this._buffer = await context.decodeAudioData();
			}
			
			this.loaded = true;
			return this;
		}

		get() {
			return this._buffer;
		}

		set(buffer: AudioBuffer) {
			this._buffer = buffer;
			this.loaded = true;
			return this;
		}

		dispose() {
			this._buffer = null;
			return this;
		}
	},
}));

import SharedAudioBuffer from '../piano/SharedAudioBuffer';


describe('SharedAudioBuffer Caching', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		
		// Mock fetch to return a valid ArrayBuffer
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
		});
	});

	describe('caching behavior', () => {
		it('should cache audio buffers after first load', async () => {
			const url = 'test-cache-1.mp3';
			const buffer1 = new SharedAudioBuffer(url);
			const buffer2 = new SharedAudioBuffer(url);

			await buffer1.load();
			await buffer2.load();

			// Should only fetch once due to caching
			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(global.fetch).toHaveBeenCalledWith(url);
		});

		it('should handle concurrent loads of same URL', async () => {
			const url = 'test-concurrent-2.mp3';
			const buffer1 = new SharedAudioBuffer(url);
			const buffer2 = new SharedAudioBuffer(url);

			// Load both concurrently
			const [result1, result2] = await Promise.all([
				buffer1.load(),
				buffer2.load(),
			]);

			// Should only fetch once even with concurrent loads
			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(result1.loaded).toBe(true);
			expect(result2.loaded).toBe(true);
		});

		it('should fetch different URLs separately', async () => {
			const url1 = 'test-diff-3.mp3';
			const url2 = 'test-diff-4.mp3';
			
			const buffer1 = new SharedAudioBuffer(url1);
			const buffer2 = new SharedAudioBuffer(url2);

			await buffer1.load();
			await buffer2.load();

			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(global.fetch).toHaveBeenCalledWith(url1);
			expect(global.fetch).toHaveBeenCalledWith(url2);
		});
	});

	describe('error handling', () => {
		it('should handle fetch errors', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
			
			const buffer = new SharedAudioBuffer('test-error-5.mp3');
			
			await expect(buffer.load()).rejects.toThrow('Network error');
		});

		it('should throw error when no URL provided', async () => {
			const buffer = new SharedAudioBuffer();
			
			await expect(buffer.load()).rejects.toThrow('No url provided');
		});

		it('should allow retry after failed load', async () => {
			const url = 'test-retry-6.mp3';
			
			// First call fails
			global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValue({
					ok: true,
					arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
				});
			
			const buffer = new SharedAudioBuffer(url);
			
			// First load should fail
			await expect(buffer.load()).rejects.toThrow('Network error');
			
			// Second load should succeed
			await expect(buffer.load()).resolves.toBeDefined();
		});
	});

	describe('edge cases', () => {
		it('should handle URL parameter override', async () => {
			const buffer = new SharedAudioBuffer('initial-url.mp3');
			
			// Load with different URL
			await buffer.load('override-url-7.mp3');
			
			expect(global.fetch).toHaveBeenCalledWith('override-url-7.mp3');
		});

		it('should handle rapid successive loads of same instance', async () => {
			const url = 'test-rapid-8.mp3';
			const buffer = new SharedAudioBuffer(url);
			
			// Fire multiple loads rapidly
			const promises = [
				buffer.load(),
				buffer.load(),
				buffer.load(),
			];
			
			await Promise.all(promises);
			
			// Should only fetch once
			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(global.fetch).toHaveBeenCalledWith(url);
		});
	});
});
