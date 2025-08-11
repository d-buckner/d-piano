/**
 * Sample preloader that fetches piano audio files without importing Tone.js
 * Uses existing Salamander.ts utilities to avoid duplication
 */

import { allNotes, getNotesInRange, velocitiesMap } from './piano/Salamander';
import { midiToNoteString } from './midiUtils';


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
 * Preload piano samples by fetching them (relies on service worker for caching)
 */
export async function preloadSamples(
  velocities: number,
  options: PreloadOptions = {}
): Promise<void> {
  const {
    baseUrl = 'https://tambien.github.io/Piano/audio/',
    minNote = 21,
    maxNote = 108,
    includeHarmonics = false,
    includePedal = false,
    includeRelease = false,
  } = options;

  // Ensure baseUrl ends with /
  const samplesUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  // Get velocity levels to fetch
  const velocityLevels = velocitiesMap[velocities] || [8];
  
  // Get notes in range that have samples
  const notesToLoad = getNotesInRange(minNote, maxNote);
  
  // Build list of URLs to preload
  const urlsToFetch: string[] = [];

  // Add note samples for each velocity
  for (const midi of notesToLoad) {
    for (const vel of velocityLevels) {
      urlsToFetch.push(samplesUrl + getNotesUrlToneFree(midi, vel));
    }
  }

  // Add harmonics if requested
  if (includeHarmonics) {
    // Harmonics range is limited - reuse existing logic
    const harmonicsNotes = allNotes.filter(note => note >= 21 && note <= 87);
    for (const midi of harmonicsNotes) {
      urlsToFetch.push(samplesUrl + getHarmonicsUrlToneFree(midi));
    }
  }

  // Add pedal samples if requested
  if (includePedal) {
    urlsToFetch.push(samplesUrl + 'pedalD1.ogg');
    urlsToFetch.push(samplesUrl + 'pedalD2.ogg');
    urlsToFetch.push(samplesUrl + 'pedalU1.ogg');
    urlsToFetch.push(samplesUrl + 'pedalU2.ogg');
  }

  // Add release samples if requested
  if (includeRelease) {
    for (const midi of notesToLoad) {
      urlsToFetch.push(samplesUrl + getReleasesUrlToneFree(midi));
    }
  }

  // Fetch all URLs (service worker will cache them)
  const fetchPromises = urlsToFetch.map(url => 
    window.fetch(url).catch((e) => {
      console.error(e);
    })
  );

  await Promise.allSettled(fetchPromises);
}
