/// <reference types="node" />

import { beforeEach, afterEach, vi } from "vitest";
import { format } from "util";

// capture originals once
const origError: typeof console.error = console.error.bind(console);
const origWarn: typeof console.warn = console.warn.bind(console);
const nodeFormat: (fmt: string, ...params: unknown[]) => string = format;

function shouldThrow(args: unknown[]) {
  const msg = args.map((a) => String(a)).join(" ");
  return /Invalid DOM property|React does not recognize the prop|Failed prop type|Warning: /.test(
    msg,
  );
}

function asFormattedMessage(args: unknown[]): string {
  // If first arg is a format string, use util.format to interpolate %s/%d/etc.
  if (typeof args[0] === "string") {
    try {
      return nodeFormat(args[0], ...args.slice(1));
    } catch {
      // fall back to a simple join if formatting fails
    }
  }
  return args.map((a) => String(a)).join(" ");
}

// Vitest's `restoreMocks: true` restores spies between tests.
// Reinstall our spies *before each test* so they're active when renders happen.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (shouldThrow(args)) {
      throw new Error(`React console.error: ${asFormattedMessage(args)}`);
    }
    origError(...args);
  });

  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    if (shouldThrow(args)) {
      throw new Error(`React console.warn: ${asFormattedMessage(args)}`);
    }
    origWarn(...args);
  });
});

// Let Vitest restore mocks; we don't need to manually unhook.
afterEach(() => {
  // no-op; `restoreMocks: true` will restore the spies
});
