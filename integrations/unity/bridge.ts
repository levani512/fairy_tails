import { z } from 'zod';
export const inbound = z.discriminatedUnion('type', [
  z.object({
    version: z.literal(1),
    type: z.literal('OPEN_STORY'),
    storyId: z.string().min(1),
    language: z.enum(['en', 'es', 'ka']),
  }),
  z.object({ version: z.literal(1), type: z.literal('CLOSE_PLAYER') }),
]);
export type PlayerEvent = {
  version: 1;
  type:
    | 'PLAYER_READY'
    | 'STORY_STARTED'
    | 'STORY_COMPLETED'
    | 'RETURN_TO_UNITY'
    | 'ERROR'
    | 'SESSION_EXPIRED';
  storyId?: string;
  code?: string;
};
export interface UnitySubscriptionVerifier {
  exchange(proof: string): Promise<{
    subject: string;
    country: string;
    premium: boolean;
    expiresAt: Date;
  }>;
}
export function sendToUnity(event: PlayerEvent) {
  const host = globalThis as typeof globalThis & {
    ReactNativeWebView?: { postMessage: (s: string) => void };
    webkit?: {
      messageHandlers?: {
        fairytails?: { postMessage: (e: PlayerEvent) => void };
      };
    };
  };
  host.ReactNativeWebView?.postMessage(JSON.stringify(event));
  host.webkit?.messageHandlers?.fairytails?.postMessage(event);
}
