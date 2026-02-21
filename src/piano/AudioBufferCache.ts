import { ToneAudioBuffer, ToneAudioBuffers, getContext } from 'tone';

import type { UrlsMap } from './Component';


export const PIANO_CACHE_NAME = 'd-piano-samples';


interface BufferMap {
  [note: string]: ToneAudioBuffer,
}

export default class AudioBufferCache {
  private static buffers: Record<string, ToneAudioBuffer> = {};

  private static loading: Record<string, Promise<ToneAudioBuffer>> = {};

  static async getBufferMap(baseUrl: string, urlsMap: UrlsMap): Promise<BufferMap> {
    const bufferMap: BufferMap = {};

    await Promise.allSettled(Object.entries(urlsMap).map(async ([note, url]) => {
      bufferMap[note] = await AudioBufferCache.getBuffer(baseUrl + url);
    }));

    return bufferMap;
  }

  static async getBuffers(baseUrl: string, urlsMap: UrlsMap): Promise<ToneAudioBuffers> {
    const audioBuffers = new ToneAudioBuffers();

    await Promise.allSettled(Object.entries(urlsMap).map(async ([name, url]) => {
      audioBuffers.add(name, await AudioBufferCache.getBuffer(baseUrl + url));
    }));

    return audioBuffers;
  }

  static async getBuffer(url: string): Promise<ToneAudioBuffer> {
    if (AudioBufferCache.buffers[url]) {
      return AudioBufferCache.buffers[url];
    }
    if (AudioBufferCache.loading[url]) {
      return AudioBufferCache.loading[url];
    }

    const loadingBuffer = AudioBufferCache._loadBuffer(url);
    AudioBufferCache.loading[url] = loadingBuffer;

    try {
      const buffer = await loadingBuffer;
      AudioBufferCache.buffers[url] = buffer;
      return buffer;
    } finally {
      delete AudioBufferCache.loading[url];
    }
  }

  private static async _loadBuffer(url: string): Promise<ToneAudioBuffer> {
    const cached = await caches.match(url);
    if (cached) {
      return AudioBufferCache._decodeResponse(cached);
    }

    return AudioBufferCache._fetchAndCache(url);
  }

  private static async _fetchAndCache(url: string): Promise<ToneAudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
    }

    try {
      const cache = await caches.open(PIANO_CACHE_NAME);
      await cache.put(url, response.clone());
    } catch {
      // cache write failure is non-fatal
    }

    return AudioBufferCache._decodeResponse(response);
  }

  private static async _decodeResponse(response: Response): Promise<ToneAudioBuffer> {
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await getContext().rawContext.decodeAudioData(arrayBuffer);
    return new ToneAudioBuffer(audioBuffer);
  }
}
