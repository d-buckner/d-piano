import { describe, it, expect, vi } from 'vitest';
import { 
  getReleasesUrl, 
  getHarmonicsUrl, 
  getNotesUrl,
  velocitiesMap,
  allNotes,
  getNotesInRange,
  getHarmonicsInRange,
  inHarmonicsRange
} from './Salamander';

// Mock the Util module since it depends on Tone.js
vi.mock('./Util', () => ({
  midiToNote: (midi: number) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor((midi - 12) / 12);
    const noteIndex = (midi - 12) % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }
}));

describe('Salamander URL generation', () => {
  describe('getReleasesUrl', () => {
    it('generates correct release URLs for standard piano range', () => {
      expect(getReleasesUrl(21)).toBe('rel1.ogg');
      expect(getReleasesUrl(60)).toBe('rel40.ogg');
      expect(getReleasesUrl(108)).toBe('rel88.ogg');
    });

    it('uses midi - 20 formula consistently', () => {
      expect(getReleasesUrl(21)).toBe('rel1.ogg');
      expect(getReleasesUrl(50)).toBe('rel30.ogg');
      expect(getReleasesUrl(100)).toBe('rel80.ogg');
    });
  });

  describe('getHarmonicsUrl', () => {
    it('generates correct harmonic URLs with harmS prefix', () => {
      expect(getHarmonicsUrl(60)).toBe('harmSC4.ogg');
      expect(getHarmonicsUrl(69)).toBe('harmSA4.ogg');
    });

    it('converts sharp notes to s suffix', () => {
      expect(getHarmonicsUrl(61)).toBe('harmSCs4.ogg');
      expect(getHarmonicsUrl(66)).toBe('harmSFs4.ogg');
    });
  });

  describe('getNotesUrl', () => {
    it('generates correct note URLs with velocity', () => {
      expect(getNotesUrl(60, 8)).toBe('C4v8.ogg');
      expect(getNotesUrl(69, 12)).toBe('A4v12.ogg');
    });

    it('converts sharp notes correctly', () => {
      expect(getNotesUrl(61, 8)).toBe('Cs4v8.ogg');
      expect(getNotesUrl(66, 12)).toBe('Fs4v12.ogg');
    });
  });
});

describe('velocitiesMap configuration', () => {
  it('contains mappings for velocity depths 1-16', () => {
    for (let depth = 1; depth <= 16; depth++) {
      expect(velocitiesMap).toHaveProperty(depth.toString());
      expect(Array.isArray(velocitiesMap[depth])).toBe(true);
    }
  });

  it('has increasing number of velocities as depth increases', () => {
    expect(velocitiesMap[1]).toHaveLength(1);
    expect(velocitiesMap[8]).toHaveLength(8);
    expect(velocitiesMap[16]).toHaveLength(16);
  });

  it('all velocity values are within valid range', () => {
    Object.values(velocitiesMap).forEach(velocities => {
      velocities.forEach(vel => {
        expect(vel).toBeGreaterThanOrEqual(1);
        expect(vel).toBeLessThanOrEqual(16);
      });
    });
  });
});

describe('allNotes configuration', () => {
  it('contains 30 piano sample notes', () => {
    expect(allNotes).toHaveLength(30);
  });

  it('covers piano range from A0 to C8', () => {
    expect(allNotes[0]).toBe(21);
    expect(allNotes[allNotes.length - 1]).toBe(108);
  });

  it('is sorted in ascending order', () => {
    const sorted = [...allNotes].sort((a, b) => a - b);
    expect(allNotes).toEqual(sorted);
  });
});

describe('getNotesInRange', () => {
  it('returns all notes when range covers full piano', () => {
    const result = getNotesInRange(0, 127);
    expect(result).toEqual(allNotes);
  });

  it('filters notes correctly for partial ranges', () => {
    const result = getNotesInRange(60, 72);
    const expected = allNotes.filter(note => note >= 60 && note <= 72);
    expect(result).toEqual(expected);
  });

  it('returns empty array when no notes in range', () => {
    const result = getNotesInRange(200, 250);
    expect(result).toEqual([]);
  });
});

describe('getHarmonicsInRange', () => {
  it('returns notes within harmonics range limits', () => {
    const result = getHarmonicsInRange(21, 87);
    expect(result.length).toBeGreaterThan(0);
    
    result.forEach(note => {
      expect(note).toBeGreaterThanOrEqual(21);
      expect(note).toBeLessThanOrEqual(87);
    });
  });

  it('returns empty array for range outside harmonics', () => {
    const result = getHarmonicsInRange(90, 100);
    expect(result).toEqual([]);
  });
});

describe('inHarmonicsRange', () => {
  it('returns true for notes within harmonics range', () => {
    expect(inHarmonicsRange(21)).toBe(true);
    expect(inHarmonicsRange(60)).toBe(true);
    expect(inHarmonicsRange(87)).toBe(true);
  });

  it('returns false for notes outside harmonics range', () => {
    expect(inHarmonicsRange(20)).toBe(false);
    expect(inHarmonicsRange(88)).toBe(false);
    expect(inHarmonicsRange(108)).toBe(false);
  });
});