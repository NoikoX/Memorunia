import { Note } from './types';

export const DEMO_NOTES: Omit<Note, 'embedding'>[] = [
  {
    id: 'demo-1',
    title: 'React Hooks Study',
    content: 'useEffect runs after render. Dependency array controls when it re-runs. Empty array = mount only. No array = every render. useMemo caches values, useCallback caches functions.',
    createdAt: Date.now() - 10000000,
  },
  {
    id: 'demo-2',
    title: 'Grocery List',
    content: 'Buy: Milk, Eggs, Sourdough bread, Avocados, Hot sauce, Coffee beans (light roast).',
    createdAt: Date.now() - 5000000,
  },
  {
    id: 'demo-3',
    title: 'Project Idea: AI Plant Waterer',
    content: 'Use Raspberry Pi + moisture sensor. If dry -> trigger pump. Add camera to detect leaf health using Gemini Vision API. Send alerts via Telegram bot.',
    createdAt: Date.now() - 8000000,
  },
  {
    id: 'demo-4',
    title: 'Meeting Notes: Q3 Roadmap',
    content: 'Focus on performance optimization. Reduce bundle size by 20%. Launch dark mode by October. Hire 2 more frontend devs.',
    createdAt: Date.now() - 2000000,
  },
  {
    id: 'demo-5',
    title: 'TypeScript Generics',
    content: 'Generics allow reusable components. const identity = <T>(arg: T): T => arg. Used often in API response types.',
    createdAt: Date.now() - 12000000,
  },
  {
    id: 'demo-6',
    title: 'Movie Watchlist',
    content: 'To watch: Dune Part Two, Everything Everywhere All At Once, The Matrix (rewatch), Interstellar.',
    createdAt: Date.now() - 100000,
  },
  {
    id: 'demo-7',
    title: 'Git Commands',
    content: 'git rebase -i HEAD~3 (interactive rebase). git stash apply. git cherry-pick <commit>. git reset --soft HEAD~1 (undo commit keep changes).',
    createdAt: Date.now() - 15000000,
  }
];

export const SYSTEM_INSTRUCTION_RAG = `
You are MemoGraph, a personal knowledge assistant.
Answer the user's question STRICTLY based on the provided Context Notes.
If the answer is not in the notes, state that clearly.
Do not make up information.
Cite your sources by referring to the note titles if relevant.
Format with markdown. Keep it concise and helpful.
`;
