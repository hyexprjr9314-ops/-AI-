import {
  UserProfile,
  AgentPersona,
  AgentMemoryItem,
  KnowledgeDocument,
  UserGoal,
  DailyRoutine,
  ChatSession,
  GARecord,
  MealPriceItem,
} from '../types';
import {
  DEFAULT_USER_PROFILE,
  PRESET_PERSONAS,
  INITIAL_MEMORIES,
  INITIAL_KNOWLEDGE_DOCS,
  INITIAL_GOALS,
  INITIAL_ROUTINES,
} from '../constants/initialData';
import { INITIAL_GA_RECORDS, INITIAL_MEAL_PRICES } from '../data/hanyangAdminData';

const STORAGE_KEYS = {
  USER_PROFILE: 'my_agent_user_profile_v1',
  ACTIVE_PERSONA: 'my_agent_active_persona_v1',
  CUSTOM_PERSONAS: 'my_agent_custom_personas_v1',
  MEMORIES: 'my_agent_memories_v1',
  KNOWLEDGE_DOCS: 'my_agent_knowledge_docs_v1',
  GOALS: 'my_agent_goals_v1',
  ROUTINES: 'my_agent_routines_v1',
  SESSIONS: 'my_agent_chat_sessions_v1',
  ACTIVE_SESSION_ID: 'my_agent_active_session_id_v1',
  RECORDS: 'hanyang_ga_records_v1',
  MEAL_PRICES: 'hanyang_meal_prices_v1',
};

// ---------------------------------------------------------------------------
// Server sync: localStorage stays the synchronous read cache every component
// already relies on, but every write now also mirrors to the SQLite-backed
// /api/state endpoint (fire-and-forget — a slow/offline network never blocks
// the UI), and hydrateFromServer() pulls the latest state down once on app
// boot so data survives reloads, other browsers, and other devices.
// ---------------------------------------------------------------------------
function pushToServer(key: string, value: unknown): void {
  fetch(`/api/state/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }).catch(() => {
    // Offline or server unavailable — localStorage already has the value,
    // it just won't be mirrored to the shared DB until the next write.
  });
}

export async function hydrateFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) return;
    const state: Record<string, unknown> = await res.json();
    for (const [key, value] of Object.entries(state)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // No server reachable (e.g. static preview) — fall back to whatever is
    // already in localStorage / the built-in defaults.
  }
}

export const Storage = {
  getUserProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  },
  setUserProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    pushToServer(STORAGE_KEYS.USER_PROFILE, profile);
  },

  getActivePersona(): AgentPersona {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_PERSONA);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.id === 'lumen' || !parsed.name || parsed.name.includes('루멘')) {
          return PRESET_PERSONAS[0];
        }
        return parsed;
      }
      return PRESET_PERSONAS[0];
    } catch {
      return PRESET_PERSONAS[0];
    }
  },
  setActivePersona(persona: AgentPersona): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PERSONA, JSON.stringify(persona));
    pushToServer(STORAGE_KEYS.ACTIVE_PERSONA, persona);
  },

  getCustomPersonas(): AgentPersona[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_PERSONAS);
      return data ? JSON.parse(data) : PRESET_PERSONAS;
    } catch {
      return PRESET_PERSONAS;
    }
  },
  setCustomPersonas(personas: AgentPersona[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PERSONAS, JSON.stringify(personas));
    pushToServer(STORAGE_KEYS.CUSTOM_PERSONAS, personas);
  },

  getMemories(): AgentMemoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMORIES);
      return data ? JSON.parse(data) : INITIAL_MEMORIES;
    } catch {
      return INITIAL_MEMORIES;
    }
  },
  setMemories(memories: AgentMemoryItem[]): void {
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
    pushToServer(STORAGE_KEYS.MEMORIES, memories);
  },

  getKnowledgeDocs(): KnowledgeDocument[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_DOCS);
      return data ? JSON.parse(data) : INITIAL_KNOWLEDGE_DOCS;
    } catch {
      return INITIAL_KNOWLEDGE_DOCS;
    }
  },
  setKnowledgeDocs(docs: KnowledgeDocument[]): void {
    localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_DOCS, JSON.stringify(docs));
    pushToServer(STORAGE_KEYS.KNOWLEDGE_DOCS, docs);
  },

  getGoals(): UserGoal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  },
  setGoals(goals: UserGoal[]): void {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    pushToServer(STORAGE_KEYS.GOALS, goals);
  },

  getRoutines(): DailyRoutine[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROUTINES);
      return data ? JSON.parse(data) : INITIAL_ROUTINES;
    } catch {
      return INITIAL_ROUTINES;
    }
  },
  setRoutines(routines: DailyRoutine[]): void {
    localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
    pushToServer(STORAGE_KEYS.ROUTINES, routines);
  },

  getSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (data) {
        return JSON.parse(data);
      }
      // Create initial starter session
      const persona = this.getActivePersona();
      const user = this.getUserProfile();
      const initialSession: ChatSession = {
        id: 'session-default',
        title: '새로운 대화',
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: 'msg-init',
            role: 'assistant',
            content: `안녕하세요, **${user.name}**님. 당신만을 위한 전용 AI 에이전트 **「${persona.name}」**입니다.\n\n${persona.greetingMessage}\n\n*궁금한 점, 고민, 계획하고 계신 아이디어나 프로젝트가 있다면 언제든 편하게 말씀해주세요.*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      };
      return [initialSession];
    } catch {
      return [];
    }
  },
  setSessions(sessions: ChatSession[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    pushToServer(STORAGE_KEYS.SESSIONS, sessions);
  },

  getActiveSessionId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID) || 'session-default';
  },
  setActiveSessionId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, id);
    pushToServer(STORAGE_KEYS.ACTIVE_SESSION_ID, id);
  },

  getRecords(): GARecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      return data ? JSON.parse(data) : INITIAL_GA_RECORDS;
    } catch {
      return INITIAL_GA_RECORDS;
    }
  },
  setRecords(records: GARecord[]): void {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    pushToServer(STORAGE_KEYS.RECORDS, records);
  },

  getMealPrices(): MealPriceItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEAL_PRICES);
      return data ? JSON.parse(data) : INITIAL_MEAL_PRICES;
    } catch {
      return INITIAL_MEAL_PRICES;
    }
  },
  setMealPrices(prices: MealPriceItem[]): void {
    localStorage.setItem(STORAGE_KEYS.MEAL_PRICES, JSON.stringify(prices));
    pushToServer(STORAGE_KEYS.MEAL_PRICES, prices);
  },
};
