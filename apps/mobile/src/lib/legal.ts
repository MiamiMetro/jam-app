export const LEGAL_LINKS = {
  terms:
    process.env.EXPO_PUBLIC_TERMS_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/docs/legal/terms.md",
  privacy:
    process.env.EXPO_PUBLIC_PRIVACY_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/docs/legal/privacy.md",
  kvkk:
    process.env.EXPO_PUBLIC_KVKK_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/docs/legal/kvkk.md",
  support: process.env.EXPO_PUBLIC_SUPPORT_URL || "mailto:support@jam-app.local",
  privacyChoices:
    process.env.EXPO_PUBLIC_PRIVACY_CHOICES_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/docs/legal/privacy.md#user-choices",
  openSource:
    process.env.EXPO_PUBLIC_OPEN_SOURCE_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/package-lock.json",
} as const;

export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate or abusive content" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "violence", label: "Violence or threats" },
  { value: "spam", label: "Spam or scams" },
  { value: "impersonation", label: "Impersonation" },
  { value: "illegal", label: "Illegal activity" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
