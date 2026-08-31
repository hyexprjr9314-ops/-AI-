export type HonorificStyle =
  | '존댓말 (다정하고 정중한 어조)'
  | '반말 (친근하고 격없는 친구 어조)'
  | '전문적이고 간결한 보고체'
  | '따뜻한 멘토 스타일';

export interface UserProfile {
  name: string;
  nickname: string;
  role: string;
  interests: string[];
  values: string[];
  currentFocus: string;
  honorificStyle: HonorificStyle;
  customNotes: string;
}

export type MemoryCategory = 'preference' | 'fact' | 'goal' | 'project' | 'habit' | 'insight';

export interface AgentMemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  createdAt: string;
  importance: 'high' | 'medium' | 'low';
  source: 'manual' | 'auto_extracted';
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: 'rules' | 'projects' | 'life' | 'ideas' | 'reference';
  content: string;
  updatedAt: string;
  tags: string[];
}

export interface Milestone {
  id: string;
  text: string;
  done: boolean;
}

export interface UserGoal {
  id: string;
  title: string;
  category: 'career' | 'health' | 'learning' | 'life';
  deadline?: string;
  progress: number; // 0-100
  milestones: Milestone[];
  agentAdvice?: string;
}

export interface DailyRoutine {
  id: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  title: string;
  completed: boolean;
  streak: number;
}

export interface AgentPersona {
  id: string;
  name: string;
  avatarIcon: string;
  accentColor: string; // e.g. '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'
  role: string;
  tagline: string;
  toneOfVoice: string;
  systemPrompt: string;
  temperature: number; // 0-100
  empathyLevel: number; // 0-100
  proactivityLevel: number; // 0-100
  depthLevel: number; // 0-100
  greetingMessage: string;
  suggestedPrompts: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  discoveredMemories?: { category: string; content: string }[];
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export type ActiveTab = 'chat' | 'hanyang_office' | 'nas_explorer' | 'memory' | 'knowledge' | 'goals' | 'dossier';

export interface GAField {
  key: string;
  label: string;
  required?: boolean;
  kind?: 'text' | 'date' | 'money' | 'integer' | 'select';
}

export interface GAModule {
  key: string;
  title: string;
  icon: string;
  description: string;
  fields: GAField[];
}

export interface GARecord {
  id: number;
  company_id: string; // 'HANYANG' | 'CHUNGNAM'
  module: string;
  title: string;
  date: string;
  status: string;
  manager: string;
  deadline?: string;
  note?: string;
  attachment?: string;
  ledger_type?: string; // 'issuance' | 'receipts'
  payroll_type?: string; // 'annual' | 'driver' | 'contract' | 'payroll'
  [key: string]: any;
}

export interface MealPriceItem {
  id: number;
  restaurant: string;
  unit_price: number;
  effective_from: string;
  effective_to?: string;
  status: '사용중' | '종료';
  note?: string;
}

export interface RetroactivePayDetail {
  month: string;
  eligible_days: number;
  month_days: number;
  amount: number;
}

export interface RetroactivePayResult {
  old_annual: number;
  new_annual: number;
  monthly_difference: number;
  total: number;
  start: string;
  end: string;
  details: RetroactivePayDetail[];
}

export interface NasFileItem {
  path: string;
  relative_path: string;
  file_name: string;
  extension: string;
  size_bytes: number;
  modified_at: string;
  category: string;
}
