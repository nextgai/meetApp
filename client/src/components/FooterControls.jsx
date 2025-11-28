export default function FooterControls() {
  return (
    <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
      <div className="flex justify-between items-center max-w-4xl mx-auto">
        <div className="text-sm">Meeting ID: 123-456-789</div>

        <div className="flex gap-4">
          <button className="bg-red-600 hover:bg-red-700 w-12 h-12 rounded-full">Mic Off</button>
          <button className="bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-full">Cam Off</button>
          <button className="bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-full">Screen Share</button>
          <button className="bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-full">More</button>
          <button className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg font-bold">
            Leave
          </button>
        </div>

        <div className="text-sm">02:34</div>
      </div>
    </div>
  );
}