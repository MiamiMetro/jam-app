/**
 * Yasaklı kelimeler listesi — geliştirici tarafından belirlenir.
 * Kullanıcı bu listeyi göremez ve değiştiremez.
 * Yeni kelime eklemek için bu diziye string eklemeniz yeterlidir.
 */
const BANNED_WORDS: string[] = [
  // Test words
  "patates",

  // Türkçe
  "amk",
  "bok",
  "sik",
  "got",
  "pic",
  "mal",
  "orospu",
  "pezevenk",
  "kahpe",
  "gavat",
  "ibne",
  "gerizekalı",
  "salak",
  "aptal",
  "kürt",
  "ermeni",
  "am",
  "göt",
  "sik",
  // İngilizce
  "fuck",
  "shit",
  "damn",
  "ass",
  "dick",
  "bitch",
  "bastard",
  "crap",
  "slut",
  "whore",
];

/**
 * Verilen metindeki yasaklı kelimeleri "***" ile değiştirir.
 * @param text   — Sansürlenecek metin
 * @param enabled — Sansür aktif mi?
 * @returns Sansürlenmiş veya orijinal metin
 */
export function censorText(text: string, enabled: boolean): string {
  if (!enabled || BANNED_WORDS.length === 0) return text;

  // Word boundary ile case-insensitive eşleştirme
  const escaped = BANNED_WORDS.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return text.replace(pattern, "***");
}
