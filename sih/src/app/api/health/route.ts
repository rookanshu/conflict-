import { NextResponse } from "next/server";

/** Health probe for the local API layer. Always reaches the curated datasets. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    api_layer: "local-datasets",
    backend: {
      enabled: false,
      reachable: false,
      url: "",
      note: "Standalone mode — serving curated local datasets only.",
    },
    timestamp: new Date().toISOString(),
  });
}
