import { NextResponse } from "next/server";

const normalize = (value: string) =>
  value
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");

export async function POST(request: Request) {
  const endpointRaw = process.env.AZURE_VOICE_ENDPOINT;
  const deployment = process.env.AZURE_VOICE_DEPLOYMENT;
  const apiVersion = process.env.AZURE_VOICE_API_VERSION || "2025-03-01-preview";
  const apiKey = process.env.AZURE_VOICE_API_KEY;

  if (!endpointRaw || !apiKey) {
    return NextResponse.json({
      transcript:
        "Voice model not configured. Add AZURE_VOICE_ENDPOINT and AZURE_VOICE_API_KEY.",
      notConfigured: true,
    });
  }

  const endpoint = normalize(endpointRaw);
  const hasApiVersion = endpoint.includes("api-version=");
  const hasOpenAiPath = endpoint.includes("/openai/");
  const isBaseEndpoint = !hasOpenAiPath;

  const requestUrl = isBaseEndpoint
    ? deployment
      ? `${endpoint.replace(/\/+$/, "")}/openai/deployments/${deployment}/audio/transcriptions?api-version=${apiVersion}`
      : `${endpoint.replace(/\/+$/, "")}?api-version=${apiVersion}`
    : hasApiVersion
      ? endpoint
      : `${endpoint}${endpoint.includes("?") ? "&" : "?"}api-version=${apiVersion}`;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const inbound = await request.formData();
    const file = inbound.get("file");
    const model = inbound.get("model") ?? "gpt-4o-mini-transcribe";
    const language = inbound.get("language");
    const prompt = inbound.get("prompt");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }

    const outbound = new FormData();
    outbound.append("file", file, (file as File).name || "audio.wav");
    outbound.append("model", String(model));
    if (language) {
      outbound.append("language", String(language));
    }
    if (prompt && typeof prompt === "string") {
      outbound.append("prompt", prompt);
    }

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: outbound,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure voice error:", response.status, errorText);
      return NextResponse.json({ error: "Voice transcription failed." }, { status: 502 });
    }

    const data = await response.json();
    const transcript =
      data?.text || data?.transcript || data?.output_text || "No transcript";

    return NextResponse.json({ transcript, notConfigured: false, raw: data });
  }

  const body = await request.json().catch(() => null);
  return NextResponse.json({
    transcript: body?.placeholder
      ? "Stub transcript received. Send multipart/form-data with a file to transcribe."
      : "Stub transcript.",
    notConfigured: false,
  });
}
