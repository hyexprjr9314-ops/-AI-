/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  AgentPersona,
  UserProfile,
  AgentMemoryItem,
  KnowledgeDocument,
  UserGoal,
  DailyRoutine,
  ChatSession,
  ChatMessage,
} from './types';
import { Storage } from './lib/storage';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { MemoryVaultView } from './components/MemoryVaultView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { GoalsRoutineView } from './components/GoalsRoutineView';
import { PersonaSettingsModal } from './components/PersonaSettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { DailyBriefingModal } from './components/DailyBriefingModal';
import { DossierModal } from './components/DossierModal';
import { FileStudioModal } from './components/FileStudioModal';
import { HanyangOfficeWorkspace } from './components/HanyangOfficeWorkspace';
import { NasExplorerView } from './components/NasExplorerView';
import confetti from 'canvas-confetti';

export default function App() {
  // State Initialization from Storage
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [userProfile, setUserProfile] = useState<UserProfile>(() => Storage.getUserProfile());
  const [activePersona, setActivePersona] = useState<AgentPersona>(() => Storage.getActivePersona());
  const [memories, setMemories] = useState<AgentMemoryItem[]>(() => Storage.getMemories());
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>(() => Storage.getKnowledgeDocs());
  const [goals, setGoals] = useState<UserGoal[]>(() => Storage.getGoals());
  const [routines, setRoutines] = useState<DailyRoutine[]>(() => Storage.getRoutines());
  const [sessions, setSessions] = useState<ChatSession[]>(() => Storage.getSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => Storage.getActiveSessionId());

  // Modal Visibility States
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isFileStudioModalOpen, setIsFileStudioModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExtractingMemories, setIsExtractingMemories] = useState(false);

  // Sync to Storage on changes
  useEffect(() => {
    Storage.setUserProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    Storage.setActivePersona(activePersona);
  }, [activePersona]);

  useEffect(() => {
    Storage.setMemories(memories);
  }, [memories]);

  useEffect(() => {
    Storage.setKnowledgeDocs(knowledgeDocs);
  }, [knowledgeDocs]);

  useEffect(() => {
    Storage.setGoals(goals);
  }, [goals]);

  useEffect(() => {
    Storage.setRoutines(routines);
  }, [routines]);

  useEffect(() => {
    Storage.setSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    Storage.setActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  // Current Active Chat Session
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ||
    sessions[0] || {
      id: 'session-default',
      title: '새로운 대화',
      createdAt: new Date().toISOString(),
      messages: [],
    };

  // Helper to parse discovered memories from agent output
  const extractMemoryTags = (rawText: string) => {
    const memoryRegex = /\[MEMORY_DISCOVERED:\s*([^\|]+)\|\s*([^\]]+)\]/g;
    const discovered: { category: string; content: string }[] = [];
    let match;
    while ((match = memoryRegex.exec(rawText)) !== null) {
      discovered.push({
        category: match[1].trim().toLowerCase(),
        content: match[2].trim(),
      });
    }
    const cleanedText = rawText.replace(memoryRegex, '').trim();
    return { cleanedText, discovered };
  };

  // Send Message Handler with Streaming SSE
  const handleSendMessage = async (userContent: string) => {
    if (!userContent.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...activeSession.messages, userMessage];

    // Update session immediately with user message
    const updatedSessionsWithUser = sessions.map((s) =>
      s.id === activeSession.id ? { ...s, messages: updatedMessages } : s
    );
    setSessions(updatedSessionsWithUser);
    setIsStreaming(true);

    const assistantMsgId = `msg-assistant-${Date.now()}`;
    let accumulatedContent = '';

    // Create empty assistant placeholder
    const placeholderAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setSessions(
      sessions.map((s) =>
        s.id === activeSession.id
          ? { ...s, messages: [...updatedMessages, placeholderAssistantMessage] }
          : s
      )
    );

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          persona: activePersona,
          userProfile,
          memories,
          knowledgeDocs,
          goals,
        }),
      });

      if (!response.ok) {
        let errMessage = `서버 응답 오류 (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) {
            errMessage = typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
          }
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) {
        throw new Error('Response body is null');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulatedContent += data.text;
                // Live update assistant message
                setSessions((prevSessions) =>
                  prevSessions.map((s) =>
                    s.id === activeSession.id
                      ? {
                          ...s,
                          messages: s.messages.map((m) =>
                            m.id === assistantMsgId
                              ? { ...m, content: accumulatedContent }
                              : m
                          ),
                        }
                      : s
                  )
                );
              }
              if (data.done) {
                break;
              }
            } catch {
              // Non-JSON or partial chunk, continue
            }
          }
        }
      }

      // Check for discovered memories in final text
      const { cleanedText, discovered } = extractMemoryTags(accumulatedContent);

      if (discovered.length > 0) {
        discovered.forEach((disc) => {
          handleSaveDiscoveredMemory(disc.category, disc.content);
        });
      }

      // Finalize message
      setSessions((prevSessions) =>
        prevSessions.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: cleanedText || accumulatedContent,
                        discoveredMemories: discovered,
                        isStreaming: false,
                      }
                    : m
                ),
              }
            : s
        )
      );
    } catch (err: any) {
      console.error('Streaming error:', err);
      setSessions((prevSessions) =>
        prevSessions.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: `죄송합니다. 응답 생성 중 오류가 발생했습니다: ${err.message || '네트워크 오류'}`,
                        isStreaming: false,
                      }
                    : m
                ),
              }
            : s
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Clear current chat
  const handleClearChat = () => {
    const initialAssistantMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `대화가 새로 시작되었습니다. **${userProfile.name}**님, 오늘 어떤 이야기를 나눌까요?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setSessions(
      sessions.map((s) =>
        s.id === activeSession.id ? { ...s, messages: [initialAssistantMsg] } : s
      )
    );
  };

  // Memory Actions
  const handleAddMemory = (memory: Omit<AgentMemoryItem, 'id' | 'createdAt'>) => {
    const newMem: AgentMemoryItem = {
      ...memory,
      id: `mem-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setMemories([newMem, ...memories]);
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(memories.filter((m) => m.id !== id));
  };

  const handleSaveDiscoveredMemory = (category: string, content: string) => {
    const validCat = (
      ['preference', 'fact', 'goal', 'project', 'habit', 'insight'].includes(category)
        ? category
        : 'fact'
    ) as AgentMemoryItem['category'];

    const newMem: AgentMemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      category: validCat,
      content,
      createdAt: new Date().toISOString().split('T')[0],
      importance: 'high',
      source: 'auto_extracted',
    };

    setMemories((prev) => [newMem, ...prev]);
  };

  // Extract from recent chat on demand
  const handleExtractFromRecentChat = async () => {
    setIsExtractingMemories(true);
    try {
      const res = await fetch('/api/agent/extract-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: activeSession.messages,
          userProfile,
          existingMemories: memories,
        }),
      });

      if (!res.ok) throw new Error('추출 실패');
      const data = await res.json();
      if (data.memories && data.memories.length > 0) {
        const newItems: AgentMemoryItem[] = data.memories.map((m: any, idx: number) => ({
          id: `mem-${Date.now()}-${idx}`,
          category: m.category || 'fact',
          content: m.content,
          createdAt: new Date().toISOString().split('T')[0],
          importance: m.importance || 'medium',
          source: 'auto_extracted',
        }));

        setMemories((prev) => [...newItems, ...prev]);
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtractingMemories(false);
    }
  };

  // Knowledge Doc Actions
  const handleAddDocument = (doc: Omit<KnowledgeDocument, 'id' | 'updatedAt'>) => {
    const newDoc: KnowledgeDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setKnowledgeDocs([newDoc, ...knowledgeDocs]);
  };

  const handleUpdateDocument = (updatedDoc: KnowledgeDocument) => {
    setKnowledgeDocs(knowledgeDocs.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
  };

  const handleDeleteDocument = (id: string) => {
    setKnowledgeDocs(knowledgeDocs.filter((d) => d.id !== id));
  };

  // Goal & Routine Actions
  const handleAskAgentAboutGoal = (goal: UserGoal) => {
    setActiveTab('chat');
    handleSendMessage(
      `현재 집중하고 있는 목표 「${goal.title}」(달성률: ${goal.progress}%)에 대해 전략적 조언과 다음 단계 피드백을 줘.`
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-blue-500/30 selection:text-white font-sans antialiased relative overflow-x-hidden">
      {/* Subtle modern ambient background gradient */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.08),rgba(0,0,0,0))]" />

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePersona={activePersona}
        userProfile={userProfile}
        onOpenPersonaModal={() => setIsPersonaModalOpen(true)}
        onOpenUserProfileModal={() => setIsUserProfileModalOpen(true)}
        onOpenBriefingModal={() => setIsBriefingModalOpen(true)}
        onOpenDossierModal={() => setIsDossierModalOpen(true)}
        onOpenFileStudio={() => setIsFileStudioModalOpen(true)}
        memoryCount={memories.length}
      />

      {/* Main Tab View */}
      <main className="relative z-10 flex-1">
        {activeTab === 'chat' && (
          <ChatView
            activePersona={activePersona}
            userProfile={userProfile}
            memories={memories}
            knowledgeDocs={knowledgeDocs}
            goals={goals}
            messages={activeSession.messages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            isStreaming={isStreaming}
            onOpenPersonaModal={() => setIsPersonaModalOpen(true)}
            onOpenMemoryModal={() => setActiveTab('memory')}
            onOpenKnowledgeModal={() => setActiveTab('knowledge')}
            onOpenFileStudio={() => setIsFileStudioModalOpen(true)}
            onSaveDiscoveredMemory={handleSaveDiscoveredMemory}
          />
        )}

        {activeTab === 'hanyang_office' && (
          <HanyangOfficeWorkspace
            onAskAgent={(prompt) => handleSendMessage(prompt)}
            onNavigateToChat={() => setActiveTab('chat')}
            onNavigateToNas={() => setActiveTab('nas_explorer')}
          />
        )}

        {activeTab === 'nas_explorer' && (
          <NasExplorerView
            onAskAgent={(prompt) => handleSendMessage(prompt)}
            onNavigateToChat={() => setActiveTab('chat')}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryVaultView
            memories={memories}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
            onExtractFromRecentChat={handleExtractFromRecentChat}
            isExtracting={isExtractingMemories}
            userProfile={userProfile}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseView
            documents={knowledgeDocs}
            onAddDocument={handleAddDocument}
            onUpdateDocument={handleUpdateDocument}
            onDeleteDocument={handleDeleteDocument}
            userProfile={userProfile}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsRoutineView
            goals={goals}
            routines={routines}
            onUpdateGoals={setGoals}
            onUpdateRoutines={setRoutines}
            userProfile={userProfile}
            activePersona={activePersona}
            onAskAgentAboutGoal={handleAskAgentAboutGoal}
          />
        )}

        {activeTab === 'dossier' && (
          <div className="mx-auto max-w-4xl p-4 sm:p-8">
            <button
              onClick={() => setIsDossierModalOpen(true)}
              className="group w-full border border-white/15 bg-white/[0.02] p-10 text-center transition-all duration-300 hover:border-white/50 hover:bg-white/[0.05]"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-white/20 bg-white/5 text-white/80 mb-5 font-serif text-2xl italic group-hover:scale-105 transition-transform">
                05
              </div>
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40 block mb-2">
                Cognitive Intelligence Dossier
              </span>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {activePersona.name}가 분석한 {userProfile.name}님의 지능 보고서
              </h2>
              <p className="mt-3 text-xs text-white/60 max-w-lg mx-auto leading-relaxed">
                에이전트가 축적한 기억, 목표, 루틴 데이터를 총동원해 나만의 인지 패턴, 강점 분석, 우선순위 맵 및 맞춤 성장 전략을 심층 리포트로 열람합니다.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 border border-white/40 bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-black transition-all hover:bg-white/90">
                지능 보고서 열기
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <PersonaSettingsModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        activePersona={activePersona}
        onSavePersona={setActivePersona}
        userProfile={userProfile}
      />

      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        userProfile={userProfile}
        onSaveProfile={setUserProfile}
      />

      <DailyBriefingModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        activePersona={activePersona}
        userProfile={userProfile}
        memories={memories}
        goals={goals}
        routines={routines}
      />

      <DossierModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        activePersona={activePersona}
        userProfile={userProfile}
        memories={memories}
        knowledgeDocs={knowledgeDocs}
        goals={goals}
      />

      <FileStudioModal
        isOpen={isFileStudioModalOpen}
        onClose={() => setIsFileStudioModalOpen(false)}
        activePersona={activePersona}
        userProfile={userProfile}
        memories={memories}
        knowledgeDocs={knowledgeDocs}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
