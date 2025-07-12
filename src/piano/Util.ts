import { Frequency } from 'tone';


export function noteToMidi(note: string): number {
  return Frequency(note).toMidi();
}

export function midiToNote(midi: number): string {
  const frequency = Frequency(midi, 'midi');
  const ret = frequency.toNote();
  return ret;
}

export function randomBetween(low: number, high: number): number {
  return Math.random() * (high - low) + low;
}
