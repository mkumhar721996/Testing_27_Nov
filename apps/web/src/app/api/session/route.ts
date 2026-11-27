import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export const dynamic = "force-dynamic";

const unauthorized = () => new NextResponse(null, { status: 401 });

export async function GET() {
  let token: string;
  try {
    token = (await auth0.getAccessToken()).token;
  } catch {
    return unauthorized();
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${process.env.API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  if (upstream.status === 401) return unauthorized();
  if (!upstream.ok) return new NextResponse(null, { status: upstream.status });
  return NextResponse.json(await upstream.json());
}
