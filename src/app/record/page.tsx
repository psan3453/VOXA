"use client";

import { useState, useRef } from "react";

interface Recording {
  id: number;
  url: string;
  transcript: string;
  timestamp: string;
}

export default function RecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [liveTranscript, setLiveTranscript] = useState(""); // ✅ live transcript while recording

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chunks = useRef<Blob[]>([]);
  const idCounter = useRef(0);
  const transcriptRef = useRef("");

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 🎤 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      // 📝 SpeechRecognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = true;
        recognition.continuous = true;

        transcriptRef.current = "";
        setLiveTranscript(""); // reset UI

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let current = "";
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript + " ";
          }
          transcriptRef.current = current.trim();
          setLiveTranscript(transcriptRef.current); // ✅ show live text
        };

        recognition.onerror = (e) => {
          console.error("SpeechRecognition error:", e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        alert("❌ Your browser does not support SpeechRecognition API.");
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        chunks.current = [];
        const url = URL.createObjectURL(blob);

        // ✅ Save audio + final transcript
        const newRecording: Recording = {
          id: idCounter.current++,
          url,
          transcript: transcriptRef.current || "(No speech detected)",
          timestamp: new Date().toLocaleTimeString(),
        };

        setRecordings((prev) => [...prev, newRecording]);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">🎙 Free Recorder + Transcriber</h1>

      {!isRecording ? (
        <button
          onClick={startRecording}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl text-lg font-semibold"
        >
          Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-lg font-semibold"
        >
          Stop Recording
        </button>
      )}

      {/* ✅ Live transcript while recording */}
      {isRecording && (
        <p className="mt-4 text-yellow-400 text-lg">🎤 Live: {liveTranscript}</p>
      )}

      {recordings.length > 0 && (
        <div className="mt-8 w-full max-w-lg">
          <h2 className="text-xl font-semibold mb-4">🎧 Your Recordings</h2>
          <ul className="space-y-4">
            {recordings.map((rec) => (
              <li key={rec.id} className="p-4 bg-gray-800 rounded-xl flex flex-col">
                <span className="text-sm text-gray-400 mb-2">
                  ⏱ Recorded at: {rec.timestamp}
                </span>
                <audio controls src={rec.url} className="mb-2" />
                <p className="text-sm text-green-400">📜 {rec.transcript}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
