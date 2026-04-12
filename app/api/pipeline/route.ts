import { NextRequest, NextResponse } from "next/server";

const PIPELINE_API_URL = process.env.PIPELINE_API_URL || "http://localhost:8080";
const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, method = "POST", data } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const url = `${PIPELINE_API_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": PIPELINE_API_KEY,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json().catch(() => null);

    return NextResponse.json(
      { data: responseData, status: response.status },
      { status: response.ok ? 200 : response.status }
    );
  } catch (error: any) {
    console.error("Pipeline API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to call pipeline API" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    // Build query string from remaining params
    const queryParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== "endpoint") {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const url = `${PIPELINE_API_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": PIPELINE_API_KEY,
      },
    });

    const responseData = await response.json().catch(() => null);

    return NextResponse.json(
      { data: responseData, status: response.status },
      { status: response.ok ? 200 : response.status }
    );
  } catch (error: any) {
    console.error("Pipeline API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to call pipeline API" },
      { status: 500 }
    );
  }
}
