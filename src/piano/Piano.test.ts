import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Piano } from './Piano';
import { PianoSampler } from './PianoSampler';


vi.mock('./PianoSampler');

vi.mock('./Salamander', () => ({
  velocitiesMap: {
    1: [8],
    8: [1, 3, 5, 7, 9, 11, 13, 16],
    16: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  },
  getNotesUrl: (_midi: number, vel: number) => `probe_v${vel}.ogg`,
}));

vi.mock('tone', () => {
  class MockToneAudioNode {
    context = {};

    static getDefaults() {
      return {}; 
    }

    connect(_destination?: unknown) {
      return this; 
    }

    toDestination() {
      return this; 
    }

    dispose() {}
  }
  return {
    ToneAudioNode: MockToneAudioNode,
    Gain: class MockGain {
      connect(_destination?: unknown) {
        return this; 
      }

      dispose() {}
    },
    isString: (x: unknown) => typeof x === 'string',
    Midi: (note: string) => ({ toMidi: () => parseInt(note, 10) }),
    optionsFromArguments: (defaults: Record<string, unknown>, args: IArguments) =>
      Object.assign({}, defaults, args?.[0]),
  };
});

type MockPianoSampler = {
  load: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  keyDown: ReturnType<typeof vi.fn>;
  keyUp: ReturnType<typeof vi.fn>;
  pedalDown: ReturnType<typeof vi.fn>;
  pedalUp: ReturnType<typeof vi.fn>;
  stopAll: ReturnType<typeof vi.fn>;
  expandTo: ReturnType<typeof vi.fn>;
};

function createMockSampler(): MockPianoSampler {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    keyDown: vi.fn(),
    keyUp: vi.fn(),
    pedalDown: vi.fn(),
    pedalUp: vi.fn(),
    stopAll: vi.fn(),
    expandTo: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Piano', () => {
  let piano: Piano;
  let samplerInstances: MockPianoSampler[];

  beforeEach(() => {
    vi.clearAllMocks();
    samplerInstances = [];

    vi.stubGlobal('caches', {
      match: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(PianoSampler).mockImplementation(() => {
      const sampler = createMockSampler();
      samplerInstances.push(sampler);
      return sampler as unknown as PianoSampler;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('initial load', () => {
    it('loads and connects a single sampler on load()', async () => {
      piano = new Piano({ url: '/samples/' });
      await piano.load();

      expect(PianoSampler).toHaveBeenCalledTimes(1);
      expect(PianoSampler).toHaveBeenCalledWith(
        expect.objectContaining({ velocities: 1, url: '/samples/' })
      );
      expect(samplerInstances[0].load).toHaveBeenCalled();
      expect(samplerInstances[0].connect).toHaveBeenCalled();
      expect(piano.loaded).toBe(true);
    });

    it('is not loaded before load() is called', () => {
      piano = new Piano({ url: '/samples/' });
      expect(piano.loaded).toBe(false);
    });

    it('does not call expandTo when velocities is 1', async () => {
      piano = new Piano({ url: '/samples/', velocities: 1 });
      await piano.load();

      expect(samplerInstances[0].expandTo).not.toHaveBeenCalled();
    });
  });

  describe('background expansion', () => {
    it('calls expandTo progressively from 2 up to target velocity', async () => {
      piano = new Piano({ url: '/samples/', velocities: 8 });
      await piano.load();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(samplerInstances[0].expandTo).toHaveBeenCalledTimes(7);
      expect(samplerInstances[0].expandTo).toHaveBeenNthCalledWith(1, 2);
      expect(samplerInstances[0].expandTo).toHaveBeenLastCalledWith(8);
    });

    it('only creates one PianoSampler for the whole lifetime', async () => {
      piano = new Piano({ url: '/samples/', velocities: 8 });
      await piano.load();

      expect(samplerInstances).toHaveLength(1);
    });

    it('calls onPlayable once when the piano first becomes ready', async () => {
      const onPlayable = vi.fn();
      piano = new Piano({ url: '/samples/', velocities: 8, onPlayable });
      await piano.load();

      expect(onPlayable).toHaveBeenCalledTimes(1);
    });

    it('calls onLoadProgress after initial load and after each expansion step', async () => {
      const onLoadProgress = vi.fn();
      piano = new Piano({ url: '/samples/', velocities: 8, onLoadProgress });
      await piano.load();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onLoadProgress).toHaveBeenCalledTimes(8);
      expect(onLoadProgress).toHaveBeenNthCalledWith(1, 1 / 8);
      expect(onLoadProgress).toHaveBeenLastCalledWith(1);
    });

    it('calls onLoadProgress with 1.0 immediately when velocities is 1', async () => {
      const onLoadProgress = vi.fn();
      piano = new Piano({ url: '/samples/', velocities: 1, onLoadProgress });
      await piano.load();

      expect(onLoadProgress).toHaveBeenCalledTimes(1);
      expect(onLoadProgress).toHaveBeenCalledWith(1);
    });
  });

  describe('cache detection', () => {
    function setupCacheMock(hitUrl?: string) {
      const mockCaches = {
        match: vi.fn().mockImplementation((url: string) => {
          if (hitUrl && url.includes(hitUrl)) {
            return Promise.resolve(new Response());
          }
          return Promise.resolve(undefined);
        }),
      };
      vi.stubGlobal('caches', mockCaches);
      return mockCaches;
    }

    it('starts at the target velocity when samples are cached', async () => {
      setupCacheMock('probe_v1.ogg');
      piano = new Piano({ url: '/samples/', velocities: 8 });
      await piano.load();

      expect(PianoSampler).toHaveBeenCalledWith(
        expect.objectContaining({ velocities: 8 })
      );
    });

    it('does not call expandTo when starting from cache at target velocity', async () => {
      setupCacheMock('probe_v1.ogg');
      piano = new Piano({ url: '/samples/', velocities: 8 });
      await piano.load();

      expect(samplerInstances[0].expandTo).not.toHaveBeenCalled();
    });

    it('starts at velocities=1 on cache miss', async () => {
      setupCacheMock(undefined);
      piano = new Piano({ url: '/samples/', velocities: 8 });
      await piano.load();

      expect(PianoSampler).toHaveBeenCalledWith(
        expect.objectContaining({ velocities: 1 })
      );
    });

  });

  describe('delegation to current sampler', () => {
    beforeEach(async () => {
      piano = new Piano({ url: '/samples/' });
      await piano.load();
    });

    it('delegates keyDown to sampler', () => {
      const event = { note: '60', velocity: 0.8 };
      piano.keyDown(event);
      expect(samplerInstances[0].keyDown).toHaveBeenCalledWith(event);
    });

    it('delegates keyUp to sampler', () => {
      const event = { note: '60' };
      piano.keyUp(event);
      expect(samplerInstances[0].keyUp).toHaveBeenCalledWith(event);
    });

    it('delegates pedalDown to sampler', () => {
      const event = { time: 0 };
      piano.pedalDown(event);
      expect(samplerInstances[0].pedalDown).toHaveBeenCalledWith(event);
    });

    it('delegates pedalUp to sampler', () => {
      const event = { time: 0 };
      piano.pedalUp(event);
      expect(samplerInstances[0].pedalUp).toHaveBeenCalledWith(event);
    });

    it('delegates stopAll to sampler', () => {
      piano.stopAll();
      expect(samplerInstances[0].stopAll).toHaveBeenCalled();
    });
  });
});
