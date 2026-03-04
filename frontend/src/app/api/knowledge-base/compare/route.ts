export async function GET() {
  const backendBase = process.env.BACKEND_API_BASE || "http://localhost:8000";
  const apiKey = process.env.BACKEND_API_KEY;
  const headers = new Headers();
  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }
  const response = await fetch(`${backendBase}/api/knowledge-base/compare`, {
    method: "GET",
    headers
  });
  const responseType = response.headers.get("content-type") || "application/json";
  const responseBody = await response.text();
  return new Response(responseBody, { status: response.status, headers: { "Content-Type": responseType } });
}
