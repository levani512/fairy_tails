import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';
import type { Manifest } from '../../../packages/shared/src/index';

export function Music({
  config,
  paused,
  duck,
  fadingOut = false,
}: {
  config: Manifest['music'];
  paused: boolean;
  duck: boolean;
  fadingOut?: boolean;
}) {
  const player = useAudioPlayer(config?.asset.url ?? null);
  const initialized = useRef(false);
  useEffect(() => {
    if (!config) return;
    if (!initialized.current) {
      player.volume = 0;
      initialized.current = true;
    }
    player.loop = config.loop;
    const from = player.volume;
    let elapsed = 0;
    const target = fadingOut
        ? 0
        : config.volume * (duck && config.duck ? 0.3 : 1),
      duration = Math.max(40, config.fadeMs);
    const timer = setInterval(() => {
      elapsed += 40;
      player.volume = from + (target - from) * Math.min(1, elapsed / duration);
      if (elapsed >= duration) clearInterval(timer);
    }, 40);
    if (paused) player.pause();
    else player.play();
    return () => clearInterval(timer);
  }, [player, paused, duck, config, fadingOut]);
  return null;
}
