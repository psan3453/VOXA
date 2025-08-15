export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-6">🎙 Welcome to Voxa</h1>
      <p className="text-lg text-gray-300 mb-8">
        Your AI-powered podcast host that asks smart follow-up questions in real time.
      </p>
      <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-lg font-semibold transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.8)]">
        Start Podcast
      </button>

    </div>
  );
}
