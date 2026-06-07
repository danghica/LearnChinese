let refCount = 0;
let sentinel: WakeLockSentinel | null = null;
let visibilityListenerAttached = false;

async function requestWakeLock(): Promise<void> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible" && refCount > 0 && !sentinel) {
    void requestWakeLock();
  }
}

function attachVisibilityListener(): void {
  if (visibilityListenerAttached || typeof document === "undefined") return;
  document.addEventListener("visibilitychange", onVisibilityChange);
  visibilityListenerAttached = true;
}

export function acquireWakeLock(): void {
  refCount++;
  if (refCount === 1) {
    attachVisibilityListener();
    void requestWakeLock();
  }
}

export function releaseWakeLock(): void {
  if (refCount <= 0) return;
  refCount--;
  if (refCount === 0 && sentinel) {
    void sentinel.release().catch(() => {});
    sentinel = null;
  }
}
