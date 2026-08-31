import React, { useState } from 'react';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Tag,
  Sparkles,
  Heart,
  Target,
  Clock,
  Flame,
  CheckCircle2,
  Filter,
  Layers,
  Wand2,
  Loader2,
} from 'lucide-react';
import { AgentMemoryItem, MemoryCategory, UserProfile } from '../types';

interface MemoryVaultViewProps {
  memories: AgentMemoryItem[];
  onAddMemory: (memory: Omit<AgentMemoryItem, 'id' | 'createdAt'>) => void;
  onDeleteMemory: (id: string) => void;
  onExtractFromRecentChat: () => Promise<void>;
  isExtracting: boolean;
  userProfile: UserProfile;
}

export const MemoryVaultView: React.FC<MemoryVaultViewProps> = ({
  memories,
  onAddMemory,
  onDeleteMemory,
  onExtractFromRecentChat,
  isExtracting,
  userProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('fact');
  const [newImportance, setNewImportance] = useState<'high' | 'medium' | 'low'>('medium');

  const categories: { id: string; label: string; icon: any; color: string }[] = [
    { id: 'all', label: '전체 기억', icon: Layers, color: 'text-neutral-300' },
    { id: 'preference', label: '취향 & 선호', icon: Heart, color: 'text-rose-400' },
    { id: 'fact', label: '핵심 사실', icon: CheckCircle2, color: 'text-blue-400' },
    { id: 'goal', label: '목표 & 계획', icon: Target, color: 'text-amber-400' },
    { id: 'project', label: '진행 프로젝트', icon: Sparkles, color: 'text-purple-400' },
    { id: 'habit', label: '루틴 & 습관', icon: Flame, color: 'text-emerald-400' },
    { id: 'insight', label: '인사이트 & 생각', icon: Brain, color: 'text-indigo-400' },
  ];

  const filteredMemories = memories.filter((mem) => {
    const matchesSearch = mem.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || mem.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddMemory({
      category: newCategory,
      content: newContent.trim(),
      importance: newImportance,
      source: 'manual',
    });
    setNewContent('');
    setIsAdding(false);
  };

  const getCategoryInfo = (category: MemoryCategory) => {
    return categories.find((c) => c.id === category) || categories[1];
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/20 bg-white/5 font-serif text-lg italic text-white/90">
            02
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 block">
              Cognitive Architecture
            </span>
            <h1 className="font-serif text-xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>장기 기억 저장소 (Memory Vault)</span>
              <span className="border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/80">
                {memories.length} ENTRIES
              </span>
            </h1>
            <p className="mt-1 text-xs text-white/60 leading-relaxed max-w-2xl">
              에이전트가 <strong>{userProfile.name}</strong>님과의 모든 상호작용 및 고유 설정에서 포착한 기억 자산입니다.
              지속적인 지능 모델링을 통해 고도화된 맥락 대화를 형성합니다.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onExtractFromRecentChat}
            disabled={isExtracting}
            className="flex items-center gap-2 border border-white/20 bg-white/[0.04] px-3.5 py-2 text-xs text-white/80 transition-all hover:border-white/50 hover:bg-white/10 hover:text-white disabled:opacity-40"
            title="최근 대화 내용을 분석해 새로운 기억을 자동 추출합니다."
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white/80" />
                <span className="text-[11px] tracking-wider uppercase">추출 중...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5 text-white/60" />
                <span className="text-[11px] tracking-wider uppercase">대화에서 추출</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 border border-white/40 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-black transition hover:bg-white/90 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>기억 기록</span>
          </button>
        </div>
      </div>

      {/* Add Memory Form Accordion */}
      {isAdding && (
        <form
          onSubmit={handleCreateMemory}
          className="border border-white/20 bg-black/80 p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top duration-200"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-white/60" />
              <span>에이전트에게 새로운 기억 알려주기</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-white/40 hover:text-white transition"
            >
              닫기
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">기억할 내용</label>
            <textarea
              rows={2}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="예: 주말에는 아침 7시에 일어나서 가벼운 산책을 나가는 루틴이 있음."
              className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-xs sm:text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">카테고리</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                className="w-full border border-white/15 bg-black/90 px-3 py-2 text-xs text-white/90 focus:border-white/50 focus:outline-none"
              >
                <option value="preference">취향 & 선호 (Preference)</option>
                <option value="fact">핵심 사실 (Fact)</option>
                <option value="goal">목표 & 계획 (Goal)</option>
                <option value="project">진행 프로젝트 (Project)</option>
                <option value="habit">루틴 & 습관 (Habit)</option>
                <option value="insight">인사이트 & 생각 (Insight)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">중요도</label>
              <select
                value={newImportance}
                onChange={(e) => setNewImportance(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full border border-white/15 bg-black/90 px-3 py-2 text-xs text-white/90 focus:border-white/50 focus:outline-none"
              >
                <option value="high">높음 (High - 핵심 맥락)</option>
                <option value="medium">보통 (Medium)</option>
                <option value="low">낮음 (Low - 참고용)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 text-xs text-white/50 hover:text-white transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!newContent.trim()}
              className="border border-white/40 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 disabled:opacity-30 transition"
            >
              저장하기
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="기억 검색하기 (키워드, 취향, 프로젝트)..."
            className="w-full border border-white/10 bg-white/[0.02] pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-white/40 focus:outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs transition border ${
                  isSelected
                    ? 'border-white bg-white/10 text-white font-medium'
                    : 'border-white/10 bg-transparent text-white/40 hover:text-white/80 hover:border-white/20'
                }`}
              >
                <span className="font-mono text-[9px] text-white/40">/</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Memories Grid */}
      {filteredMemories.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/15 bg-white/[0.01] p-12 text-center">
          <Brain className="h-8 w-8 text-white/30 mb-3" />
          <h3 className="font-serif text-sm font-semibold text-white/80">조건에 부합하는 기억이 없습니다</h3>
          <p className="mt-1 text-xs text-white/40">
            {searchQuery ? '다른 키워드로 검색해보세요.' : '에이전트와의 대화를 통해 새로운 기억을 축적해보세요.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredMemories.map((mem) => {
            const cat = getCategoryInfo(mem.category);
            return (
              <div
                key={mem.id}
                className="group relative flex flex-col justify-between border border-white/10 bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-white/80">
                      {cat.label}
                    </span>

                    <div className="flex items-center gap-2">
                      {mem.importance === 'high' && (
                        <span className="border border-white/30 bg-white/10 px-1.5 py-0.2 text-[9px] uppercase tracking-wider text-white font-mono">
                          CORE
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-white/40">{mem.createdAt}</span>
                    </div>
                  </div>

                  <p className="text-xs text-white/80 leading-relaxed font-normal">{mem.content}</p>
                </div>

                <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-white/10">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">
                    {mem.source === 'auto_extracted' ? 'AUTO SYNC' : 'MANUAL ENTRY'}
                  </span>
                  <button
                    onClick={() => onDeleteMemory(mem.id)}
                    className="text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-white"
                    title="기억 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
