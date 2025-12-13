import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Trash2, Calendar } from 'lucide-react';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  className?: string;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, className = '', onClick, onDelete }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2 group relative ${className}`}
    >
      {/* Header: Title */}
      <div className="flex justify-between items-start pr-8">
        <h3 className="font-semibold text-slate-800 line-clamp-2">{note.title}</h3>
      </div>
      
      {/* Content */}
      <div className="text-sm text-slate-600 line-clamp-3 prose prose-sm max-w-none mb-2">
        <ReactMarkdown>{note.content}</ReactMarkdown>
      </div>

      {/* Footer: Tags & Date */}
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-50">
        <div className="flex items-center gap-2">
          {note.isGenerated && (
            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded-full">
              AI Generated
            </span>
          )}
        </div>
        
        <span className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
          <Calendar className="w-3 h-3" />
          {new Date(note.createdAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </span>
      </div>

      {/* Delete Button - Absolute Top Right */}
      {onDelete && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="absolute top-3 right-3 p-2 bg-white text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 z-30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Delete Note"
        >
          <Trash2 className="w-4 h-4 pointer-events-none" />
        </button>
      )}
    </div>
  );
};