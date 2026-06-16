import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Maximum file size to fetch (1MB for text files)
const MAX_FILE_SIZE = 1024 * 1024;

const PIPELINE_API_URL = process.env.PIPELINE_API_URL || "http://localhost:8080";
const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY || "";

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get asset ID - we now fetch by asset ID through the pipeline API
  const assetId = request.nextUrl.searchParams.get("assetId");
  if (!assetId) {
    return NextResponse.json({ error: "Missing 'assetId' parameter" }, { status: 400 });
  }

  try {
    // Fetch file content through the pipeline API which handles all storage providers
    console.log("Fetching content for asset:", assetId);

    const response = await fetch(
      `${PIPELINE_API_URL}/api/v1/assets/${assetId}/source/stream`,
      {
        headers: {
          "X-API-Key": PIPELINE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Pipeline API error:", response.status, response.statusText);
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Asset or file not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large to display (max 1MB)" },
        { status: 413 }
      );
    }

    const content = await response.text();

    // Detect file format from content-type or content
    const contentType = response.headers.get("content-type") || "";
    let format = "text";
    if (contentType.includes("vtt") || content.startsWith("WEBVTT")) {
      format = "vtt";
    } else if (contentType.includes("srt") || /^\d+\r?\n\d{2}:\d{2}:\d{2}/.test(content)) {
      format = "srt";
    }

    return NextResponse.json({
      content,
      format,
    });
  } catch (error) {
    console.error("Unexpected error fetching file content:", error);
    return NextResponse.json(
      { error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
