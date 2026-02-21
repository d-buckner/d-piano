/**
 * Sample preloader that fetches piano audio files without importing Tone.js
 * Uses existing Salamander.ts utilities to avoid duplication
 */

import { allNotes, getNotesInRange, velocitiesMap } from './piano/Salamander';
import { midiToNoteString } from './midiUtils';
import { PIANO_CACHE_NAME } from './piano/AudioBufferCache';


export interface PreloadOptions {
  /**
   * Base URL for samples (defaults to Piano default)
   */
  baseUrl?: string;
  /**
   * Lowest MIDI note to preload (default: 21)
   */
  minNote?: number;
  /**
   * Highest MIDI note to preload (default: 108)
   */
  maxNote?: number;
  /**
   * Include harmonics samples (default: false)
   */
  includeHarmonics?: boolean;
  /**
   * Include pedal samples (default: false)
   */
  includePedal?: boolean;
  /**
   * Include release samples (default: false)
   */
  includeRelease?: boolean;
}

/**
 * Generate note sample URL without using Tone.js
 * Reimplements getNotesUrl from Salamander.ts using midiUtils
 */
function getNotesUrlToneFree(midi: number, vel: number): string {
  const noteString = midiToNoteString(midi);
  return `${noteString.replace('#', 's')}v${vel}.ogg`;
}

/**
 * Generate harmonics sample URL without using Tone.js
 * Reimplements getHarmonicsUrl from Salamander.ts using midiUtils
 */
function getHarmonicsUrlToneFree(midi: number): string {
  const noteString = midiToNoteString(midi);
  return `harmS${noteString.replace('#', 's')}.ogg`;
}

/**
 * Generate release sample URL
 * Reimplements getReleasesUrl from Salamander.ts
 */
function getReleasesUrlToneFree(midi: number): string {
  return `rel${midi - 20}.ogg`;
}

/**
 * Preload piano samples into the Cache Storage API.
 * Skips URLs already present in the cache.
 */
export async function preloadSamples(
  velocities: number,
  options: PreloadOptions = {}
): Promise<void> {
  const {
    baseUrl = 'https://tambien.github.io/Piano/Salamander/',
    minNote = 21,
    maxNote = 108,
    includeHarmonics = false,
    includePedal = false,
    includeRelease = false,
  } = options;

  const samplesUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const velocityLevels = velocitiesMap[velocities] || [8];
  const notesToLoad = getNotesInRange(minNote, maxNote);

  const urlsToFetch: string[] = [];

  for (const midi of notesToLoad) {
    for (const vel of velocityLevels) {
      urlsToFetch.push(samplesUrl + getNotesUrlToneFree(midi, vel));
    }
  }

  if (includeHarmonics) {
    const harmonicsNotes = allNotes.filter(note => note >= 21 && note <= 87);
    for (const midi of harmonicsNotes) {
      urlsToFetch.push(samplesUrl + getHarmonicsUrlToneFree(midi));
    }
  }

  if (includePedal) {
    urlsToFetch.push(samplesUrl + 'pedalD1.ogg');
    urlsToFetch.push(samplesUrl + 'pedalD2.ogg');
    urlsToFetch.push(samplesUrl + 'pedalU1.ogg');
    urlsToFetch.push(samplesUrl + 'pedalU2.ogg');
  }

  if (includeRelease) {
    for (const midi of notesToLoad) {
      urlsToFetch.push(samplesUrl + getReleasesUrlToneFree(midi));
    }
  }

  const cache = await caches.open(PIANO_CACHE_NAME);

  await Promise.allSettled(urlsToFetch.map(async url => {
    const existing = await cache.match(url);
    if (existing) {
      return; 
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch {
      // individual fetch failures are non-fatal
    }
  }));
}
