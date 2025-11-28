import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/dashboard" className="text-2xl font-bold text-blue-500">
          Meet<span className="text-white">App</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="hover:text-blue-400 transition">Dashboard</Link>
          <button className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm">
            Account
          </button>
        </div>
      </div>
    </nav>
  );
}