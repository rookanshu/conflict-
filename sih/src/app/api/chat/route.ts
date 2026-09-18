import { NextRequest, NextResponse } from "next/server";
import type { ChatResponse } from "@/types/api";

const OFFLINE_HEADERS = { "X-NER-Source": "offline-dataset" };

function timestampNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message : "";

    if (!message.trim()) {
      return NextResponse.json(
        {
          answer: "Greetings. I am the NER Logistics Intelligence AI Copilot. Ask me about regional highway corridors, Sela Tunnel accessibility, cold-chain standards, medical first aid, or road closures.",
          source: "NER Logistics Intelligence",
          suggestions: [
            "What are the 8 states of North East India?",
            "Status of Sela Tunnel on NH-13?",
            "Cold chain guidelines for blood plasma?",
            "Emergency protocol for hypothermia?",
          ],
          timestamp: timestampNow(),
        },
        { headers: OFFLINE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        answer: `Query noted: "${message}". In the North Eastern Region, all transit decisions should account for terrain elevation and monsoon weather buffers. For critical convoy routing, consult the Routes tab or deploy an AI Blockage Detour.`,
        source: "NER Command Center Intelligence",
        suggestions: [
          "Tell me about Sela Tunnel and NH-13",
          "What is the Sonapur Tunnel status?",
          "How to treat high-altitude AMS?",
          "What is the LoRa mesh protocol?",
        ],
        timestamp: timestampNow(),
      },
      { headers: OFFLINE_HEADERS }
    );
  } catch {
    return NextResponse.json({ error: "Internal chat processing error" }, { status: 500 });
  }
}
