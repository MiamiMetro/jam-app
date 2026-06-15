const DICEBEAR_SVG_URL =
  /^(https:\/\/api\.dicebear\.com\/[^/]+\/[^/]+)\/svg(\?[^#]*)?(#.*)?$/;

export function getNativeAvatarUri(uri?: string | null) {
  if (!uri) return "";
  return uri.replace(DICEBEAR_SVG_URL, "$1/png$2$3");
}
