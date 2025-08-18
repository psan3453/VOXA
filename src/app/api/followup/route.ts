import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";


export async function POST(req: Request) {
  try {
    const { transcript, audioUrl, history } = await req.json();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,  
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a podcast assistant. Generate 3 follow-up questions." },
          ...history,
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Groq API request failed" }, { status: 500 });
    }

    const data = await response.json();
    console.log("Groq response:", JSON.stringify(data, null, 2)); // 👀 Debug log

    const rawContent = data.choices?.[0]?.message?.content ?? "";
    const questions = rawContent
      .split(/\d+\.\s|\n|-/) // clean split
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 0);

    // ✅ Save to Supabase
    const { error } = await supabase.from("recordings").insert({
      transcript,
      audio_url: audioUrl,
      followups: questions,
    });

    if (error) throw error;

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Failed to generate follow-ups" }, { status: 500 });
  }
}
