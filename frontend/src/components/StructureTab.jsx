import { Layers } from 'lucide-react';

const StructureTab = ({ categorization }) => {
  if (!categorization) return null;

  return (
    <div className="card-panel p-6 rounded-2xl">
      <h3 className="font-bold text-md text-white mb-4 flex items-center gap-2">
        <Layers className="w-4 h-4 text-indigo-400" /> Codebase Structure Breakdown
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Object.entries(categorization).map(([cat, fList]) => (
          <div key={cat} className="bg-gray-950/40 p-4 rounded-xl border border-gray-800">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{cat}</span>
              <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">{fList.length}</span>
            </div>
            {fList.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {fList.map((file, idx) => (
                  <div key={idx} className="text-xs text-gray-400 truncate flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                    {file}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-500 italic">No files in category</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StructureTab;
