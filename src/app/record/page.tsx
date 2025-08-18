"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";


interface Recording {
  id: number;
  url: string;
  transcript: string;
  timestamp: string;
  followUps?: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function RecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chunks = useRef<Blob[]>([]);
  const idCounter = useRef(0);
  const transcriptRef = useRef("");

  // ✅ Load past recordings from Supabase when page loads
  useEffect(() => {
    const fetchRecordings = async () => {
      const { data, error } = await supabase
        .from("recordings")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRecordings(
          data.map((rec) => ({
            id: rec.id,
            url: rec.audio_url,
            transcript: rec.transcript,
            followUps: rec.followups,
            timestamp: new Date(rec.created_at).toLocaleTimeString(),
          }))
        );
      } else {
        console.error("❌ Supabase fetch error:", error);
      }
    };

    fetchRecordings();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = true;
        recognition.continuous = true;

        transcriptRef.current = "";
        setLiveTranscript("");

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let current = "";
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript + " ";
          }
          transcriptRef.current = current.trim();
          setLiveTranscript(transcriptRef.current);
        };

        recognition.onerror = (e) => {
          console.error("SpeechRecognition error:", e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        alert("❌ Your browser does not support SpeechRecognition API.");
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        chunks.current = [];
        const url = URL.createObjectURL(blob);

        const transcript = transcriptRef.current || "(No speech detected)";

        const newRecording: Recording = {
          id: idCounter.current++,
          url,
          transcript,
          timestamp: new Date().toLocaleTimeString(),
          followUps: [],
        };

        setRecordings((prev) => [...prev, newRecording]);
        setConversationHistory((prev) => [...prev, { role: "user", content: transcript }]);

        // 🚀 TODO: Save to Supabase
        await supabase.from("recordings").insert([
          {
            audio_url: url,
            transcript,
            followups: [],
          },
        ]);

        await generateFollowUps(newRecording.id, transcript);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  // ✅ Call API with conversation history
  const generateFollowUps = async (id: number, userInput: string) => {
  setLoadingId(id);
  try {
    const res = await fetch("/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: [...conversationHistory, { role: "user", content: userInput }],
      }),
    });

    const data = await res.json();

    // ✅ Fix here
    const aiQuestions = Array.isArray(data.questions)
      ? data.questions
      : String(data.questions).split("\n").filter((q) => q.trim() !== "");

    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, followUps: aiQuestions } : r))
    );

    // 🚀 Update Supabase followups
    await supabase.from("recordings").update({ followups: aiQuestions }).eq("id", id);

    if (aiQuestions.length > 0) {
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: aiQuestions.join("\n") },
      ]);
    }
  } catch (err) {
    console.error("Follow-up error:", err);
  } finally {
    setLoadingId(null);
  }
};


  // 🔥 Handle when user clicks a follow-up question
  const handleFollowUpClick = async (question: string) => {
    const newRecording: Recording = {
      id: idCounter.current++,
      url: "",
      transcript: question,
      timestamp: new Date().toLocaleTimeString(),
      followUps: [],
    };

    setRecordings((prev) => [...prev, newRecording]);
    setConversationHistory((prev) => [...prev, { role: "user", content: question }]);

    await supabase.from("recordings").insert([
      {
        audio_url: "",
        transcript: question,
        followups: [],
      },
    ]);

    await generateFollowUps(newRecording.id, question);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">🎙 Smart Interview Assistant</h1>

      {!isRecording ? (
        <button
          onClick={startRecording}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl text-lg font-semibold"
        >
          🎤 Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-lg font-semibold"
        >
          ⏹ Stop Recording
        </button>
      )}

      {isRecording && (
        <p className="mt-4 text-yellow-400 text-lg">🎧 Live: {liveTranscript}</p>
      )}

      {recordings.length > 0 && (
        <div className="mt-8 w-full max-w-lg">
          <h2 className="text-xl font-semibold mb-4">📂 Conversation History</h2>
          <ul className="space-y-4">
            {recordings.map((rec) => (
              <li
                key={rec.id}
                className="p-4 bg-gray-800 rounded-xl flex flex-col"
              >
                <span className="text-sm text-gray-400 mb-2">
                  ⏱ {rec.timestamp}
                </span>

                {rec.url && <audio controls src={rec.url} className="mb-2" />}
                <p className="text-sm text-green-400">🗣 {rec.transcript}</p>

                {loadingId === rec.id && (
                  <p className="text-sm text-yellow-400 mt-2">
                    🤔 Generating follow-ups...
                  </p>
                )}

                {rec.followUps && rec.followUps.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                    <h3 className="font-semibold text-white mb-2">
                      💡 Follow-up Suggestions
                    </h3>
                    <ul className="space-y-2">
                      {rec.followUps.map((q, idx) => (
                        <li key={idx}>
                          <button
                            onClick={() => handleFollowUpClick(q)}
                            className="text-blue-300 hover:text-blue-400 underline"
                          >
                            {q}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
