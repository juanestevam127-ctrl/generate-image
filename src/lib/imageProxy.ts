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

  // Se a imagem for do Cloudflare R2 (cdn.artesdesignonline.com.br ou r2.cloudflarestorage) ou Supabase,
  // carrega DIRETAMENTE do R2 sem passar pela Vercel para economizar 100% de banda
  if (url.includes('cdn.artesdesignonline.com.br') || url.includes('.r2.dev') || url.includes('supabase.co')) {
      return url;
  }

  // Apenas imagens externas de terceiros (Boom Sistemas, AutoCerto, BNDV) que não possuem CORS
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}
