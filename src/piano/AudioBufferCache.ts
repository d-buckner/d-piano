import { ToneAudioBuffer, ToneAudioBuffers, getContext } from 'tone';

import type { UrlsMap } from './Component';


export const PIANO_CACHE_NAME = 'd-piano-samples';

const IDB_DB_NAME = 'd-piano-decoded';
const IDB_STORE_NAME = 'buffers';
const IDB_VERSION = 1;

interface StoredAudioData {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  channels: Float32Array<ArrayBuffer>[];
}

interface BufferMap {
  [note: string]: ToneAudioBuffer,
}

export default class AudioBufferCache {
  private static buffers: Record<string, ToneAudioBuffer> = {};

  private static loading: Record<string, Promise<ToneAudioBuffer>> = {};

  private static _db: Promise<IDBDatabase | null> | null = null;

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

  private static _openDb(): Promise<IDBDatabase | null> {
    if (AudioBufferCache._db !== null) {
      return AudioBufferCache._db;
    }
    AudioBufferCache._db = new Promise(resolve => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return AudioBufferCache._db;
  }

  private static async _getFromIdb(url: string): Promise<ToneAudioBuffer | null> {
    try {
      const db = await AudioBufferCache._openDb();
      if (!db) {
        return null;
      }
      return new Promise(resolve => {
        const req = db.transaction(IDB_STORE_NAME, 'readonly').objectStore(IDB_STORE_NAME).get(url);
        req.onsuccess = () => {
          const data: StoredAudioData | undefined = req.result;
          if (!data) {
            resolve(null);
            return;
          }
          try {
            const raw = getContext().rawContext.createBuffer(data.numberOfChannels, data.length, data.sampleRate);
            for (let i = 0; i < data.numberOfChannels; i++) {
              raw.copyToChannel(data.channels[i], i);
            }
            resolve(new ToneAudioBuffer(raw));
          } catch {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private static async _saveToIdb(url: string, buffer: ToneAudioBuffer): Promise<void> {
    try {
      const db = await AudioBufferCache._openDb();
      if (!db) {
        return;
      }
      const raw = buffer.get() as AudioBuffer;
      const channels: Float32Array<ArrayBuffer>[] = [];
      for (let i = 0; i < raw.numberOfChannels; i++) {
        channels.push(raw.getChannelData(i).slice());
      }
      const data: StoredAudioData = {
        sampleRate: raw.sampleRate,
        numberOfChannels: raw.numberOfChannels,
        length: raw.length,
        channels,
      };
      return new Promise(resolve => {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        tx.objectStore(IDB_STORE_NAME).put(data, url);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // non-fatal
    }
  }

  private static async _loadBuffer(url: string): Promise<ToneAudioBuffer> {
    const idbBuffer = await AudioBufferCache._getFromIdb(url);
    if (idbBuffer) {
      return idbBuffer;
    }

    const cached = await caches.match(url);
    if (cached) {
      const buffer = await AudioBufferCache._decodeResponse(cached);
      void AudioBufferCache._saveToIdb(url, buffer);
      return buffer;
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

    const buffer = await AudioBufferCache._decodeResponse(response);
    void AudioBufferCache._saveToIdb(url, buffer);
    return buffer;
  }

  private static async _decodeResponse(response: Response): Promise<ToneAudioBuffer> {
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await getContext().rawContext.decodeAudioData(arrayBuffer);
    return new ToneAudioBuffer(audioBuffer);
  }
}
