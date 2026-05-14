export const LEGAL_LINKS = {
  terms:
    import.meta.env.VITE_TERMS_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/docs/legal/terms.md",
  privacy:
    import.meta.env.VITE_PRIVACY_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/docs/legal/privacy.md",
  kvkk:
    import.meta.env.VITE_KVKK_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/docs/legal/kvkk.md",
  support: import.meta.env.VITE_SUPPORT_URL || "mailto:support@jam-app.local",
  privacyChoices:
    import.meta.env.VITE_PRIVACY_CHOICES_URL ||
    "https://github.com/MiamiMetro/jam-app/blob/main/docs/legal/privacy.md#user-choices",
  openSource:
    import.meta.env.VITE_OPEN_SOURCE_URL ||
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
