import { GoogleGenAI, Modality, Type, FunctionDeclaration, Tool } from "@google/genai";
import { Note, Cluster } from '../types';
import { SYSTEM_INSTRUCTION_RAG } from '../constants';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Utilities ---

const cleanJsonString = (str: string): string => {
  return str.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
};

// --- Agent Tools Definition ---

export const AGENT_TOOLS: Tool[] = [{
  functionDeclarations: [
    {
      name: 'createNote',
      description: 'Create a new note with a title and content. Returns the new Note ID.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Title of the note' },
          content: { type: Type.STRING, description: 'The body content of the note' },
        },
        required: ['title', 'content']
      }
    },
    {
      name: 'updateNote',
      description: 'Update an existing note. Only provide fields that need changing.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          noteId: { type: Type.STRING, description: 'The ID of the note to update' },
          title: { type: Type.STRING, description: 'New title (optional)' },
          content: { type: Type.STRING, description: 'New content (optional)' },
        },
        required: ['noteId']
      }
    },
    {
      name: 'deleteNote',
      description: 'Delete a note by ID. REQUIRE EXPLICIT USER CONFIRMATION BEFORE CALLING THIS.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          noteId: { type: Type.STRING, description: 'The ID of the note to delete' },
        },
        required: ['noteId']
      }
    },
    {
      name: 'searchNotes',
      description: 'Search for notes semantically using embeddings. Returns only highly relevant notes (score > 0.4) or top 3 most relevant. When reporting results, only count notes with score > 0.45 as "related" or "relevant" to the query. Notes with lower scores should not be mentioned as related.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'The search query' },
        },
        required: ['query']
      }
    },
    {
      name: 'ragAnswer',
      description: 'Answer a specific question using a provided list of note IDs as context.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'The user question' },
          candidateNoteIds: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: 'List of Note IDs to use as source material'
          },
        },
        required: ['query', 'candidateNoteIds']
      }
    },
    {
      name: 'clusterNotes',
      description: 'Re-organize all notes into semantic clusters.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          k: { type: Type.NUMBER, description: 'Approximate number of clusters (default 5)' }
        }
      }
    },
    {
      name: 'openNote',
      description: 'Open a specific note in the UI for the user to see.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          noteId: { type: Type.STRING, description: 'The ID of the note to open' }
        },
        required: ['noteId']
      }
    },
    {
      name: 'summarizeNote',
      description: 'Generate a summary for a specific note.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          noteId: { type: Type.STRING, description: 'The ID of the note to summarize' }
        },
        required: ['noteId']
      }
    },
    {
      name: 'rewriteNote',
      description: 'Rewrite or improve a note based on an instruction (e.g. "fix grammar", "make concise").',
      parameters: {
        type: Type.OBJECT,
        properties: {
          noteId: { type: Type.STRING, description: 'The ID of the note to rewrite' },
          instruction: { type: Type.STRING, description: 'What to do (e.g. "make it professional")' }
        },
        required: ['noteId', 'instruction']
      }
    },
    {
      name: 'createCalendarEvent',
      description: 'Create a calendar event in the user\'s Google Calendar using natural language. The text parameter should include the event details like "Meeting with John tomorrow at 2pm" or "Dentist appointment on March 15 at 10am".',
      parameters: {
        type: Type.OBJECT,
        properties: {
          text: { 
            type: Type.STRING, 
            description: 'Natural language description of the event including date/time. Example: "Team meeting tomorrow at 3pm" or "Doctor appointment on March 20 at 2:30pm"' 
          }
        },
        required: ['text']
      }
    }
  ]
}];

export const AGENT_SYSTEM_INSTRUCTION = `
You are Memorunia, an intelligent and creative knowledge assistant.
You manage the user's personal notes.

Capabilities:
1. You can Create, Update, Delete, Search, and Organize notes using tools.
2. You can Answer questions based on notes using 'ragAnswer'.

Rules:
- **Content Generation**: If the user asks to create a note about a topic (e.g., "Create a note with a Shawarma recipe") but does NOT provide the exact text, **YOU MUST GENERATE** high-quality, detailed content for that topic using your own knowledge, and then call 'createNote' with that generated content. Do not ask the user to provide the text if they asked you to create the note about a known topic.
- ALWAYS 'searchNotes' first if you need to find a note to Update, Delete, or Answer from.
- **Answering Questions**: When answering questions:
  1. First use 'searchNotes' to find relevant notes
  2. The search results will only include highly relevant notes (score > 0.4)
  3. When reporting how many notes you found, ONLY count notes that are truly relevant (the search tool will indicate this)
  4. Then use 'ragAnswer' with the note IDs from search results
  5. The 'ragAnswer' tool will automatically filter to only highly relevant notes
  6. Always cite sources in your response, but ONLY cite notes that were actually used and are truly relevant
- Ambiguity: If 'searchNotes' returns multiple similar results, ASK the user to clarify which one they mean.
- Safety: BEFORE calling 'deleteNote', you MUST ask the user for confirmation (e.g., "Are you sure you want to delete 'Grocery List'?"). Only proceed if they say "yes".
- Privacy: Do not invent information when answering questions *about existing notes*. If a note isn't found, say so.
- **Calendar Events**: When the user asks to create a calendar event, reminder, or schedule something, use 'createCalendarEvent' with natural language text that includes the event description and date/time. Example: "Team meeting tomorrow at 3pm" or "Doctor appointment on March 20 at 2:30pm".
- Be concise, friendly, and helpful.
`;

// --- Embeddings ---

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: { parts: [{ text }] },
    });
    // @ts-ignore - The property name is embeddings in the installed version despite type definition mismatch in some environments
    return response.embeddings?.[0]?.values || [];
  } catch (e) {
    console.error("Embedding error:", e);
    return [];
  }
};

export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// --- RAG Helper (Used by Agent Tool) ---

export const generateAnswer = async (query: string, contextNotes: Note[], relevanceScores?: Map<string, number>): Promise<{ answer: string, usedNoteIds: string[] }> => {
  const ai = getAI();
  
  // Filter to only highly relevant notes (score > 0.3) if scores provided
  let relevantNotes = contextNotes;
  if (relevanceScores && relevanceScores.size > 0) {
    relevantNotes = contextNotes.filter(n => {
      const score = relevanceScores.get(n.id) || 0;
      return score > 0.3; // Only include notes with meaningful relevance
    });
  }
  
  // If no relevant notes after filtering, return early
  if (relevantNotes.length === 0) {
    return {
      answer: "I couldn't find any relevant notes to answer your question. The available notes don't seem to contain information related to your query.",
      usedNoteIds: []
    };
  }
  
  const contextText = relevantNotes.map(n => {
    const score = relevanceScores?.get(n.id);
    const scoreNote = score !== undefined ? ` [Relevance: ${(score * 100).toFixed(0)}%]` : '';
    return `Title: ${n.title}${scoreNote}\nContent: ${n.content}`;
  }).join("\n\n---\n\n");
  
  const prompt = `
  Question: "${query}"
  
  Context Notes (only use information from these notes):
  ${contextText}
  
  Instructions:
  - Answer the question STRICTLY using only the information from the context notes above.
  - If the context notes don't contain enough information to answer the question, say so clearly.
  - ALWAYS cite your sources at the end of your answer using this format:
    
    **Sources:**
    - [Note Title 1]
    - [Note Title 2]
  
  - Only cite notes that you actually used to answer the question.
  - If you didn't use any notes (because they weren't relevant), don't include a Sources section.
  - Format your answer with markdown for readability.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
    });
    
    // Only return notes with high relevance scores (>= 0.5) or top 3 most relevant
    // This ensures we only show sources that are truly relevant, not just barely above threshold
    let finalUsedNotes = relevantNotes;
    if (relevanceScores && relevanceScores.size > 0) {
      // Filter to only high-relevance notes (>= 0.5)
      const highRelevanceNotes = relevantNotes.filter(n => {
        const score = relevanceScores.get(n.id) || 0;
        return score >= 0.5;
      });
      
      // If we have high relevance notes, use those; otherwise use top 3
      if (highRelevanceNotes.length > 0) {
        finalUsedNotes = highRelevanceNotes;
      } else {
        // Sort by relevance and take top 3
        finalUsedNotes = [...relevantNotes]
          .sort((a, b) => {
            const scoreA = relevanceScores.get(a.id) || 0;
            const scoreB = relevanceScores.get(b.id) || 0;
            return scoreB - scoreA;
          })
          .slice(0, 3);
      }
    }
    
    return {
      answer: response.text || "No answer generated.",
      usedNoteIds: finalUsedNotes.map(n => n.id)
    };
  } catch (e) {
    return { answer: "Error generating answer.", usedNoteIds: [] };
  }
};

// --- Clustering Helper (Used by Agent Tool) ---

export const generateClusters = async (notes: Note[]): Promise<Cluster[]> => {
  if (notes.length === 0) return [];
  const ai = getAI();
  const notesData = notes.map(n => ({ id: n.id, content: `${n.title}: ${n.content.slice(0, 100)}` }));

  const prompt = `Group these notes into clusters. Return JSON: [{ "name": "...", "noteIds": ["..."] }]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [
        { role: 'user', parts: [{ text: JSON.stringify(notesData) }] },
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              noteIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    const cleanText = cleanJsonString(response.text || "[]");
    const rawClusters = JSON.parse(cleanText);
    return rawClusters.map((c: any, idx: number) => ({
      id: `cluster-${idx}-${Date.now()}`,
      name: c.name,
      noteIds: c.noteIds
    }));
  } catch (e) {
    return [];
  }
};

// --- Smart Edit Helper (Used by Agent Tool) ---

export const editNoteContent = async (currentContent: string, instruction: string): Promise<string> => {
  const ai = getAI();
  const prompt = `Rewrite this text based on instruction: "${instruction}"\n\nText:\n${currentContent}`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-lite', contents: prompt });
    return response.text || currentContent;
  } catch (e) {
    return currentContent;
  }
};

// --- TTS ---

export const generateSpeech = async (text: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    return null;
  }
};