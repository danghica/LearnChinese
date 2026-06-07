import { useEffect } from "react";
import { acquireWakeLock, releaseWakeLock } from "@/lib/wakeLock";

export function useWakeLockWhilePlaying(isPlaying: boolean): void {
  useEffect(() => {
    if (!isPlaying) return;
    acquireWakeLock();
    return () => releaseWakeLock();
  }, [isPlaying]);
}
