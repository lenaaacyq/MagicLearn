export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_API_BASE || "http://localhost:8000";
  const apiKey = process.env.BACKEND_API_KEY;
  const headers = new Headers();
  const contentType = request.headers.get("content-type") || "application/json";
  headers.set("Content-Type", contentType);
  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }
  const body = await request.text();
  const response = await fetch(`${backendBase}/api/knowledge-base/transform`, {
    method: "POST",
    headers,
    body
  });
  const responseType = response.headers.get("content-type") || "application/json";
  const responseBody = await response.text();
  return new Response(responseBody, { status: response.status, headers: { "Content-Type": responseType } });
}
