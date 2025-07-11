import type SharedAudioBuffer from './SharedAudioBuffer';

/**
 * Map of note names to shared audio buffers.
 */
export interface SharedBufferMap {
	[note: string]: SharedAudioBuffer;
}
