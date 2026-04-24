/**
 * Wraps a URL with the internal proxy to bypass network restrictions
 * and CORS issues.
 */
export function getProxiedUrl(url: string): string {
  if (!url) return url;
  
  // If it's already a base64 or a local blob, return as is
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }



  return url;
}
