import { NextRequest, NextResponse } from "next/server";

// Development: 127.0.0.1:8000
const PROOFRAILS_API_URL = "http://127.0.0.1:8000";
const API_KEY = process.env.NEXT_PUBLIC_PROOFRAILS_KEY;

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path } = await context.params;
    const pathStr = path.join("/");
    const searchParams = request.nextUrl.search;
    const url = `${PROOFRAILS_API_URL}/${pathStr}${searchParams}`;
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        body = {};
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY || "",
            },
            body: JSON.stringify(body),
        });

        const contentType = response.headers.get("content-type") || "";
        
        if (contentType.includes("application/json")) {
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        } else {
            const blob = await response.blob();
            return new NextResponse(blob, {
                status: response.status,
                headers: {
                    "Content-Type": contentType || "application/octet-stream",
                },
            });
        }
    } catch (error) {
        console.error(`[ProofRails Proxy] POST ${url} failed:`, error);
        return NextResponse.json({ error: "Failed to connect to ProofRails" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path } = await context.params;
    const pathStr = path.join("/");
    const searchParams = request.nextUrl.search;
    const url = `${PROOFRAILS_API_URL}/${pathStr}${searchParams}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-api-key": API_KEY || "",
            },
        });

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        } else {
            const blob = await response.blob();
            return new NextResponse(blob, {
                status: response.status,
                headers: {
                    "Content-Type": contentType || "application/octet-stream",
                },
            });
        }
    } catch (error) {
        console.error(`[ProofRails Proxy] GET ${url} failed:`, error);
        return NextResponse.json({ error: "Failed to connect to ProofRails" }, { status: 500 });
    }
}
