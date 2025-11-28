// src/pages/Login.jsx
import { Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-10 max-w-md w-full">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-8">Welcome Back</h2>
        
        <form className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-gray-400" size={24} />
            <input type="email" placeholder="Email" className="w-full pl-14 pr-6 py-5 rounded-xl border-2 border-gray-300 focus:border-indigo-500 outline-none text-lg" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-gray-400" size={24} />
            <input type="password" placeholder="Password" className="w-full pl-14 pr-6 py-5 rounded-xl border-2 border-gray-300 focus:border-indigo-500 outline-none text-lg" />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-xl font-bold text-xl transition">
            Sign In
          </button>
        </form>

        <p className="text-center mt-8 text-gray-600">
          Don't have an account? <Link to="/register" className="text-indigo-600 font-bold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}