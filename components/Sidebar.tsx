import React from 'react';
import { Cluster, AppView } from '../types';
import { LayoutGrid, Network, Sparkles, FolderOpen, List, Bot } from 'lucide-react';

interface SidebarProps {
  clusters: Cluster[];
  activeClusterId: string | null;
  onSelectCluster: (id: string | null) => void;
  onOrganize: () => void;
  isOrganizing: boolean;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  clusters, 
  activeClusterId, 
  onSelectCluster, 
  onOrganize, 
  isOrganizing,
  currentView,
  onChangeView
}) => {
  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800 shrink-0 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Memorunia</h1>
        </div>

        <div className="space-y-2 mb-8">
          <button 
            onClick={() => onChangeView(AppView.NOTES)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === AppView.NOTES ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <List className="w-4 h-4" />
            All Notes
          </button>
          
          <button 
            onClick={() => onChangeView(AppView.AGENT)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === AppView.AGENT ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Bot className="w-4 h-4" />
            Agent Chat
          </button>

          <button 
            onClick={() => onChangeView(AppView.GRAPH)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === AppView.GRAPH ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Network className="w-4 h-4" />
            Memory Graph
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clusters</h2>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-360px)]">
           <button
              onClick={() => onSelectCluster(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeClusterId === null && currentView === AppView.NOTES 
                ? 'text-indigo-400 bg-indigo-400/10' 
                : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Everything
            </button>
          {clusters.map(cluster => (
            <button
              key={cluster.id}
              onClick={() => {
                onChangeView(AppView.NOTES);
                onSelectCluster(cluster.id);
              }}
              className={`w-full text-left truncate px-3 py-2 rounded-lg text-sm transition-colors ${
                activeClusterId === cluster.id && currentView === AppView.NOTES 
                  ? 'text-indigo-400 bg-indigo-400/10' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              # {cluster.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-slate-800">
        <button
          onClick={onOrganize}
          disabled={isOrganizing}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20"
        >
          {isOrganizing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LayoutGrid className="w-4 h-4" />
          )}
          {isOrganizing ? 'Organizing...' : 'Organize My Notes'}
        </button>
      </div>
    </div>
  );
};