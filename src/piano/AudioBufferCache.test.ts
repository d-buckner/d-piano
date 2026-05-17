import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import AudioBufferCache from './AudioBufferCache';


// ─── Hoisted mocks (available before modules load) ────────────────────────────

const mocks = vi.hoisted(() => ({
  decodeAudioData: vi.fn(),
  createBuffer: vi.fn(),
}));

vi.mock('tone', () => {
  class MockToneAudioBuffer {
    private _raw: unknown;

    constructor(raw: unknown) {
      this._raw = raw;
    }

    get() {
      return this._raw;
    }
  }

  return {
    ToneAudioBuffer: MockToneAudioBuffer,
    ToneAudioBuffers: class {
      add() {}
    },
    getContext: () => ({
      rawContext: {
        decodeAudioData: mocks.decodeAudioData,
        createBuffer: mocks.createBuffer,
      },
    }),
  };
});

// ─── Helpers: AudioBuffer ─────────────────────────────────────────────────────

function makeMockAudioBuffer(channels = 1, length = 16, sampleRate = 44100) {
  const data = Array.from({ length: channels }, () => new Float32Array(length).fill(0.5));
  return {
    numberOfChannels: channels,
    length,
    sampleRate,
    getChannelData: (i: number) => data[i],
    copyToChannel: vi.fn(),
  };
}

function makeStoredPcm(audioBuffer: ReturnType<typeof makeMockAudioBuffer>) {
  return {
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    channels: Array.from(
      { length: audioBuffer.numberOfChannels },
      (_, i) => audioBuffer.getChannelData(i).slice()
    ),
  };
}

// ─── Helpers: IDB mock ────────────────────────────────────────────────────────

type StoredPcm = ReturnType<typeof makeStoredPcm>;

function makeGetReq(result: StoredPcm | undefined) {
  const req = { result } as Partial<IDBRequest<StoredPcm | undefined>>;
  Object.defineProperty(req, 'onsuccess', {
    set(fn: () => void) {
      Promise.resolve().then(() => fn()); 
    },
    configurable: true,
  });
  Object.defineProperty(req, 'onerror', {
    set(_fn: () => void) {},
    configurable: true,
  });
  return req as IDBRequest<StoredPcm | undefined>;
}

function makeOpenReq(db: unknown, triggerSuccess = true) {
  const req = { result: db } as Record<string, unknown>;
  Object.defineProperty(req, 'onupgradeneeded', {
    set(_fn: () => void) {},
    configurable: true,
  });
  Object.defineProperty(req, 'onsuccess', {
    set(fn: () => void) {
      if (triggerSuccess) {
        Promise.resolve().then(() => fn());
      }
    },
    configurable: true,
  });
  Object.defineProperty(req, 'onerror', {
    set(fn: () => void) {
      if (!triggerSuccess) {
        Promise.resolve().then(() => fn());
      }
    },
    configurable: true,
  });
  return req;
}

function createIdbMock(seed: Map<string, StoredPcm> = new Map()) {
  const store = new Map(seed);
  let pendingOncomplete: (() => void) | null = null;

  const objectStore = {
    get: vi.fn((key: string) => makeGetReq(store.get(key))),
    put: vi.fn((value: StoredPcm, key: string) => {
      store.set(key, value);
      Promise.resolve().then(() => pendingOncomplete?.());
    }),
  };

  const tx = {
    objectStore: vi.fn(() => objectStore),
    get oncomplete() {
      return pendingOncomplete; 
    },
    set oncomplete(fn: (() => void) | null) {
      pendingOncomplete = fn; 
    },
    onerror: null,
  };

  const db = {
    transaction: vi.fn(() => tx),
    createObjectStore: vi.fn(),
  };

  const idb = {
    open: vi.fn(() => makeOpenReq(db, true)),
  };

  return { idb: idb as unknown as IDBFactory, store, objectStore, db };
}

function createErrorIdbMock() {
  const idb = {
    open: vi.fn(() => makeOpenReq(null, false)),
  };
  return idb as unknown as IDBFactory;
}

// ─── Helpers: Response mock ───────────────────────────────────────────────────

function createMockResponse(): Response {
  const buf = new ArrayBuffer(8);
  const resp = {
    ok: true,
    status: 200,
    arrayBuffer: vi.fn().mockResolvedValue(buf),
    clone: vi.fn(),
  } as unknown as Response;
  (resp.clone as ReturnType<typeof vi.fn>).mockReturnValue(resp);
  return resp;
}

// ─── Helpers: static state ────────────────────────────────────────────────────

function resetCacheState() {
  const cache = AudioBufferCache as unknown as Record<string, unknown>;
  cache.buffers = {};
  cache.loading = {};
  cache._db = null;
}

async function flushMicrotasks() {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AudioBufferCache', () => {
  let mockAudioBuffer: ReturnType<typeof makeMockAudioBuffer>;
  let urlCounter = 0;

  function nextUrl() {
    urlCounter += 1;
    return `test://sample-${urlCounter}.ogg`;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetCacheState();

    mockAudioBuffer = makeMockAudioBuffer();
    mocks.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    mocks.createBuffer.mockReturnValue(makeMockAudioBuffer());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('IDB hit', () => {
    it('returns reconstructed buffer without calling decodeAudioData or caches.match', async () => {
      const url = nextUrl();
      const { idb } = createIdbMock(new Map([[url, makeStoredPcm(mockAudioBuffer)]]));
      const matchSpy = vi.fn();

      vi.stubGlobal('indexedDB', idb);
      vi.stubGlobal('caches', { match: matchSpy });

      const result = await AudioBufferCache.getBuffer(url);

      expect(result).toBeTruthy();
      expect(mocks.decodeAudioData).not.toHaveBeenCalled();
      expect(matchSpy).not.toHaveBeenCalled();
    });

    it('calls createBuffer with the stored dimensions to reconstruct the AudioBuffer', async () => {
      const url = nextUrl();
      const stored = makeStoredPcm(mockAudioBuffer);
      const { idb } = createIdbMock(new Map([[url, stored]]));

      vi.stubGlobal('indexedDB', idb);
      vi.stubGlobal('caches', { match: vi.fn() });

      await AudioBufferCache.getBuffer(url);

      expect(mocks.createBuffer).toHaveBeenCalledWith(
        stored.numberOfChannels,
        stored.length,
        stored.sampleRate
      );
    });
  });

  describe('IDB miss, Cache API hit', () => {
    it('decodes the cached response', async () => {
      const url = nextUrl();
      const { idb } = createIdbMock();

      vi.stubGlobal('indexedDB', idb);
      vi.stubGlobal('caches', {
        match: vi.fn().mockResolvedValue(createMockResponse()),
        open: vi.fn().mockResolvedValue({ put: vi.fn() }),
      });

      await AudioBufferCache.getBuffer(url);

      expect(mocks.decodeAudioData).toHaveBeenCalledTimes(1);
    });

    it('saves the decoded buffer to IDB (fire-and-forget)', async () => {
      const url = nextUrl();
      const { idb, objectStore } = createIdbMock();

      vi.stubGlobal('indexedDB', idb);
      vi.stubGlobal('caches', {
        match: vi.fn().mockResolvedValue(createMockResponse()),
        open: vi.fn().mockResolvedValue({ put: vi.fn() }),
      });

      await AudioBufferCache.getBuffer(url);
      await flushMicrotasks();

      expect(objectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({ sampleRate: mockAudioBuffer.sampleRate }),
        url
      );
    });
  });

  describe('IDB miss, Cache API miss', () => {
    it('fetches from network, decodes, and saves to both Cache API and IDB', async () => {
      const url = nextUrl();
      const { idb, objectStore } = createIdbMock();
      const cachePut = vi.fn().mockResolvedValue(undefined);

      vi.stubGlobal('indexedDB', idb);
      vi.stubGlobal('caches', {
        match: vi.fn().mockResolvedValue(undefined),
        open: vi.fn().mockResolvedValue({ put: cachePut }),
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse()));

      await AudioBufferCache.getBuffer(url);
      await flushMicrotasks();

      expect(fetch).toHaveBeenCalledWith(url);
      expect(mocks.decodeAudioData).toHaveBeenCalledTimes(1);
      expect(cachePut).toHaveBeenCalled();
      expect(objectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({ sampleRate: mockAudioBuffer.sampleRate }),
        url
      );
    });

    it('rejects when the network response is not ok', async () => {
      const url = nextUrl();
      const { idb } = createIdbMock();

      vi.stubGlobal('indexedDB', idb);
      vi.stubGlobal('caches', {
        match: vi.fn().mockResolvedValue(undefined),
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

      await expect(AudioBufferCache.getBuffer(url)).rejects.toThrow('404');
    });
  });

  describe('IDB unavailable', () => {
    it('falls through to the Cache API when indexedDB is undefined', async () => {
      const url = nextUrl();

      vi.stubGlobal('indexedDB', undefined);
      vi.stubGlobal('caches', {
        match: vi.fn().mockResolvedValue(createMockResponse()),
        open: vi.fn().mockResolvedValue({ put: vi.fn() }),
      });

      const result = await AudioBufferCache.getBuffer(url);

      expect(result).toBeTruthy();
      expect(mocks.decodeAudioData).toHaveBeenCalledTimes(1);
    });
  });

  describe('IDB error', () => {
    it('silently falls through to Cache API when IDB open fails', async () => {
      const url = nextUrl();

      vi.stubGlobal('indexedDB', createErrorIdbMock());
      vi.stubGlobal('caches', {
        match: vi.fn().mockResolvedValue(createMockResponse()),
        open: vi.fn().mockResolvedValue({ put: vi.fn() }),
      });

      const result = await AudioBufferCache.getBuffer(url);

      expect(result).toBeTruthy();
      expect(mocks.decodeAudioData).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent requests', () => {
    it('deduplicates concurrent requests for the same URL', async () => {
      const url = nextUrl();
      const { idb } = createIdbMock();

      vi.stubGlobal('indexedDB', idb);
      vi.stubGlobal('caches', {
        match: vi.fn().mockResolvedValue(undefined),
        open: vi.fn().mockResolvedValue({ put: vi.fn() }),
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse()));

      const [buf1, buf2] = await Promise.all([
        AudioBufferCache.getBuffer(url),
        AudioBufferCache.getBuffer(url),
      ]);

      expect(buf1).toBe(buf2);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(mocks.decodeAudioData).toHaveBeenCalledTimes(1);
    });
  });
});
