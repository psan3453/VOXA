import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { history } = await req.json();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "You are a podcast assistant. Based on the guest’s answer, generate 3 interesting follow-up questions.",
          },
          ...history,
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Groq API request failed" }, { status: 500 });
    }

    const data = await response.json();
    const questions = data.choices?.[0]?.message?.content || "No follow-ups generated.";

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Failed to generate follow-ups" }, { status: 500 });
  }
}
