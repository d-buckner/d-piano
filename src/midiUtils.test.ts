import { describe, it, expect } from 'vitest';
import { midiToNoteString } from './midiUtils';

describe('midiToNoteString', () => {
  describe('standard piano notes', () => {
    it('converts C4 (middle C, MIDI 60) correctly', () => {
      expect(midiToNoteString(60)).toBe('C4');
    });

    it('converts A4 (concert pitch, MIDI 69) correctly', () => {
      expect(midiToNoteString(69)).toBe('A4');
    });

    it('converts lowest piano note A0 (MIDI 21) correctly', () => {
      expect(midiToNoteString(21)).toBe('A0');
    });

    it('converts highest piano note C8 (MIDI 108) correctly', () => {
      expect(midiToNoteString(108)).toBe('C8');
    });
  });

  describe('chromatic scale in octave 4', () => {
    const expectedNotes = [
      { midi: 60, note: 'C4' },
      { midi: 61, note: 'Cs4' },
      { midi: 62, note: 'D4' },
      { midi: 63, note: 'Ds4' },
      { midi: 64, note: 'E4' },
      { midi: 65, note: 'F4' },
      { midi: 66, note: 'Fs4' },
      { midi: 67, note: 'G4' },
      { midi: 68, note: 'Gs4' },
      { midi: 69, note: 'A4' },
      { midi: 70, note: 'As4' },
      { midi: 71, note: 'B4' }
    ];

    expectedNotes.forEach(({ midi, note }) => {
      it(`converts MIDI ${midi} to ${note}`, () => {
        expect(midiToNoteString(midi)).toBe(note);
      });
    });
  });

  describe('octave boundaries', () => {
    it('converts MIDI 12 (C0) correctly', () => {
      expect(midiToNoteString(12)).toBe('C0');
    });

    it('converts MIDI 23 (B0) correctly', () => {
      expect(midiToNoteString(23)).toBe('B0');
    });

    it('converts MIDI 24 (C1) correctly', () => {
      expect(midiToNoteString(24)).toBe('C1');
    });

    it('converts MIDI 35 (B1) correctly', () => {
      expect(midiToNoteString(35)).toBe('B1');
    });

    it('converts MIDI 36 (C2) correctly', () => {
      expect(midiToNoteString(36)).toBe('C2');
    });
  });

  describe('extended MIDI range', () => {
    it('handles notes below piano range', () => {
      expect(midiToNoteString(12)).toBe('C0');  // Below A0
      expect(midiToNoteString(20)).toBe('Gs0'); // Just below A0
    });

    it('handles notes above piano range', () => {
      expect(midiToNoteString(109)).toBe('Cs8'); // Just above C8
      expect(midiToNoteString(127)).toBe('G9');  // MIDI max
    });
  });

  describe('sharp note handling', () => {
    it('uses "s" suffix for sharp notes (not "#")', () => {
      const sharpNotes = [
        { midi: 61, expected: 'Cs4' }, // C#
        { midi: 63, expected: 'Ds4' }, // D#
        { midi: 66, expected: 'Fs4' }, // F#
        { midi: 68, expected: 'Gs4' }, // G#
        { midi: 70, expected: 'As4' }  // A#
      ];

      sharpNotes.forEach(({ midi, expected }) => {
        const result = midiToNoteString(midi);
        expect(result).toBe(expected);
        expect(result).not.toContain('#');
      });
    });
  });

  describe('mathematical consistency', () => {
    it('maintains 12-note chromatic pattern across octaves', () => {
      // Test that notes 12 semitones apart have same note name but different octaves
      const baseMidi = 60; // C4
      const higherMidi = 72; // C5
      
      expect(midiToNoteString(baseMidi)).toBe('C4');
      expect(midiToNoteString(higherMidi)).toBe('C5');
    });

    it('correctly wraps note index within 0-11 range', () => {
      // All these should be C notes in different octaves
      const cNotes = [12, 24, 36, 48, 60, 72, 84, 96, 108];
      
      cNotes.forEach(midi => {
        const result = midiToNoteString(midi);
        expect(result).toMatch(/^C\d+$/);
      });
    });
  });

  describe('practical validation', () => {
    it('handles full 88-key piano range correctly', () => {
      expect(midiToNoteString(21)).toBe('A0');   // Lowest piano key
      expect(midiToNoteString(108)).toBe('C8');  // Highest piano key
    });

    it('produces consistent results for repeated calls', () => {
      const testMidi = 69; // A4
      const firstCall = midiToNoteString(testMidi);
      const secondCall = midiToNoteString(testMidi);
      
      expect(firstCall).toBe(secondCall);
      expect(firstCall).toBe('A4');
    });
  });
});