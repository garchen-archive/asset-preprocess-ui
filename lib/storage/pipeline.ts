const PIPELINE_API_URL = process.env.PIPELINE_API_URL || "http://localhost:8080";
const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY || "";

// Maximum file size to fetch (1MB for text files)
const MAX_FILE_SIZE = 1024 * 1024;

export interface AssetContentResult {
  content: string;
  format: "vtt" | "srt" | "text";
}

/**
 * Fetch asset content from the pipeline API.
 * Used for fetching VTT/SRT transcript files from storage (GDrive, Backblaze, etc.)
 *
 * @param assetId - The canonical asset ID
 * @returns The content and detected format, or null if fetch fails
 */
export async function fetchAssetContent(
  assetId: string
): Promise<AssetContentResult | null> {
  try {
    console.log("[pipeline] Fetching content for asset:", assetId);

    const response = await fetch(
      `${PIPELINE_API_URL}/api/v1/assets/${assetId}/source/stream`,
      {
        headers: {
          "X-API-Key": PIPELINE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "[pipeline] API error:",
        response.status,
        response.statusText
      );
      return null;
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      console.warn("[pipeline] File too large:", contentLength);
      return null;
    }

    const content = await response.text();

    // Detect file format from content-type or content
    const contentType = response.headers.get("content-type") || "";
    let format: "vtt" | "srt" | "text" = "text";
    if (contentType.includes("vtt") || content.startsWith("WEBVTT")) {
      format = "vtt";
    } else if (
      contentType.includes("srt") ||
      /^\d+\r?\n\d{2}:\d{2}:\d{2}/.test(content)
    ) {
      format = "srt";
    }

    console.log("[pipeline] Fetched content, format:", format, "length:", content.length);
    return { content, format };
  } catch (error) {
    console.error("[pipeline] Unexpected error fetching asset content:", error);
    return null;
  }
}
