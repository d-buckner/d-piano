import { ToneAudioBuffer, ToneAudioBuffers } from 'tone';

import type { UrlsMap } from './Component';


interface BufferMap {
  [note: string]: ToneAudioBuffer,
}

export default class AudioBufferCache {
  private static cache: Record<string, Promise<ToneAudioBuffer>> = {};

  public static async getBufferMap(baseUrl: string, urlsMap: UrlsMap): Promise<BufferMap> {
    const promises: Promise<void>[] = [];
    const bufferMap: BufferMap = {};

    // asyncronously build buffer map
    Object.entries(urlsMap).forEach(([note, url]) => {
      const load = AudioBufferCache.getBuffer(baseUrl + url).then(buffer => {
        bufferMap[note] = buffer;
      });
      promises.push(load); // push to promises for completion tracking
    });

    await Promise.allSettled(promises);
    return bufferMap;
  }

  public static async getBuffers(baseUrl: string, urlsMap: UrlsMap): Promise<ToneAudioBuffers> {
    const audioBuffers = new ToneAudioBuffers();
    const promises: Promise<void>[] = [];

    // asyncronously build buffer map
    Object.entries(urlsMap).forEach(([name, url]) => {
      const load = AudioBufferCache.getBuffer(baseUrl + url).then(buffer => {
        audioBuffers.add(name, buffer);
      });
      promises.push(load); // push to promises for completion tracking
    });

    await Promise.allSettled(promises);
    return audioBuffers;
  }

  public static getBuffer(url: string): Promise<ToneAudioBuffer> {
    // TODO: we can limit concurrent downloads to prevent overwhelm for applications that
    // have may other fetches going on
    const cacheItem = AudioBufferCache.cache[url];
    if (!cacheItem) {
      const loadingBuffer = ToneAudioBuffer.fromUrl(url);
      AudioBufferCache.cache[url] = loadingBuffer;
      return loadingBuffer;
    }

    return cacheItem;
  }
}
