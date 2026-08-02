import React, { useState } from 'react';
import { Layers, AlertCircle, CheckCircle2, Shield, Filter, ArrowRight } from 'lucide-react';

export default function ReachabilityChart({ reachabilityData, cves }) {
  const [filter, setFilter] = useState('ALL'); // ALL | REACHABLE | UNREACHABLE

  const nodes = reachabilityData?.nodes || [];
  const edges = reachabilityData?.edges || [];

  const reachableNodes = nodes.filter(n => n.category !== 'UNREACHABLE_CODE');
  const unreachableNodes = nodes.filter(n => n.category === 'UNREACHABLE_CODE');

  const filteredNodes = nodes.filter(n => {
    if (filter === 'REACHABLE') return n.category !== 'UNREACHABLE_CODE';
    if (filter === 'UNREACHABLE') return n.category === 'UNREACHABLE_CODE';
    return true;
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
            AST Reachability Map
          </span>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mt-2 flex items-center gap-2">
            <Layers className="text-orange-600" size={24} />
            <span>Dependency Reachability Analysis</span>
          </h2>
        </div>

        {/* Filter Badges with animated transitions */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
              filter === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({nodes.length})
          </button>
          <button
            onClick={() => setFilter('REACHABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
              filter === 'REACHABLE' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-red-600'
            }`}
          >
            Reachable ({reachableNodes.length})
          </button>
          <button
            onClick={() => setFilter('UNREACHABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all cursor-pointer ${
              filter === 'UNREACHABLE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-600'
            }`}
          >
            Unreachable ({unreachableNodes.length})
          </button>
        </div>
      </div>

      {/* Grid of Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.length === 0 ? (
          <p className="text-sm text-slate-500 font-mono col-span-3">No AST nodes match the selected filter.</p>
        ) : (
          filteredNodes.map((node, i) => {
            const isReachable = node.category !== 'UNREACHABLE_CODE';
            return (
              <div 
                key={i}
                className={`border rounded-xl p-5 space-y-3 transition-all ${
                  isReachable 
                    ? 'bg-red-50/50 border-red-200 hover:border-red-400' 
                    : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-slate-900 text-sm">{node.package}</span>
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    isReachable ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isReachable ? 'RUNTIME REACHABLE' : 'UNREACHABLE CODE'}
                  </span>
                </div>

                <p className="text-xs font-mono text-slate-600 truncate">
                  Imported Symbol: <span className="font-bold text-slate-800">{node.imported_symbol || 'default'}</span>
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
