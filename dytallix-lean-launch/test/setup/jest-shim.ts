import { vi } from 'vitest';

// Basic Jest shim for legacy tests that use jest globals
// This allows existing jest-based tests to work with Vitest
// @ts-ignore
globalThis.jest = {
  ...vi,
  fn: vi.fn,
  spyOn: vi.spyOn,
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  setSystemTime: vi.setSystemTime,
  mocked: vi.mocked,
  mock: vi.mock,
  unmock: vi.unmock,
  doMock: vi.doMock,
  dontMock: vi.dontMock,
  clearAllTimers: vi.clearAllTimers,
  runAllTimers: vi.runAllTimers,
  runOnlyPendingTimers: vi.runOnlyPendingTimers,
  advanceTimersToNextTimer: vi.advanceTimersToNextTimer,
};
