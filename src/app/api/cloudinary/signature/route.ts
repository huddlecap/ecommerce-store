import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type SignatureBody = {
  paramsToSign?: unknown;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const secret = process.env.CLOUDINARY_API_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Cloudinary is not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as SignatureBody | null;
  const paramsToSign = body?.paramsToSign;

  if (
    !paramsToSign ||
    typeof paramsToSign !== "object" ||
    Array.isArray(paramsToSign)
  ) {
    return NextResponse.json(
      { error: "Invalid signature parameters" },
      { status: 400 },
    );
  }

  const params = paramsToSign as Record<string, unknown>;
  const stringToSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join("&");
  const signature = createHash("sha1")
    .update(`${stringToSign}${secret}`)
    .digest("hex");

  return NextResponse.json({ signature });
}
