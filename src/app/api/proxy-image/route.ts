import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  // Proteção rigorosa contra estouro de banda na Vercel:
  // Imagens do nosso Cloudflare R2 ou CDN própria NUNCA devem passar pelo proxy da Vercel!
  if (
    imageUrl.includes("cdn.artesdesignonline.com.br") || 
    imageUrl.includes(".r2.dev") || 
    imageUrl.includes("r2.cloudflarestorage.com")
  ) {
    // Redireciona o navegador diretamente para o Cloudflare R2 sem transferir os bytes pela Vercel
    return NextResponse.redirect(imageUrl, { status: 307 });
  }

  try {
    const response = await fetch(imageUrl, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*", // Allow cross-origin for canvas editing
      },
    });
  } catch (error) {
    console.error("Proxy Image Error:", error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
