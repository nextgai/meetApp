export default function VideoGrid() {
  const participants = [1, 2, 3, 4]; // Mock

  return (
    <div className="h-full p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 h-full">
        {participants.map((p) => (
          <div key={p} className="relative bg-gray-900 rounded-2xl overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
              <div className="text-6xl font-bold text-white opacity-50">User {p}</div>
            </div>
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded-lg text-sm">
              User {p} {p === 1 && '(You)'}
            </div>
            {p === 1 && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs">
                REC
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}