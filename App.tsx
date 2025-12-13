import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Send, Plus, Upload, Search, Volume2, X, FileText, Loader2, 
  BrainCircuit, Database, MessageSquare, Edit3, Bot, Terminal, 
  Check, Play, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI, Content } from "@google/genai";

import { Note, Cluster, ChatMessage, AppView, SearchResult, ToolCallLog, ToolResultLog } from './types';
import { DEMO_NOTES } from './constants';
import { 
  generateEmbedding, 
  cosineSimilarity, 
  generateAnswer, 
  generateClusters, 
  editNoteContent,
  generateSpeech,
  AGENT_TOOLS,
  AGENT_SYSTEM_INSTRUCTION
} from './services/gemini';
import { base64ToUint8Array, decodeAudioData } from './utils/audio';

import { Sidebar } from './components/Sidebar';
import { NoteCard } from './components/NoteCard';
import { GraphView } from './components/GraphView';
import { NoteModal } from './components/NoteModal';

const App: React.FC = () => {
  // --- State ---
  const [notes, setNotes] = useState<Note[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [query, setQuery] = useState('');
  
  // 1. Hardcoded Greeting Initial State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([{
    id: 'init-greeting',
    role: 'assistant',
    content: "Hi there! I'm your creative note agent. I can help you find info, organize your thoughts, or even write new notes for you (like recipes or plans). What can I do for you today?"
  }]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<AppView>(AppView.NOTES);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Note Modal State
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [modalInitialEditMode, setModalInitialEditMode] = useState(false);
  const [isCreatingNewNote, setIsCreatingNewNote] = useState(false);

  // Note Input State
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionTranscript, setRecognitionTranscript] = useState('');

  // Agent State
  // We need a ref for notes because the Agent loop runs async and needs current state access
  const notesRef = useRef<Note[]>(notes); 
  const chatHistoryRef = useRef<ChatMessage[]>(chatHistory);

  // Refs
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const savedNotes = localStorage.getItem('memograph_notes');
    const savedClusters = localStorage.getItem('memograph_clusters');
    if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        setNotes(parsed);
        notesRef.current = parsed;
    }
    if (savedClusters) setClusters(JSON.parse(savedClusters));

    // Speech Setup
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true; 
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setRecognitionTranscript(final || interim);
      };

      recognition.onerror = (e: any) => { console.error("Speech error", e); setIsListening(false); };
      recognition.onend = () => { if (isListening) setIsListening(false); };
      recognitionRef.current = recognition;
    }
  }, []);

  // Sync Refs and LocalStorage
  useEffect(() => {
    localStorage.setItem('memograph_notes', JSON.stringify(notes));
    notesRef.current = notes;
  }, [notes]);
  
  useEffect(() => {
    localStorage.setItem('memograph_clusters', JSON.stringify(clusters));
  }, [clusters]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    chatHistoryRef.current = chatHistory;
  }, [chatHistory, isProcessing, view]);

  useEffect(() => {
    if (recognitionTranscript) {
      if (inputMode === 'voice') setNewNoteContent(recognitionTranscript);
      else setQuery(recognitionTranscript);
    }
  }, [recognitionTranscript, inputMode]);

  // --- Handlers ---

  const handleLoadDemo = async () => {
    setIsProcessing(true);
    setNotes([]); 
    const notesWithEmbeddings: Note[] = [];
    for (const raw of DEMO_NOTES) {
      const textToEmbed = `Title: ${raw.title}\nContent: ${raw.content}`;
      const embedding = await generateEmbedding(textToEmbed);
      notesWithEmbeddings.push({ ...raw, embedding });
    }
    setNotes(notesWithEmbeddings);
    setIsProcessing(false);
  };

  const handleAddNote = async (contentOverride?: string, titleOverride?: string) => {
    const textToUse = contentOverride || newNoteContent;
    const titleToUse = titleOverride || newNoteTitle;
    
    if (!textToUse.trim() && !titleToUse.trim()) return;

    // 2. Instant Voice Off logic
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setRecognitionTranscript('');
    }

    setIsProcessing(true);
    // Use provided title, or generate from content, or use "Untitled Note"
    const title = titleToUse.trim() || (textToUse.trim() ? textToUse.split(' ').slice(0, 5).join(' ') + '...' : 'Untitled Note');
    const content = textToUse.trim() || '';
    const textToEmbed = `Title: ${title}\nContent: ${content}`;
    const embedding = await generateEmbedding(textToEmbed);
    
    const newNote: Note = {
      id: uuidv4(),
      title,
      content,
      createdAt: Date.now(),
      embedding
    };

    setNotes(prev => [newNote, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsProcessing(false);
  };

  const handleUpdateNote = async (updatedNote: Note) => {
    setIsProcessing(true);
    const existingIndex = notes.findIndex(n => n.id === updatedNote.id);
    const isNew = existingIndex === -1;
    
    const textToEmbed = `Title: ${updatedNote.title}\nContent: ${updatedNote.content}`;
    const embedding = await generateEmbedding(textToEmbed);
    
    const finalNote = { ...updatedNote, id: isNew ? uuidv4() : updatedNote.id, embedding };
    
    if (isNew) setNotes(prev => [finalNote, ...prev]);
    else setNotes(prev => prev.map(n => n.id === finalNote.id ? finalNote : n));
    
    setSelectedNote(null);
    setIsCreatingNewNote(false);
    setIsProcessing(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setIsCreatingNewNote(false);
    }
  };

  const toggleListening = (mode: 'voice' | 'search') => {
    if (!recognitionRef.current) return alert("Speech not supported");
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (mode === 'voice') setNewNoteContent(recognitionTranscript);
      else setQuery(recognitionTranscript);
      setRecognitionTranscript('');
    } else {
      setRecognitionTranscript('');
      if (mode === 'voice') setInputMode('voice');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // --- AGENT LOGIC (The Core Upgrade) ---

  const executeTool = async (name: string, args: any): Promise<any> => {
    console.log(`Executing tool: ${name}`, args);
    const currentNotes = notesRef.current;

    switch (name) {
      case 'createNote': {
        const { title, content } = args;
        const id = uuidv4();
        const embedding = await generateEmbedding(`Title: ${title}\nContent: ${content}`);
        const newNote: Note = { id, title, content, createdAt: Date.now(), embedding, isGenerated: true };
        setNotes(prev => [newNote, ...prev]);
        return { success: true, noteId: id, message: "Note created successfully." };
      }
      
      case 'updateNote': {
        const { noteId, title, content } = args;
        const target = currentNotes.find(n => n.id === noteId);
        if (!target) return { error: "Note not found." };
        
        const updated = { ...target, ...args }; // merge changes
        // Re-embed if content/title changed
        if (title || content) {
          updated.embedding = await generateEmbedding(`Title: ${updated.title}\nContent: ${updated.content}`);
        }
        setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
        return { success: true, message: "Note updated." };
      }

      case 'deleteNote': {
        const { noteId } = args;
        const target = currentNotes.find(n => n.id === noteId);
        if (!target) return { error: "Note not found." };
        setNotes(prev => prev.filter(n => n.id !== noteId));
        return { success: true, message: `Note '${target.title}' deleted.` };
      }

      case 'searchNotes': {
        const { query } = args;
        const queryEmb = await generateEmbedding(query);
        const results = currentNotes.map(n => ({
          id: n.id,
          title: n.title,
          snippet: n.content.slice(0, 150),
          score: n.embedding ? cosineSimilarity(queryEmb, n.embedding) : 0
        })).sort((a, b) => b.score - a.score).filter(n => n.score > 0.05).slice(0, 5); // Return top 5
        
        // Add relevance information to help agent decide which notes to use
        const relevantResults = results.filter(r => r.score > 0.3);
        return { 
          results,
          message: relevantResults.length > 0 
            ? `Found ${results.length} notes. ${relevantResults.length} are highly relevant (score > 0.3). Use these note IDs with 'ragAnswer' for best results.`
            : `Found ${results.length} notes, but none are highly relevant. Consider refining your search query.`
        };
      }

      case 'ragAnswer': {
        const { query, candidateNoteIds } = args;
        const candidates = currentNotes.filter(n => candidateNoteIds.includes(n.id));
        
        // Calculate relevance scores for each candidate note
        const queryEmb = await generateEmbedding(query);
        const relevanceScores = new Map<string, number>();
        
        for (const note of candidates) {
          if (note.embedding) {
            const score = cosineSimilarity(queryEmb, note.embedding);
            relevanceScores.set(note.id, score);
          }
        }
        
        // Only pass notes with meaningful relevance (score > 0.3)
        const relevantCandidates = candidates.filter(n => {
          const score = relevanceScores.get(n.id) || 0;
          return score > 0.3;
        });
        
        // If no relevant candidates, return early with a helpful message
        if (relevantCandidates.length === 0) {
          return {
            answer: "I couldn't find any relevant notes to answer your question. The notes you referenced don't seem to contain information related to your query. Try searching for more relevant notes first.",
            usedNoteIds: []
          };
        }
        
        return await generateAnswer(query, relevantCandidates, relevanceScores);
      }

      case 'clusterNotes': {
        const newClusters = await generateClusters(currentNotes);
        setClusters(newClusters);
        return { success: true, clusters: newClusters.map(c => c.name) };
      }

      case 'openNote': {
        const { noteId } = args;
        const target = currentNotes.find(n => n.id === noteId);
        if (target) {
          setSelectedNote(target);
          return { success: true, message: "Note opened in UI." };
        }
        return { error: "Note not found" };
      }

      case 'summarizeNote': {
        const { noteId } = args;
        const target = currentNotes.find(n => n.id === noteId);
        if (!target) return { error: "Note not found" };
        const summary = await editNoteContent(target.content, "Summarize this in 2 sentences.");
        return { summary };
      }

      case 'rewriteNote': {
        const { noteId, instruction } = args;
        const target = currentNotes.find(n => n.id === noteId);
        if (!target) return { error: "Note not found" };
        const newText = await editNoteContent(target.content, instruction);
        const updated = { ...target, content: newText };
        updated.embedding = await generateEmbedding(`Title: ${updated.title}\nContent: ${newText}`);
        setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
        return { success: true, message: "Note rewritten and saved." };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  };

  const handleAgentMessage = async (userText: string) => {
    if (!userText.trim()) return;
    
    // 2. Instant Voice Off Logic for Agent
    if (isListening) {
       recognitionRef.current?.stop();
       setIsListening(false);
       setRecognitionTranscript('');
    }

    setIsProcessing(true);
    // Ensure we are in agent view
    if (view !== AppView.AGENT) setView(AppView.AGENT);

    // 1. Add User Message
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: userText };
    setChatHistory(prev => [...prev, userMsg]);
    setQuery('');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Build history for the API
    const apiHistory: Content[] = chatHistoryRef.current.map(m => {
       if (m.role === 'user') return { role: 'user', parts: [{ text: m.content || '' }] };
       return { role: 'model', parts: [{ text: m.content || '' }] };
    });
    
    // Start Turn
    let currentTurnMessages: Content[] = [...apiHistory, { role: 'user', parts: [{ text: userText }] }];
    
    try {
      let turnFinished = false;
      let loopCount = 0;
      let sourceNoteIds: string[] | undefined; // Track source note IDs from ragAnswer calls

      while (!turnFinished && loopCount < 5) {
        loopCount++;
        
        // Call Gemini
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: currentTurnMessages,
          config: {
            tools: AGENT_TOOLS,
            systemInstruction: AGENT_SYSTEM_INSTRUCTION
          }
        });

        const fc = response.functionCalls;
        const modelText = response.text;

        // If simple text response
        if (modelText && (!fc || fc.length === 0)) {
           const agentMsg: ChatMessage = { 
             id: uuidv4(), 
             role: 'assistant', 
             content: modelText,
             sourceNoteIds: sourceNoteIds // Attach source note IDs if available
           };
           setChatHistory(prev => [...prev, agentMsg]);
           turnFinished = true;
        } 
        // If function calls
        else if (fc && fc.length > 0) {
           const toolLogMsg: ChatMessage = {
             id: uuidv4(),
             role: 'assistant',
             toolCalls: fc.map(c => ({ id: uuidv4(), name: c.name, args: c.args }))
           };
           setChatHistory(prev => [...prev, toolLogMsg]);
           
           const responses = [];
           const resultsLog: ToolResultLog[] = [];

           for (const call of fc) {
             const result = await executeTool(call.name, call.args);
             resultsLog.push({ id: uuidv4(), name: call.name, result });
             
             // Track source note IDs from ragAnswer (takes priority)
             if (call.name === 'ragAnswer' && result?.usedNoteIds) {
               sourceNoteIds = result.usedNoteIds;
             }
             // If searchNotes was called and no ragAnswer, use search results as sources
             else if (call.name === 'searchNotes' && result?.results && !sourceNoteIds) {
               // Only use highly relevant results (score > 0.3) as sources
               const highRelevanceNoteIds = result.results
                 .filter((r: any) => r.score > 0.3)
                 .map((r: any) => r.id);
               if (highRelevanceNoteIds.length > 0) {
                 sourceNoteIds = highRelevanceNoteIds;
               }
             }
             
             responses.push({
                name: call.name,
                response: { result: result }
             });
           }

           // Log results in UI
           setChatHistory(prev => prev.map(m => m.id === toolLogMsg.id ? { ...m, toolResults: resultsLog } : m));

           // Feed back to model
           currentTurnMessages.push({ role: 'model', parts: fc.map(c => ({ functionCall: c })) });
           currentTurnMessages.push({ role: 'function', parts: responses.map(r => ({ functionResponse: r })) });
        }
      }
      
      // After the loop, if we have a final text response, check if we need to add source note IDs
      // This will be handled when the final message is created

    } catch (e) {
      console.error("Agent Loop Error", e);
      setChatHistory(prev => [...prev, { id: uuidv4(), role: 'assistant', content: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTTS = async (text: string, messageId: string) => {
    setChatHistory(prev => prev.map(m => m.id === messageId ? {...m, isAudioPlaying: true} : m));
    const base64Audio = await generateSpeech(text);
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), audioContext);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      source.onended = () => {
          setChatHistory(prev => prev.map(m => m.id === messageId ? {...m, isAudioPlaying: false} : m));
      };
    }
  };

  // --- Render Sections ---

  const renderAgentChat = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {chatHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full p-8 text-center min-h-[400px]">
             {/* Loading state or initial mounting */}
             <Loader2 className="w-8 h-8 animate-spin text-indigo-200" />
          </div>
        ) : (
          <>
            {chatHistory.map((msg) => {
              // System/Tool Log Rendering
              if (msg.toolCalls) {
                return (
                  <div key={msg.id} className="flex justify-start w-full">
                    <div className="bg-slate-100 rounded-xl p-3 max-w-2xl w-full border border-slate-200 text-xs font-mono">
                      <div className="flex items-center gap-2 text-slate-500 mb-2 border-b border-slate-200 pb-2">
                        <Terminal className="w-3 h-3" />
                        <span className="font-bold uppercase tracking-wider">Action Log</span>
                      </div>
                      <div className="space-y-3">
                        {msg.toolCalls.map((call, idx) => (
                          <div key={idx}>
                              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                {call.name}
                              </div>
                              <div className="pl-4 text-slate-500 truncate">{JSON.stringify(call.args)}</div>
                              
                              {msg.toolResults && msg.toolResults[idx] && (
                                <div className="pl-4 mt-1 text-emerald-600 flex items-start gap-1">
                                    <Check className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span className="break-all">{JSON.stringify(msg.toolResults[idx].result).slice(0, 200)}...</span>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl rounded-2xl p-5 shadow-sm ${
                    msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>
                        {msg.content || ''}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Sources Section - Always show if sourceNoteIds exist */}
                    {msg.role === 'assistant' && msg.sourceNoteIds && msg.sourceNoteIds.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-sm font-semibold text-slate-700">Sources</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sourceNoteIds.map(noteId => {
                            const note = notes.find(n => n.id === noteId);
                            if (!note) return null;
                            return (
                              <button
                                key={noteId}
                                onClick={() => {
                                  setSelectedNote(note);
                                  setIsCreatingNewNote(false);
                                  setModalInitialEditMode(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors border border-indigo-200 hover:border-indigo-300 shadow-sm hover:shadow"
                              >
                                <FileText className="w-3 h-3" />
                                {note.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {msg.role === 'assistant' && (
                      <div className="mt-3 flex gap-2">
                          <button 
                            onClick={() => handleTTS(msg.content || '', msg.id)}
                            className={`p-1.5 rounded-full hover:bg-slate-100 ${msg.isAudioPlaying ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Invisble spacer for auto-scroll */}
            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </div>

      {/* Sticky Bottom Agent Input */}
      <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
           <div className="relative flex-1">
             <input 
               type="text"
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                    e.preventDefault();
                    // Instant Send on Enter even if listening
                    const textToSend = isListening ? recognitionTranscript : query;
                    handleAgentMessage(textToSend);
                 }
               }}
               disabled={isProcessing}
               placeholder={isListening ? "Listening..." : "Message Agent..."}
               className={`w-full pl-4 pr-12 py-3.5 rounded-xl border focus:outline-none focus:ring-2 transition-all shadow-sm ${
                   isListening ? 'border-red-400 ring-2 ring-red-100 bg-red-50' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50'
               }`}
             />
             <button 
              onClick={() => toggleListening('search')}
              disabled={isProcessing}
              className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
              }`}
             >
               <Mic className="w-5 h-5" />
             </button>
           </div>
           <button 
             onClick={() => {
                const textToSend = isListening ? recognitionTranscript : query;
                handleAgentMessage(textToSend);
             }}
             disabled={(!query.trim() && !isListening) || isProcessing}
             className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
           >
             {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <ArrowUp className="w-5 h-5" />}
           </button>
        </div>
      </div>
    </div>
  );

  const renderNotesOrGraph = () => {
    // Logic for filtering and sorting
    const filtered = activeClusterId 
        ? notes.filter(n => clusters.find(c => c.id === activeClusterId)?.noteIds.includes(n.id))
        : notes;
    
    const sorted = [...filtered].sort((a, b) => {
        return sortOrder === 'newest' 
          ? b.createdAt - a.createdAt 
          : a.createdAt - b.createdAt;
    });

    return (
    <>
      {/* Top Bar (Only for Search in Notes View) */}
      <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="relative flex-1">
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAgentMessage(query)}
                placeholder="Search notes (or switch to Agent Chat for actions)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
            </div>
            {/* Sort Toggle */}
            <button 
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
              title={sortOrder === 'newest' ? "Newest First" : "Oldest First"}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-5xl mx-auto pb-24 h-full flex flex-col">
          {view === AppView.GRAPH && (
            <div className="h-full w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
              <GraphView 
                  notes={notes} 
                  clusters={clusters} 
                  onNodeClick={(id) => {
                    const n = notes.find(x => x.id === id);
                    if (n) { 
                      setSelectedNote(n); 
                      setIsCreatingNewNote(false);
                      setModalInitialEditMode(false); 
                    }
                  }} 
              />
            </div>
          )}
          {view === AppView.NOTES && (
            <>
              {notes.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BrainCircuit className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Memorunia</h2>
                  <p className="text-slate-500 mb-6">Start by adding a note or load the demo.</p>
                  <div className="flex items-center justify-center gap-3">
                    <button 
                      onClick={() => { 
                        setSelectedNote(null); 
                        setIsCreatingNewNote(true);
                        setModalInitialEditMode(true); 
                      }}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Create Note
                    </button>
                    <button onClick={handleLoadDemo} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                      <Database className="w-4 h-4 inline mr-2" />
                      Load Demo Data
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <button 
                      onClick={() => { 
                        setSelectedNote(null); 
                        setIsCreatingNewNote(true);
                        setModalInitialEditMode(true); 
                      }}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      New Note
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sorted.map(note => (
                    <NoteCard 
                      key={note.id} 
                      note={note} 
                      onClick={() => { 
                        setSelectedNote(note); 
                        setIsCreatingNewNote(false);
                        setModalInitialEditMode(false); 
                      }}
                      onDelete={handleDeleteNote}
                    />
                  ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Bar: Add Note (Only in Notes/Graph View) */}
      <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-lg flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note title (optional)..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium h-8 py-1 px-2 text-slate-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const content = isListening && inputMode === 'voice' ? recognitionTranscript : newNoteContent;
                    handleAddNote(content, newNoteTitle);
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2 p-2">
              <div className="flex-1">
                <textarea 
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder={inputMode === 'voice' && isListening ? "Listening..." : "Type note content..."}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none h-10 py-2 px-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      const content = isListening && inputMode === 'voice' ? recognitionTranscript : newNoteContent;
                      handleAddNote(content, newNoteTitle);
                    }
                  }}
                />
              </div>
              <button 
                onClick={() => {
                    setInputMode('voice');
                    toggleListening('voice');
                }}
                className={`p-2 rounded-full transition-all ${
                    isListening && inputMode === 'voice'
                    ? 'bg-red-500 text-white shadow-md animate-pulse'
                    : 'text-slate-400 hover:bg-slate-200'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                multiple 
                accept=".txt,.md" 
                className="hidden" 
                onChange={async (e) => {
                   if (!e.target.files || e.target.files.length === 0) return;
                   
                   setIsProcessing(true);
                   const files = Array.from(e.target.files);
                   
                   for (const file of files) {
                     try {
                       const text = await file.text();
                       if (text.trim()) {
                         // Use filename (without extension) as title, or first line if it looks like a title
                         const fileName = file.name.replace(/\.(txt|md)$/i, '');
                         const lines = text.split('\n');
                         const firstLine = lines[0]?.trim() || '';
                         // If first line is short and looks like a title, use it; otherwise use filename
                         const title = (firstLine.length < 60 && firstLine.length > 0) 
                           ? firstLine 
                           : fileName || 'Imported Note';
                         const content = (firstLine.length < 60 && firstLine === title) 
                           ? lines.slice(1).join('\n').trim() || text.trim()
                           : text.trim();
                         
                         const textToEmbed = `Title: ${title}\nContent: ${content}`;
                         const embedding = await generateEmbedding(textToEmbed);
                         
                         const newNote: Note = {
                           id: uuidv4(),
                           title,
                           content,
                           createdAt: Date.now(),
                           embedding
                         };
                         
                         setNotes(prev => [newNote, ...prev]);
                       }
                     } catch (error) {
                       console.error(`Error reading file ${file.name}:`, error);
                       alert(`Failed to read file: ${file.name}`);
                     }
                   }
                   
                   // Reset file input
                   e.target.value = '';
                   setIsProcessing(false);
                }}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <Upload className="w-5 h-5" />
              </button>
              
              <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>

              <button 
                onClick={() => {
                    const content = isListening && inputMode === 'voice' ? recognitionTranscript : newNoteContent;
                    handleAddNote(content, newNoteTitle);
                }}
                disabled={(!newNoteContent.trim() && !newNoteTitle.trim() && !isListening) || isProcessing}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>
      </div>
    </>
  );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar 
        clusters={clusters} 
        activeClusterId={activeClusterId}
        onSelectCluster={setActiveClusterId}
        onOrganize={() => handleAgentMessage("Cluster my notes")}
        isOrganizing={isProcessing}
        currentView={view}
        onChangeView={setView}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {view === AppView.AGENT ? renderAgentChat() : renderNotesOrGraph()}
        
        {(selectedNote !== null || isCreatingNewNote) && (
          <NoteModal 
            note={selectedNote} 
            allNotes={notes}
            onClose={() => {
              setSelectedNote(null);
              setIsCreatingNewNote(false);
            }} 
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
            initialEditMode={modalInitialEditMode}
            onOpenNote={(note) => {
              setSelectedNote(note);
              setIsCreatingNewNote(false);
              setModalInitialEditMode(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;