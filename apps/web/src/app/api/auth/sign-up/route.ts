import { NextResponse } from "next/server";
import { signUp } from "@/lib/auth0";

export async function POST(request: Request) {
  const { name, email, password } = await request.json().catch(() => ({}));
  if (![name, email, password].every((v) => typeof v === "string" && v)) {
    return NextResponse.json({ code: "sign_up_rejected" }, { status: 400 });
  }

  const result = await signUp(name, email, password);
  switch (result.kind) {
    case "created":
      return NextResponse.json({ code: "verify_email", email }, { status: 201 });
    case "rejected":
      return NextResponse.json({ code: "sign_up_rejected" }, { status: 400 });
    default:
      return NextResponse.json({ code: "unavailable" }, { status: 502 });
  }
}
