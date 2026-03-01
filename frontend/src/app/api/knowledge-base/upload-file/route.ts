export async function POST(request: Request) {
  const formData = await request.formData();
  const backendBase = process.env.BACKEND_API_BASE || "http://localhost:8000";
  const apiKey = process.env.BACKEND_API_KEY;
  const headers = new Headers();
  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }
  const response = await fetch(`${backendBase}/api/knowledge-base/upload-file`, {
    method: "POST",
    body: formData,
    headers
  });
  const contentType = response.headers.get("content-type") || "application/json";
  const body = await response.text();
  return new Response(body, { status: response.status, headers: { "Content-Type": contentType } });
}
