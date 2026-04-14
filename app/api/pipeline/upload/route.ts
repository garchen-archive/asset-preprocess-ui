import { NextRequest, NextResponse } from "next/server";

const PIPELINE_API_URL = process.env.PIPELINE_API_URL || "http://localhost:8080";
const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const provider = formData.get("provider") || "backblaze";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Create new FormData for pipeline API
    const pipelineFormData = new FormData();
    pipelineFormData.append("file", file);
    pipelineFormData.append("provider", provider as string);

    // Forward to pipeline API (let fetch set the Content-Type with boundary)
    const response = await fetch(`${PIPELINE_API_URL}/api/v1/storage/upload`, {
      method: "POST",
      headers: {
        "X-API-Key": PIPELINE_API_KEY,
      },
      body: pipelineFormData,
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: responseData?.error || "Upload failed", data: responseData },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Pipeline upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
