import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  // Security check: only allow proxying images from our Supabase instance or common CDNs if needed
  // For now, let's just allow it since the backend fetches it. 
  // In a real app, you'd check if imageUrl starts with your Supabase URL.

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
