import { headers } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const requestHeaders = await headers();
  const country = requestHeaders.get("x-vercel-ip-country")?.toUpperCase() || null;

  return Response.json(
    { country },
    { headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } },
  );
}
