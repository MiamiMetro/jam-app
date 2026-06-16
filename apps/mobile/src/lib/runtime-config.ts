const requireHttpsUrl = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error("must use https");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid https URL`);
  }
};

export const runtimeConfig = {
  convexUrl: requireHttpsUrl(
    "EXPO_PUBLIC_CONVEX_URL",
    process.env.EXPO_PUBLIC_CONVEX_URL
  ),
  convexSiteUrl: requireHttpsUrl(
    "EXPO_PUBLIC_CONVEX_SITE_URL",
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL
  ),
};
