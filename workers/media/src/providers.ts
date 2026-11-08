import type { Timing } from '../../../packages/shared/src/index';
export interface NarrationProvider {
  generate(input: { text: string; language: string; voice: string }): Promise<{
    audio: Uint8Array;
    mime: string;
    durationMs: number;
    timings?: Timing[];
  }>;
}
export interface AlignmentProvider {
  align(input: {
    text: string;
    language: string;
    audio: Uint8Array;
  }): Promise<Timing[]>;
}
// Providers must run in authenticated background jobs. No external provider is enabled by default.
