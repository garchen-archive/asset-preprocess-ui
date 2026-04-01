import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPresignedUrl } from "@/lib/storage/backblaze";

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing 'key' parameter" }, { status: 400 });
  }

  // Optional: expiration time in seconds (default 1 hour)
  const expiresIn = parseInt(request.nextUrl.searchParams.get("expires") || "3600", 10);

  // Optional: inline disposition (default true for viewing in browser)
  const inline = request.nextUrl.searchParams.get("inline") !== "false";

  try {
    const url = await getPresignedUrl(key, expiresIn, inline);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
