// src/pages/Dashboard.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Video, Hash } from "lucide-react";

export default function Dashboard() {
  const [code, setCode] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-10 max-w-2xl w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12">
          Welcome to MeetApp
        </h1>

        <div className="grid md:grid-cols-2 gap-10">
          {/* New Meeting */}
          <Link
            to="/meeting/new"
            className="group bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-10 text-center hover:shadow-2xl transition-all transform hover:scale-105"
          >
            <Video size={60} className="mx-auto mb-6 group-hover:animate-pulse" />
            <h2 className="text-2xl font-bold mb-3">Start New Meeting</h2>
            <p className="text-indigo-100">Instant meeting — no setup needed</p>
          </Link>

          {/* Join with Code */}
          <div className="bg-gray-50 rounded-2xl p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Hash size={32} />
              Join with Code
            </h2>
            <input
              type="text"
              placeholder="Enter meeting code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-6 py-4 rounded-xl border-2 border-gray-300 focus:border-indigo-500 outline-none text-lg mb-6"
            />
            <Link
              to={`/meeting/${code}`}
              className={`block text-center px-8 py-4 rounded-xl font-bold text-white transition ${
                code ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400 cursor-not-allowed"
              }`}
              onClick={(e) => !code && e.preventDefault()}
            >
              Join Meeting
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}