/**
 * Tone.js-free MIDI to note conversion for preloading samples
 * Reuses existing note data from Salamander.ts to avoid duplication
 */

/**
 * Convert MIDI note number to note string without using Tone.js
 * This reimplements the core MIDI-to-note conversion logic without dependencies
 */
export function midiToNoteString(midi: number): string {
  const octave = Math.floor((midi - 12) / 12);
  const noteIndex = (midi - 12) % 12;
  
  const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
  const noteName = noteNames[noteIndex];
  
  return `${noteName}${octave}`;
}
