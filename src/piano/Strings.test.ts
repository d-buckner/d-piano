import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PianoStrings } from './Strings';
import { PianoString } from './String';


vi.mock('./String');

vi.mock('./Salamander', () => ({
  velocitiesMap: {
    1: [8],
    4: [4, 8, 12, 16],
    8: [1, 3, 5, 7, 9, 11, 13, 16],
  },
  getNotesInRange: (_min: number, _max: number) => [60, 64, 67],
  getNotesUrl: (midi: number, vel: number) => `${midi}v${vel}.ogg`,
}));

vi.mock('tone', () => {
  class MockToneAudioNode {
    context = {};

    static getDefaults() {
      return {}; 
    }

    connect() {
      return this; 
    }

    dispose() {}
  }
  return {
    ToneAudioNode: MockToneAudioNode,
    Volume: class MockVolume {
      volume = { value: 0 };

      connect() {
        return this; 
      }

      dispose() {}
    },
    Midi: (note: number) => ({ toNote: () => `note_${note}` }),
  };
});

type MockPianoString = {
  velocity: number;
  load: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  triggerAttack: ReturnType<typeof vi.fn>;
  triggerRelease: ReturnType<typeof vi.fn>;
};

function makeStrings(velocities: number, enabled = true): PianoStrings {
  return new PianoStrings({
    velocities,
    minNote: 60,
    maxNote: 72,
    enabled,
    samples: '/samples/',
    volume: 0,
    context: {} as any,
  });
}

describe('PianoStrings', () => {
  let stringInstances: MockPianoString[];

  beforeEach(() => {
    vi.clearAllMocks();
    stringInstances = [];

    vi.mocked(PianoString).mockImplementation((options) => {
      const instance: MockPianoString = {
        velocity: options.velocity,
        load: vi.fn().mockResolvedValue(undefined),
        connect: vi.fn(),
        triggerAttack: vi.fn(),
        triggerRelease: vi.fn(),
      };
      stringInstances.push(instance);
      return instance as unknown as PianoString;
    });
  });

  describe('expandTo', () => {
    it('is a no-op when already at the target velocity count', async () => {
      const strings = makeStrings(8);
      const countBefore = stringInstances.length;

      await strings.expandTo(8);

      expect(stringInstances).toHaveLength(countBefore);
    });

    it('loads only the velocity levels not already present', async () => {
      const strings = makeStrings(1); // loads velocity level [8]
      const countBefore = stringInstances.length;

      await strings.expandTo(8); // target: [1,3,5,7,9,11,13,16] — all new

      expect(stringInstances).toHaveLength(countBefore + 8);
    });

    it('skips velocity levels already loaded on partial expansion', async () => {
      const strings = makeStrings(1); // loads [8]
      const countBefore = stringInstances.length;

      await strings.expandTo(4); // target: [4,8,12,16] — 8 already loaded, so 3 new

      expect(stringInstances).toHaveLength(countBefore + 3);
    });

    it('calls load on each new string', async () => {
      const strings = makeStrings(1);
      const countBefore = stringInstances.length;

      await strings.expandTo(8);

      const newStrings = stringInstances.slice(countBefore);
      newStrings.forEach(s => expect(s.load).toHaveBeenCalled());
    });

    it('connects each new string to the output', async () => {
      const strings = makeStrings(1);
      const countBefore = stringInstances.length;

      await strings.expandTo(8);

      const newStrings = stringInstances.slice(countBefore);
      newStrings.forEach(s => expect(s.connect).toHaveBeenCalled());
    });

    it('returns early when disabled', async () => {
      const strings = makeStrings(1, false);
      const countBefore = stringInstances.length;

      await strings.expandTo(8);

      expect(stringInstances).toHaveLength(countBefore);
    });

    it('returns early for an unknown target velocity count', async () => {
      const strings = makeStrings(1);
      const countBefore = stringInstances.length;

      await strings.expandTo(99);

      expect(stringInstances).toHaveLength(countBefore);
    });
  });
});
