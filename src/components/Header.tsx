import React from 'react';
import {
  MessageSquare,
  Brain,
  BookOpen,
  Target,
  FileText,
  Sparkles,
  User,
  SunMedium,
  FileSpreadsheet,
  Building2,
  HardDrive,
} from 'lucide-react';
import { ActiveTab, AgentPersona, UserProfile } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activePersona: AgentPersona;
  userProfile: UserProfile;
  onOpenPersonaModal: () => void;
  onOpenUserProfileModal: () => void;
  onOpenBriefingModal: () => void;
  onOpenDossierModal: () => void;
  onOpenFileStudio: () => void;
  memoryCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activePersona,
  userProfile,
  onOpenPersonaModal,
  onOpenUserProfileModal,
  onOpenBriefingModal,
  onOpenDossierModal,
  onOpenFileStudio,
  memoryCount,
}) => {
  const tabs = [
    { id: 'chat' as ActiveTab, label: '대화', icon: MessageSquare },
    { id: 'hanyang_office' as ActiveTab, label: '한양 총무대장', icon: Building2, highlight: true },
    { id: 'nas_explorer' as ActiveTab, label: 'NAS 문서검색', icon: HardDrive },
    { id: 'memory' as ActiveTab, label: '기억 보관소', icon: Brain, badge: memoryCount },
    { id: 'knowledge' as ActiveTab, label: '지식 베이스', icon: BookOpen },
    { id: 'goals' as ActiveTab, label: '목표 & 루틴', icon: Target },
    { id: 'dossier' as ActiveTab, label: '지능 리포트', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Left: Agent & User Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPersonaModal}
            className="group flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3.5 py-1.5 text-left transition hover:border-blue-500/60 hover:bg-slate-800"
            title="에이전트 페르소나 설정 변경"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-sm transition-transform group-hover:scale-105">
              {activePersona.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  {activePersona.name}
                </span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="block text-xs text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
                {activePersona.role}
              </span>
            </div>
          </button>

          {/* User profile tag */}
          <button
            onClick={onOpenUserProfileModal}
            className="hidden items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white md:flex"
            title="내 프로필 정보 수정"
          >
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-200">{userProfile.name}</span>
          </button>
        </div>

        {/* Center: Clean Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions: File Studio, Daily Briefing */}
        <div className="flex items-center gap-2">
          {/* File Studio button */}
          <button
            onClick={onOpenFileStudio}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-900/60 hover:border-emerald-400 shadow-sm"
            title="엑셀/워드 파일 생성 스튜디오"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">문서·엑셀 생성</span>
            <span className="sm:hidden">문서</span>
          </button>

          {/* Quick Morning Briefing button */}
          <button
            onClick={onOpenBriefingModal}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-900/50 hover:border-amber-400"
          >
            <SunMedium className="h-3.5 w-3.5 text-amber-300" />
            <span className="hidden sm:inline">데일리 브리핑</span>
            <span className="sm:hidden">브리핑</span>
          </button>

          {/* Quick User Dossier button */}
          <button
            onClick={onOpenDossierModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
            title="에이전트가 분석한 나에 대한 지능 보고서"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline text-xs">지능 분석</span>
          </button>
        </div>
      </div>

      {/* Mobile sub-navigation bar */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-800 bg-slate-900 px-3 py-1.5 gap-1.5 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[9px] text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
