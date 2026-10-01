/**
 * Adaptação para economia de banda na Vercel.
 * Como o CORS do R2 já está configurado, podemos ler direto.
 */
export function getProxiedUrl(url: string): string {
  if (!url) return url;
  
  // Retorna diretamente a URL do R2 em vez de passar pela API da Vercel
  return url;
}
