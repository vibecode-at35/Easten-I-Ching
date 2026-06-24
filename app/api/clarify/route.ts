import { NextResponse } from "next/server";
import { extract, ModelRequestError } from "../../../lib/interpretation/router";
import type { AssembledPrompt } from "../../../lib/interpretation/prompt";

const CLARIFY_SYSTEM_PROMPT = `You are a strict, fast gatekeeper for an I Ching oracle. A user is asking a question. Your ONLY job is to determine if their question is so incredibly brief, ambiguous, or lacking in context that the reading would be essentially blind (e.g., "what should I do?", "will it work out?"). 
If the question is extremely vague, generate a single, gentle sentence asking them for a bit more context. 
If the question already has some context, or if it's a clear binary question (e.g., "should I study law"), do not ask for more context. 
You must respond in JSON with the exact following schema:
{
  "action": "proceed" | "ask",
  "clarificationQuestion": string | null
}
If action is 'ask', 'clarificationQuestion' must be a gentle, one-sentence question IN THE LOCALE of the user's question, asking for more detail.
If action is 'proceed', 'clarificationQuestion' must be null.`;

export async function POST(req: Request) {
  try {
    const { question, locale } = await req.json();

    const prompt: AssembledPrompt = {
      system: [{ type: "text", text: CLARIFY_SYSTEM_PROMPT }],
      messages: [{ role: "user", content: `Question: ${question}\nLocale: ${locale}` }]
    };

    const stream = extract(prompt);
    let resultText = "";
    for await (const chunk of stream) {
      resultText += chunk;
    }

    // Parse the JSON safely. The model may wrap it in a ```json fence and/or
    // add prose before/after the object, so extract the first {...} block
    // rather than assuming the whole response is bare JSON.
    const match = resultText.match(/\{[\s\S]*\}/);
    const data = JSON.parse(match ? match[0] : resultText);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Clarification API Error:", err);
    // On any error (network, parse), fail open: just proceed to the reading.
    return NextResponse.json({ action: "proceed", clarificationQuestion: null });
  }
}
