import { describe, it, expect, vi } from 'vitest';
import { randomBetween, noteToMidi, midiToNote } from './Util';

// Mock Tone.js Frequency since we want to test our functions, not Tone.js
vi.mock('tone', () => ({
  Frequency: vi.fn().mockImplementation((value, type) => {
    if (type === 'midi') {
      // Mock MIDI to note conversion
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor((value - 12) / 12);
      const noteIndex = (value - 12) % 12;
      return {
        toNote: () => `${noteNames[noteIndex]}${octave}`
      };
    } else {
      // Mock note to MIDI conversion - simplified implementation
      const noteMap: Record<string, number> = {
        'C4': 60,
        'A4': 69,
        'C#4': 61,
        'F#4': 66,
        'A0': 21,
        'C8': 108
      };
      return {
        toMidi: () => noteMap[value] || 60 // Default to middle C if not found
      };
    }
  })
}));

describe('randomBetween', () => {
  describe('basic functionality', () => {
    it('returns number between low and high values', () => {
      const low = 10;
      const high = 20;
      
      // Run multiple times to test randomness
      for (let i = 0; i < 100; i++) {
        const result = randomBetween(low, high);
        expect(result).toBeGreaterThanOrEqual(low);
        expect(result).toBeLessThan(high);
      }
    });

    it('works with decimal values', () => {
      const low = 1.5;
      const high = 2.5;
      
      for (let i = 0; i < 50; i++) {
        const result = randomBetween(low, high);
        expect(result).toBeGreaterThanOrEqual(low);
        expect(result).toBeLessThan(high);
      }
    });

    it('works with negative values', () => {
      const low = -10;
      const high = -5;
      
      for (let i = 0; i < 50; i++) {
        const result = randomBetween(low, high);
        expect(result).toBeGreaterThanOrEqual(low);
        expect(result).toBeLessThan(high);
      }
    });
  });

  describe('edge cases', () => {
    it('handles very small ranges', () => {
      const low = 100;
      const high = 100.001;
      
      const result = randomBetween(low, high);
      expect(result).toBeGreaterThanOrEqual(low);
      expect(result).toBeLessThan(high);
    });

    it('handles zero as boundary', () => {
      const result1 = randomBetween(-1, 1);
      expect(result1).toBeGreaterThanOrEqual(-1);
      expect(result1).toBeLessThan(1);

      const result2 = randomBetween(0, 5);
      expect(result2).toBeGreaterThanOrEqual(0);
      expect(result2).toBeLessThan(5);
    });

    it('returns low value when low equals high (degenerate case)', () => {
      const value = 42;
      const result = randomBetween(value, value);
      expect(result).toBe(value);
    });
  });

  describe('distribution properties', () => {
    it('produces different values on repeated calls', () => {
      const results = [];
      const low = 0;
      const high = 1000;
      
      for (let i = 0; i < 10; i++) {
        results.push(randomBetween(low, high));
      }
      
      // With a range of 1000, we should get different values
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    it('maintains mathematical relationship: result = low + Math.random() * (high - low)', () => {
      const low = 5;
      const high = 15;
      
      // Mock Math.random to test the exact formula
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.5);
      
      const result = randomBetween(low, high);
      const expected = low + 0.5 * (high - low);
      
      expect(result).toBe(expected);
      
      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('parameter validation behavior', () => {
    it('works correctly when low > high (swapped parameters)', () => {
      // The function doesn't validate input order, so this tests actual behavior
      const result = randomBetween(20, 10);
      
      // This will produce negative numbers since (high - low) is negative
      expect(result).toBeLessThanOrEqual(20);
    });

    it('handles large numbers correctly', () => {
      const low = 1e6;
      const high = 1e6 + 1000;
      
      const result = randomBetween(low, high);
      expect(result).toBeGreaterThanOrEqual(low);
      expect(result).toBeLessThan(high);
    });
  });
});

describe('noteToMidi', () => {
  it('converts standard note names to MIDI numbers', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
  });

  it('handles sharp notes', () => {
    expect(noteToMidi('C#4')).toBe(61);
    expect(noteToMidi('F#4')).toBe(66);
  });

  it('handles edge case notes', () => {
    expect(noteToMidi('A0')).toBe(21);
    expect(noteToMidi('C8')).toBe(108);
  });
});

describe('midiToNote', () => {
  it('converts MIDI numbers to standard note names', () => {
    expect(midiToNote(60)).toBe('C4');
    expect(midiToNote(69)).toBe('A4');
  });

  it('handles sharp notes in conversion', () => {
    expect(midiToNote(61)).toBe('C#4');
    expect(midiToNote(66)).toBe('F#4');
  });

  it('handles piano range boundaries', () => {
    expect(midiToNote(21)).toBe('A0');
    expect(midiToNote(108)).toBe('C8');
  });

  it('maintains consistency with noteToMidi for round-trip conversion', () => {
    const originalNotes = ['C4', 'A4', 'C#4', 'F#4'];
    
    originalNotes.forEach(note => {
      const midi = noteToMidi(note);
      const convertedBack = midiToNote(midi);
      expect(convertedBack).toBe(note);
    });
  });
});