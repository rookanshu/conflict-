import { NextResponse } from "next/server";

const SUGGESTIONS = {
  categories: [
    { title: "North Eastern Region (NER)", prompts: [
      "What are the 8 states of North East India?",
      "Tell me about the Sela Tunnel and NH-13",
      "How long is the Bogibeel Bridge over Brahmaputra?",
      "What is the status of the Sikkim lifeline (NH-10)?",
      "How does the LoRa mesh operate during a blackout?",
    ] },
    { title: "Mountain Passes & Tunnels", prompts: [
      "What is the elevation and significance of Sela Pass?",
      "Explain the Sonapur Tunnel in Meghalaya",
      "What is Nathu La pass in Sikkim?",
      "Tell me about Bhupen Hazarika Setu (Dhola-Sadiya)",
    ] },
    { title: "Logistics & Cold-Chain", prompts: [
      "What are the cold chain storage requirements for blood and vaccines?",
      "What is the fuel buffer standard for mountain convoys?",
      "What are the AIS-140 emergency features?",
    ] },
    { title: "Emergency & First Aid", prompts: [
      "How to treat high-altitude hypothermia?",
      "What is the protocol for Acute Mountain Sickness (AMS)?",
      "What is the emergency CPR procedure?",
    ] },
  ],
};

export async function GET() {
  return NextResponse.json(SUGGESTIONS);
}
