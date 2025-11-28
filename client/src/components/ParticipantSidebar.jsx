    // ParticipantSidebar.jsx
export default function ParticipantSidebar() {
  return (
    <div className="w-64 bg-gray-900 border-l border-gray-800 p-4 hidden lg:block">
      <h3 className="font-bold mb-4">Participants (4)</h3>
      <div className="space-y-2 text-sm">
        {['You', 'Alice', 'Bob', 'Charlie'].map((name) => (
          <div key={name} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs">
              {name[0]}
            </div>
            <span>{name} {name === 'You' && '(Host)'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}