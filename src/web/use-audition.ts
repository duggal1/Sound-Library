import { useCallback, useEffect, useRef, useState } from "react";
import type { SoundSummary } from "../core/types";
import { loadSound, peekSound } from "./api";
import type { AudioEngine } from "./audio";

export function useAudition(engine: AudioEngine) {
  const version = useRef(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = engine.subscribe(setPlayingId);
    return () => {
      version.current++;
      unsubscribe();
      engine.stop();
    };
  }, [engine]);

  const stop = useCallback(() => {
    version.current++;
    engine.stop();
    setPendingId(null);
  }, [engine]);

  const play = useCallback((sound: SoundSummary, fraction = 0) => {
    const request = ++version.current;
    const isCurrent = () => request === version.current;
    const failed = () => {
      if (!isCurrent()) return;
      setPendingId(null);
      setError("Playback failed. Try again.");
    };
    const begin = (decoded: Awaited<ReturnType<typeof loadSound>>) => {
      if (!isCurrent()) return;
      void engine.play(decoded, isCurrent, fraction).then(() => {
        if (isCurrent()) setPendingId(null);
      }).catch(failed);
    };

    engine.stop();
    setPendingId(sound.id);
    setError("");
    try {
      engine.unlock();
      const cached = peekSound(sound);
      if (cached) begin(cached);
      else void loadSound(sound).then(begin, failed);
    } catch { failed(); }
  }, [engine]);

  return {playingId, pendingId, error, play, stop};
}
