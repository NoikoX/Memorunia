import { Note } from './types';

export const DEMO_NOTES: Omit<Note, 'embedding'>[] = [
  // Technology & Programming (6 notes)
  {
    id: 'demo-1',
    title: 'React Hooks Study',
    content: 'useEffect runs after render. Dependency array controls when it re-runs. Empty array = mount only. No array = every render. useMemo caches values, useCallback caches functions.',
    createdAt: Date.now() - 10000000,
  },
  {
    id: 'demo-5',
    title: 'TypeScript Generics',
    content: 'Generics allow reusable components. const identity = <T>(arg: T): T => arg. Used often in API response types.',
    createdAt: Date.now() - 12000000,
  },
  {
    id: 'demo-7',
    title: 'Git Commands',
    content: 'git rebase -i HEAD~3 (interactive rebase). git stash apply. git cherry-pick <commit>. git reset --soft HEAD~1 (undo commit keep changes).',
    createdAt: Date.now() - 15000000,
  },
  {
    id: 'demo-8',
    title: 'Docker Basics',
    content: 'docker-compose up -d starts containers in detached mode. Use volumes for persistence. docker exec -it <container> bash for shell access. Always use .dockerignore.',
    createdAt: Date.now() - 9000000,
  },
  {
    id: 'demo-9',
    title: 'API Design Best Practices',
    content: 'Use RESTful conventions: GET for read, POST for create, PUT/PATCH for update, DELETE for remove. Version your API (/v1/). Always paginate list endpoints. Return proper status codes.',
    createdAt: Date.now() - 11000000,
  },
  {
    id: 'demo-10',
    title: 'Python Async/Await',
    content: 'async def declares coroutine. await pauses execution until promise resolves. asyncio.gather() runs multiple coroutines concurrently. Use for I/O-bound operations.',
    createdAt: Date.now() - 13000000,
  },

  // Food & Cooking (6 notes)
  {
    id: 'demo-2',
    title: 'Grocery List',
    content: 'Buy: Milk, Eggs, Sourdough bread, Avocados, Hot sauce, Coffee beans (light roast).',
    createdAt: Date.now() - 5000000,
  },
  {
    id: 'demo-11',
    title: 'Perfect Scrambled Eggs Recipe',
    content: 'Whisk 3 eggs with splash of milk. Low heat, constant stirring. Add butter. Remove from heat when slightly runny - they continue cooking. Salt at the end.',
    createdAt: Date.now() - 6000000,
  },
  {
    id: 'demo-12',
    title: 'Meal Prep Ideas',
    content: 'Sunday prep: Chicken breast batch cook, rice portions, roasted veggies (broccoli, carrots, bell peppers). Overnight oats for breakfast. Keeps 4-5 days.',
    createdAt: Date.now() - 3000000,
  },
  {
    id: 'demo-13',
    title: 'Homemade Pizza Dough',
    content: '500g flour, 325ml warm water, 7g yeast, 10g salt, 15ml olive oil. Knead 10 min. Rise 2 hours. Makes 2 pizzas. Freeze extra dough.',
    createdAt: Date.now() - 7000000,
  },
  {
    id: 'demo-14',
    title: 'Coffee Brewing Notes',
    content: 'Pour over ratio: 1:16 (15g coffee to 240ml water). Water temp 195-205°F. Bloom 30 sec. Total brew time 3-4 min. Grind size like sea salt.',
    createdAt: Date.now() - 4000000,
  },
  {
    id: 'demo-15',
    title: 'Restaurant Recommendations',
    content: 'Try: Pasta Palace (amazing carbonara), Sushi Zen (omakase on Fridays), Taco Libre (al pastor tacos), Green Bowl (vegan poke).',
    createdAt: Date.now() - 2500000,
  },

  // Entertainment & Media (6 notes)
  {
    id: 'demo-6',
    title: 'Movie Watchlist',
    content: 'To watch: Dune Part Two, Everything Everywhere All At Once, The Matrix (rewatch), Interstellar.',
    createdAt: Date.now() - 100000,
  },
  {
    id: 'demo-16',
    title: 'TV Shows Binge List',
    content: 'Currently watching: The Bear S3, Shogun, True Detective S4. Queue: Severance, The Last of Us, Dark (German series).',
    createdAt: Date.now() - 150000,
  },
  {
    id: 'demo-17',
    title: 'Book Reading List',
    content: 'Reading: Project Hail Mary by Andy Weir. Next up: Tomorrow and Tomorrow and Tomorrow, The Three-Body Problem, Atomic Habits.',
    createdAt: Date.now() - 8500000,
  },
  {
    id: 'demo-18',
    title: 'Podcast Subscriptions',
    content: 'Favorites: Lex Fridman, Hardcore History, Syntax.fm (web dev), How I Built This, Darknet Diaries (cybersecurity stories).',
    createdAt: Date.now() - 9500000,
  },
  {
    id: 'demo-19',
    title: 'Video Game Backlog',
    content: 'Playing: Baldur\'s Gate 3. Backlog: Elden Ring DLC, Hades 2, Hollow Knight, The Witness. Maybe finally finish Witcher 3.',
    createdAt: Date.now() - 200000,
  },
  {
    id: 'demo-20',
    title: 'Music Discoveries',
    content: 'New artists: Khruangbin (psychedelic funk), Phoebe Bridgers (indie), Anderson .Paak. Album on repeat: Swimming by Mac Miller.',
    createdAt: Date.now() - 300000,
  },

  // Work & Projects (6 notes)
  {
    id: 'demo-4',
    title: 'Meeting Notes: Q3 Roadmap',
    content: 'Focus on performance optimization. Reduce bundle size by 20%. Launch dark mode by October. Hire 2 more frontend devs.',
    createdAt: Date.now() - 2000000,
  },
  {
    id: 'demo-3',
    title: 'Project Idea: AI Plant Waterer',
    content: 'Use Raspberry Pi + moisture sensor. If dry -> trigger pump. Add camera to detect leaf health using Gemini Vision API. Send alerts via Telegram bot.',
    createdAt: Date.now() - 8000000,
  },
  {
    id: 'demo-21',
    title: 'Sprint Planning: Dashboard Redesign',
    content: 'User stories: New analytics widgets, export to PDF, mobile responsive layout. Estimate: 3 sprints. Need designer input on color palette.',
    createdAt: Date.now() - 1800000,
  },
  {
    id: 'demo-22',
    title: 'Side Project: Chrome Extension',
    content: 'Build tab manager extension. Features: Group tabs by domain, save sessions, keyboard shortcuts. Use Chrome Storage API. Manifest V3.',
    createdAt: Date.now() - 6500000,
  },
  {
    id: 'demo-23',
    title: 'Freelance Client: Logo Design',
    content: 'Client wants minimalist logo for coffee shop. Mood: earthy, warm, artisanal. Deliverables: SVG, PNG (transparent), 3 color variations. Due: Next Friday.',
    createdAt: Date.now() - 4500000,
  },
  {
    id: 'demo-24',
    title: 'Performance Review Prep',
    content: 'Accomplishments: Shipped payment integration, reduced API latency 40%, mentored 2 junior devs. Goals: Learn system design, lead a feature team.',
    createdAt: Date.now() - 3500000,
  },

  // Health & Fitness (6 notes)
  {
    id: 'demo-25',
    title: 'Workout Routine',
    content: 'Push day: Bench press 4x8, Overhead press 3x10, Tricep dips 3x12. Pull day: Deadlifts 4x6, Pull-ups 3x8, Rows 3x10. Legs: Squats 4x8, Lunges 3x12.',
    createdAt: Date.now() - 5500000,
  },
  {
    id: 'demo-26',
    title: 'Running Progress',
    content: '5K PR: 24:38. Current weekly mileage: 25 miles. Goal: Sub-23 min 5K by December. Long run Sundays, tempo Wednesdays, easy pace other days.',
    createdAt: Date.now() - 1200000,
  },
  {
    id: 'demo-27',
    title: 'Sleep Optimization',
    content: 'Target: 7.5-8 hours. No screens 1 hour before bed. Room temp 68°F. Magnesium supplement helps. Morning sunlight exposure within 30 min of waking.',
    createdAt: Date.now() - 7500000,
  },
  {
    id: 'demo-28',
    title: 'Meditation Practice',
    content: 'Daily 10-min session using Headspace. Focus on breath. Notice thoughts without judgment. Trying body scan technique. Consistency > duration.',
    createdAt: Date.now() - 600000,
  },
  {
    id: 'demo-29',
    title: 'Supplement Stack',
    content: 'Morning: Vitamin D3 5000 IU, Omega-3 fish oil, Creatine 5g. Evening: Magnesium glycinate 400mg, Zinc 25mg. Post-workout: Whey protein.',
    createdAt: Date.now() - 10500000,
  },
  {
    id: 'demo-30',
    title: 'Injury Prevention Notes',
    content: 'Warm up properly: 5-10 min cardio + dynamic stretching. Foam roll IT band and calves. Strengthen glutes to prevent knee pain. Listen to body - rest when needed.',
    createdAt: Date.now() - 14000000,
  },
];

export const SYSTEM_INSTRUCTION_RAG = `
You are Memorunia, a personal knowledge assistant.
Answer the user's question STRICTLY based on the provided Context Notes.
If the answer is not in the notes, state that clearly.
Do not make up information.
Cite your sources by referring to the note titles if relevant.
Format with markdown. Keep it concise and helpful.
`;
