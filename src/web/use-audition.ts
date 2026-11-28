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

  const play = useCallback(async (sound: SoundSummary, fraction = 0): Promise<boolean> => {
    const request = ++version.current;
    const isCurrent = () => request === version.current;
    engine.stop();setPendingId(sound.id);setError("");
    try {
      engine.unlock();
      const decoded=peekSound(sound)??await loadSound(sound);
      if(!isCurrent())return false;
      await engine.play(decoded,isCurrent,fraction);
      if(!isCurrent())return false;
      setPendingId(null);return true;
    }catch{
      if(isCurrent()){setPendingId(null);setError("Playback failed. Try again.");}
      return false;
    }
  }, [engine]);

  return {playingId, pendingId, error, play, stop};
}
