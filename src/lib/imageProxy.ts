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

  // Se a imagem for do nosso próprio CDN ou Supabase configurado com CORS, pode carregar direto
  if (url.includes('cdn.artesdesignonline.com.br') || url.includes('supabase.co')) {
      return url;
  }

  // Qualquer outra imagem externa (ex: Boom Sistemas, AutoCerto, BNDV, Revenda Mais, S3 externos)
  // precisa passar pelo proxy com headers Access-Control-Allow-Origin: * para o Cropper/Canvas não ficar preto
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}
