/**
 * Known Chinese voice names that are often higher quality (browser/OS dependent).
 * Prefer these when available so we don't pick a random default.
 */
const PREFERRED_ZH_VOICE_NAMES = [
  "tingting",
  "ting-ting",
  "huihui",
  "hui hui",
  "kangkang",
  "kang kang",
  "yao",
  "sin-ji",
  "mei-jia",
  "yafang",
  "xiaoxiao",
  "yunxi",
  "yunyang",
];

function pickBestChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const zh = voices.filter((v) => v.lang.startsWith("zh"));
  if (zh.length === 0) return null;
  const byLang = (lang: string) => zh.filter((v) => v.lang.toLowerCase() === lang);
  const preferred = (list: SpeechSynthesisVoice[]) =>
    list.find((v) =>
      PREFERRED_ZH_VOICE_NAMES.some((n) => v.name.toLowerCase().includes(n))
    );
  const first = (list: SpeechSynthesisVoice[]) => list[0] ?? null;
  return (
    preferred(byLang("zh-cn")) ??
    first(byLang("zh-cn")) ??
    preferred(byLang("zh-tw")) ??
    first(byLang("zh-tw")) ??
    preferred(zh) ??
    zh[0] ?? null
  );
}

/**
 * Returns the best available Chinese (Mandarin) voice, waiting for the
 * voiceschanged event if getVoices() is initially empty.
 */
export function getChineseVoice(): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(null);
  }
  const syn = window.speechSynthesis;
  const voices = syn.getVoices();
  if (voices.length > 0) {
    return Promise.resolve(pickBestChineseVoice(voices));
  }
  return new Promise((resolve) => {
    const onVoicesChanged = () => {
      syn.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(pickBestChineseVoice(syn.getVoices()));
    };
    syn.addEventListener("voiceschanged", onVoicesChanged);
    const afterLoad = syn.getVoices();
    if (afterLoad.length > 0) {
      syn.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(pickBestChineseVoice(afterLoad));
      return;
    }
  });
}
