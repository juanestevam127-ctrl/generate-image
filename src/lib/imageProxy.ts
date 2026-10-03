/**
 * Adaptação para economia de banda na Vercel e ajuste do CORS no R2.
 * Substitui automaticamente domínios de teste do Cloudflare (.r2.dev)
 * pelo domínio customizado oficial que possui suporte nativo a CORS.
 */
export function getProxiedUrl(url: string): string {
  if (!url) return url;
  
  // Se já for base64 ou blob, apenas retorna
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Remove qualquer resquício do proxy antigo se ainda existir nas URLs salvas
  if (url.includes('/api/proxy-image?url=')) {
      const match = url.match(/url=([^&]+)/);
      if (match) {
          url = decodeURIComponent(match[1]);
      }
  }

  // Substitui o domínio de teste (.r2.dev) pelo domínio próprio configurado com CORS
  if (url.includes('.r2.dev/')) {
      url = url.replace(/https:\/\/[^\/]+\.r2\.dev\//, 'https://cdn.artesdesignonline.com.br/');
  }

  return url;
}
