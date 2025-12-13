export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  embedding?: number[];
  clusterId?: string;
  isGenerated?: boolean;
}

export interface Cluster {
  id: string;
  name: string;
  noteIds: string[];
}

export interface SearchResult {
  note: Note;
  score: number;
}

export interface ToolCallLog {
  id: string;
  name: string;
  args: any;
}

export interface ToolResultLog {
  id: string;
  name: string;
  result: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  toolCalls?: ToolCallLog[];
  toolResults?: ToolResultLog[];
  isAudioPlaying?: boolean;
}

export enum AppView {
  NOTES = 'NOTES',
  GRAPH = 'GRAPH',
  AGENT = 'AGENT'
}

export interface AudioState {
  isRecording: boolean;
  transcript: string;
}