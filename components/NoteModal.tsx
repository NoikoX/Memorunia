import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, Calendar, Edit2, Save, Sparkles, 
  Wand2, ArrowRight, Trash2 
} from 'lucide-react';
import { Note } from '../types';
import { editNoteContent, cosineSimilarity } from '../services/gemini';

interface NoteModalProps {
  note: Note | null;
  allNotes: Note[];
  onClose: () => void;
  onUpdate: (updatedNote: Note) => Promise<void>;
  onDelete: (id: string) => void;
  initialEditMode?: boolean;
}

export const NoteModal: React.FC<NoteModalProps> = ({ note, allNotes, onClose, onUpdate, onDelete, initialEditMode = false }) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);

  // Reset state when note opens
  useEffect(() => {
    if (note) {
      setContent(note.content);
      setTitle(note.title);
      setIsEditing(initialEditMode);
      setAiPrompt('');
      
      // Calculate Related Notes (The "Wow" factor using Embeddings)
      if (note.embedding && allNotes.length > 0) {
        const others = allNotes.filter(n => n.id !== note.id);
        const scored = others.map(n => ({
          note: n,
          score: n.embedding ? cosineSimilarity(note.embedding, n.embedding) : 0
        }));
        // Sort by similarity and take top 3
        const top = scored
          .sort((a, b) => b.score - a.score)
          .filter(s => s.score > 0.65) // Only relevant ones
          .slice(0, 3)
          .map(s => s.note);
        setRelatedNotes(top);
      } else {
        setRelatedNotes([]);
      }
    } else {
      // New note mode
      setContent('');
      setTitle('');
      setIsEditing(true); // Always start in edit mode for new notes
      setAiPrompt('');
      setRelatedNotes([]);
    }
  }, [note, allNotes, initialEditMode]);

  const handleSave = async () => {
    // Validate that at least title or content is provided
    if (!title.trim() && !content.trim()) {
      alert('Please provide at least a title or content for the note.');
      return;
    }
    
    // For new notes (note is null), create a new note object
    const noteToUpdate = note || {
      id: '',
      title: '',
      content: '',
      createdAt: Date.now()
    };
    
    await onUpdate({
      ...noteToUpdate,
      title: title.trim() || "Untitled Note",
      content: content.trim()
    });
    // If it was a new note, close it, otherwise exit edit mode
    if (!note) {
      // New note was created, close modal
      onClose();
    } else {
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (note && window.confirm('Are you sure you want to delete this note?')) {
      onDelete(note.id);
      onClose();
    }
  };
  
  const handleCancel = () => {
    if (!note) {
      // For new notes, just close without saving
      onClose();
    } else {
      // For existing notes, exit edit mode
      setIsEditing(false);
    }
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const newContent = await editNoteContent(content, aiPrompt);
    setContent(newContent);
    setIsGenerating(false);
    setAiPrompt('');
  };

  const handleQuickAction = (action: string) => {
    setAiPrompt(action);
    setIsGenerating(true);
    editNoteContent(content, action).then(res => {
      setContent(res);
      setIsGenerating(false);
    });
  };

  // Allow modal to show even when note is null (for creating new notes)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div className="flex-1 mr-4">
            {isEditing ? (
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title..."
                className="text-2xl font-bold text-slate-800 w-full border-b border-slate-200 focus:border-indigo-500 focus:outline-none bg-white placeholder-slate-300"
                autoFocus
              />
            ) : (
              <h2 className="text-2xl font-bold text-slate-800 leading-tight">{note?.title || 'New Note'}</h2>
            )}
            
            {note && (
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(note.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
                {note.isGenerated && (
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    AI Generated
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                {!note && (
                  <button 
                    onClick={handleCancel}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                title="Edit Note"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            
            {note && (
              <button 
                onClick={handleDelete}
                className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                title="Delete Note"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* AI Toolbar (Only in Edit Mode) */}
        {isEditing && (
          <div className="bg-slate-50 border-b border-slate-100 p-3 flex flex-col gap-3">
             <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mr-2 shrink-0">AI Actions:</span>
                {['Summarize', 'Fix Grammar', 'Make Professional', 'Shorten', 'Make Bullet Points'].map(action => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    disabled={isGenerating}
                    className="shrink-0 px-3 py-1.5 bg-white border border-indigo-100 text-indigo-600 text-xs rounded-full hover:bg-indigo-50 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    {action}
                  </button>
                ))}
             </div>
             <div className="relative">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()}
                  placeholder="Ask AI to modify text (e.g., 'Add a paragraph about pricing')..."
                  className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none bg-white text-slate-800"
                />
                <Wand2 className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400" />
                <button 
                  onClick={handleAiEdit}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="absolute right-2 top-1.5 p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-sm">
               <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-indigo-600 animate-pulse">AI is rewriting...</span>
               </div>
            </div>
          )}
          
          {isEditing ? (
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[400px] resize-none outline-none text-slate-800 font-mono text-sm leading-relaxed p-2 bg-white"
              placeholder="Start typing your note here..."
            />
          ) : (
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer: Related Notes (Only in View Mode) */}
        {!isEditing && relatedNotes.length > 0 && (
          <div className="bg-slate-50 p-6 border-t border-slate-100 shrink-0">
             <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Related Notes</h3>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               {relatedNotes.map(rel => (
                 <div 
                   key={rel.id} 
                   className="bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all group"
                 >
                    <h4 className="font-medium text-slate-800 text-sm truncate group-hover:text-indigo-600 mb-1">{rel.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{rel.content}</p>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};