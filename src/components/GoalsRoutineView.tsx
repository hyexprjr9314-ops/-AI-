import React, { useState } from 'react';
import {
  Target,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Flame,
  Clock,
  TrendingUp,
  MessageSquare,
  Loader2,
  Calendar,
} from 'lucide-react';
import { UserGoal, DailyRoutine, UserProfile, AgentPersona } from '../types';
import confetti from 'canvas-confetti';

interface GoalsRoutineViewProps {
  goals: UserGoal[];
  routines: DailyRoutine[];
  onUpdateGoals: (goals: UserGoal[]) => void;
  onUpdateRoutines: (routines: DailyRoutine[]) => void;
  userProfile: UserProfile;
  activePersona: AgentPersona;
  onAskAgentAboutGoal: (goal: UserGoal) => void;
}

export const GoalsRoutineView: React.FC<GoalsRoutineViewProps> = ({
  goals,
  routines,
  onUpdateGoals,
  onUpdateRoutines,
  userProfile,
  activePersona,
  onAskAgentAboutGoal,
}) => {
  const [activeTab, setActiveTab] = useState<'goals' | 'routines'>('goals');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isAddingRoutine, setIsAddingRoutine] = useState(false);

  // New goal state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<UserGoal['category']>('career');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalMilestones, setNewGoalMilestones] = useState('');

  // New routine state
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineTime, setNewRoutineTime] = useState<DailyRoutine['timeOfDay']>('morning');

  // Milestone toggle
  const handleToggleMilestone = (goalId: string, milestoneId: string) => {
    const updatedGoals = goals.map((g) => {
      if (g.id === goalId) {
        const updatedMilestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, done: !m.done } : m
        );
        const doneCount = updatedMilestones.filter((m) => m.done).length;
        const total = updatedMilestones.length;
        const newProgress = total > 0 ? Math.round((doneCount / total) * 100) : g.progress;

        if (newProgress === 100 && g.progress < 100) {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }

        return {
          ...g,
          milestones: updatedMilestones,
          progress: newProgress,
        };
      }
      return g;
    });
    onUpdateGoals(updatedGoals);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const milestonesList = newGoalMilestones
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => ({ id: `m-${Date.now()}-${idx}`, text, done: false }));

    const newGoal: UserGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      deadline: newGoalDeadline || undefined,
      progress: 0,
      milestones: milestonesList.length > 0 ? milestonesList : [{ id: `m-${Date.now()}`, text: '첫 단계 완료하기', done: false }],
    };

    onUpdateGoals([...goals, newGoal]);
    setNewGoalTitle('');
    setNewGoalDeadline('');
    setNewGoalMilestones('');
    setIsAddingGoal(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    onUpdateGoals(goals.filter((g) => g.id !== goalId));
  };

  // Routine toggle
  const handleToggleRoutine = (routineId: string) => {
    const updatedRoutines = routines.map((r) => {
      if (r.id === routineId) {
        const nextCompleted = !r.completed;
        const nextStreak = nextCompleted ? r.streak + 1 : Math.max(0, r.streak - 1);
        if (nextCompleted) {
          confetti({ particleCount: 40, spread: 45, origin: { y: 0.8 } });
        }
        return {
          ...r,
          completed: nextCompleted,
          streak: nextStreak,
        };
      }
      return r;
    });
    onUpdateRoutines(updatedRoutines);
  };

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;

    const newRoutine: DailyRoutine = {
      id: `rt-${Date.now()}`,
      title: newRoutineTitle.trim(),
      timeOfDay: newRoutineTime,
      completed: false,
      streak: 0,
    };

    onUpdateRoutines([...routines, newRoutine]);
    setNewRoutineTitle('');
    setIsAddingRoutine(false);
  };

  const handleDeleteRoutine = (routineId: string) => {
    onUpdateRoutines(routines.filter((r) => r.id !== routineId));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/20 bg-white/5 font-serif text-lg italic text-white/90">
            04
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 block">
              Execution Architecture
            </span>
            <h1 className="font-serif text-xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>목표 & 데일리 루틴 허브</span>
              <span className="border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/80">
                {goals.length} GOALS / {routines.length} ROUTINES
              </span>
            </h1>
            <p className="mt-1 text-xs text-white/60 leading-relaxed max-w-2xl">
              <strong>{userProfile.name}</strong>님이 세운 목표와 일상 루틴을 체계적으로 관리하고,
              에이전트 <strong>{activePersona.name}</strong>가 매일 달성을 독려하고 맞춤 전략을 제안합니다.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border border-white/15 bg-black/60 p-1">
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-semibold transition ${
              activeTab === 'goals'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            핵심 목표 ({goals.length})
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-semibold transition ${
              activeTab === 'routines'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            데일리 루틴 ({routines.length})
          </button>
        </div>
      </div>

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-serif text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-white/70" />
              <span>진행 중인 나의 목표 (Strategic Goals)</span>
            </h2>
            <button
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="flex items-center gap-1.5 border border-white/40 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 transition"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>새 목표 설정</span>
            </button>
          </div>

          {/* Add Goal Form */}
          {isAddingGoal && (
            <form
              onSubmit={handleCreateGoal}
              className="border border-white/20 bg-black/80 p-5 shadow-2xl space-y-4 animate-in fade-in"
            >
              <h3 className="font-serif text-sm font-bold text-white">새로운 핵심 목표 설정</h3>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">목표명</label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="예: 나만의 AI 에이전트 서비스 MVP 완성"
                  className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">분야</label>
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value as UserGoal['category'])}
                    className="w-full border border-white/15 bg-black/90 px-3 py-2 text-xs text-white/90 focus:border-white/50 focus:outline-none"
                  >
                    <option value="career">커리어 & 프로젝트 (Career)</option>
                    <option value="health">건강 & 운동 (Health)</option>
                    <option value="learning">학습 & 독서 (Learning)</option>
                    <option value="life">라이프스타일 & 웰빙 (Life)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">목표 기한 (선택)</label>
                  <input
                    type="date"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                    className="w-full border border-white/15 bg-black/90 px-3 py-2 text-xs text-white/90 focus:border-white/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">
                  세부 마일스톤 (한 줄에 하나씩 입력)
                </label>
                <textarea
                  rows={3}
                  value={newGoalMilestones}
                  onChange={(e) => setNewGoalMilestones(e.target.value)}
                  placeholder="1단계 기획 및 설계 완료&#10;2단계 핵심 기능 구현&#10;3단계 배포 및 테스트"
                  className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="px-3.5 py-1.5 text-xs text-white/50 hover:text-white transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!newGoalTitle.trim()}
                  className="border border-white/40 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 disabled:opacity-30 transition"
                >
                  목표 등록
                </button>
              </div>
            </form>
          )}

          {/* Goals Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="flex flex-col justify-between border border-white/10 bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/70">
                        {goal.category.toUpperCase()}
                      </span>
                      <h3 className="mt-2 font-serif text-base font-bold text-white">{goal.title}</h3>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-white/30 hover:text-white transition"
                      title="목표 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-white/50 mb-1.5 font-mono">
                      <span>PROGRESS</span>
                      <span className="font-bold text-white">{goal.progress}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden bg-white/10">
                      <div
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestones Checklist */}
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[10px] font-mono tracking-wider uppercase text-white/40">Milestones</span>
                    {goal.milestones.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMilestone(goal.id, m.id)}
                        className="group flex cursor-pointer items-center gap-2.5 border border-white/10 bg-black/40 p-2 text-xs transition hover:border-white/30"
                      >
                        {m.done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-white" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-white" />
                        )}
                        <span
                          className={`line-clamp-1 ${
                            m.done ? 'text-white/40 line-through' : 'text-white/80'
                          }`}
                        >
                          {m.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Agent Advice */}
                  {goal.agentAdvice && (
                    <div className="mt-4 border border-white/15 bg-black/60 p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-serif italic text-white/90 mb-1">
                        <Sparkles className="h-3 w-3 text-white/60" />
                        <span>{activePersona.name}의 코칭 제언</span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">{goal.agentAdvice}</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
                  {goal.deadline && (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-white/40">
                      <Calendar className="h-3 w-3 text-white/30" />
                      <span>{goal.deadline}</span>
                    </span>
                  )}
                  <button
                    onClick={() => onAskAgentAboutGoal(goal)}
                    className="flex items-center gap-1.5 border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/80 transition hover:border-white/40 hover:text-white ml-auto"
                  >
                    <MessageSquare className="h-3 w-3 text-white/60" />
                    <span>에이전트와 전략 대화</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routines Tab */}
      {activeTab === 'routines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-serif text-base font-bold text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-white/70" />
              <span>오늘의 데일리 루틴 실천 (Daily Rituals)</span>
            </h2>
            <button
              onClick={() => setIsAddingRoutine(!isAddingRoutine)}
              className="flex items-center gap-1.5 border border-white/40 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 transition"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>새 루틴 추가</span>
            </button>
          </div>

          {/* Add Routine Form */}
          {isAddingRoutine && (
            <form
              onSubmit={handleCreateRoutine}
              className="border border-white/20 bg-black/80 p-5 shadow-2xl space-y-4 animate-in fade-in"
            >
              <h3 className="font-serif text-sm font-bold text-white">새 루틴 등록</h3>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">루틴 이름</label>
                <input
                  type="text"
                  value={newRoutineTitle}
                  onChange={(e) => setNewRoutineTitle(e.target.value)}
                  placeholder="예: 기상 직후 10분 스트레칭"
                  className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">시간대</label>
                <select
                  value={newRoutineTime}
                  onChange={(e) => setNewRoutineTime(e.target.value as DailyRoutine['timeOfDay'])}
                  className="w-full border border-white/15 bg-black/90 px-3 py-2 text-xs text-white/90 focus:border-white/50 focus:outline-none"
                >
                  <option value="morning">🌅 아침 루틴 (Morning)</option>
                  <option value="afternoon">☀️ 낮 & 몰입 루틴 (Afternoon)</option>
                  <option value="evening">🌙 저녁 & 회고 루틴 (Evening)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddingRoutine(false)}
                  className="px-3.5 py-1.5 text-xs text-white/50 hover:text-white transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!newRoutineTitle.trim()}
                  className="border border-white/40 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 disabled:opacity-30 transition"
                >
                  저장하기
                </button>
              </div>
            </form>
          )}

          {/* Routines List Grouped by Time */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(['morning', 'afternoon', 'evening'] as const).map((time) => {
              const timeRoutines = routines.filter((r) => r.timeOfDay === time);
              const label =
                time === 'morning'
                  ? '🌅 Morning Ritual'
                  : time === 'afternoon'
                  ? '☀️ Focus Ritual'
                  : '🌙 Evening Review';

              return (
                <div
                  key={time}
                  className="flex flex-col justify-between border border-white/10 bg-white/[0.02] p-4"
                >
                  <div>
                    <h3 className="font-serif text-xs font-bold tracking-wider text-white/80 mb-3 uppercase">{label}</h3>
                    {timeRoutines.length === 0 ? (
                      <p className="text-[11px] text-white/30 italic py-4 text-center font-serif">등록된 루틴이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {timeRoutines.map((routine) => (
                          <div
                            key={routine.id}
                            className={`group flex items-center justify-between border p-3 transition-all duration-200 ${
                              routine.completed
                                ? 'border-white/30 bg-white/[0.08]'
                                : 'border-white/10 bg-black/40 hover:border-white/25'
                            }`}
                          >
                            <div
                              onClick={() => handleToggleRoutine(routine.id)}
                              className="flex cursor-pointer items-center gap-2.5 flex-1 pr-2"
                            >
                              {routine.completed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-white" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-white" />
                              )}
                              <span
                                className={`text-xs ${
                                  routine.completed
                                    ? 'text-white/40 line-through'
                                    : 'text-white/80 font-normal'
                                }`}
                              >
                                {routine.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {routine.streak > 0 && (
                                <span className="flex items-center gap-0.5 border border-white/15 bg-white/5 px-1.5 py-0.2 font-mono text-[9px] text-white/80">
                                  <Flame className="h-2.5 w-2.5 text-white/60" />
                                  <span>{routine.streak}D</span>
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteRoutine(routine.id)}
                                className="text-white/30 opacity-0 group-hover:opacity-100 hover:text-white transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
