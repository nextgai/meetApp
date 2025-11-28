// src/pages/Home.jsx
import { Video, Users, Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero */}
      <div className="px-6 py-16 md:py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
          Video Calls.<br />Simple. Secure. Beautiful.
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
          Start or join meetings instantly — no account needed.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link
            to="/meeting/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-full text-xl font-semibold flex items-center gap-3 shadow-lg transition"
          >
            <Video size={28} />
            Start New Meeting
          </Link>
          <div className="text-lg text-gray-700">
            or enter a code → <Link to="/dashboard" className="text-indigo-600 font-bold underline">Join</Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-10">
        <div className="bg-white/80 backdrop-blur rounded-3xl p-8 shadow-xl text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="text-indigo-600" size={40} />
          </div>
          <h3 className="text-2xl font-bold mb-3">Unlimited Participants</h3>
          <p className="text-gray-600">Host meetings with as many people as you want — no limits.</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl p-8 shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-green-600" size={40} />
          </div>
          <h3 className="text-2xl font-bold mb-3">End-to-End Encrypted</h3>
          <p className="text-gray-600">Your calls are private and secure by default.</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl p-8 shadow-xl text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ArrowRight className="text-purple-600" size={40} />
          </div>
          <h3 className="text-2xl font-bold mb-3">One Click to Join</h3>
          <p className="text-gray-600">No sign-up. Just click a link and you're in.</p>
        </div>
      </div>
    </div>
  );
}