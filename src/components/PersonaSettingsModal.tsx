import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Zap,
  Sliders,
  RotateCcw,
  Bot,
  Wand2,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { AgentPersona, UserProfile } from '../types';
import { PRESET_PERSONAS } from '../constants/initialData';

interface PersonaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: AgentPersona;
  onSavePersona: (persona: AgentPersona) => void;
  userProfile: UserProfile;
}

export const PersonaSettingsModal: React.FC<PersonaSettingsModalProps> = ({
  isOpen,
  onClose,
  activePersona,
  onSavePersona,
  userProfile,
}) => {
  const [formData, setFormData] = useState<AgentPersona>({ ...activePersona });
  const [activeTab, setActiveTab] = useState<'presets' | 'customize' | 'ai_builder'>('presets');
  
  // AI Builder states
  const [builderConcept, setBuilderConcept] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: AgentPersona) => {
    setFormData({ ...preset });
  };

  const handleSave = () => {
    onSavePersona(formData);
    onClose();
  };

  const handleGenerateCustomPrompt = async () => {
    if (!builderConcept.trim()) return;
    setIsGeneratingPrompt(true);
    setBuilderError(null);

    try {
      const res = await fetch('/api/agent/generate-persona-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: formData.name || '나의 에이전트',
          role: formData.role || '전용 파트너',
          desiredVibe: builderConcept,
          userName: userProfile.name,
        }),
      });

      if (!res.ok) {
        throw new Error('프롬프트 생성 실패');
      }

      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        systemPrompt: data.systemPrompt || prev.systemPrompt,
        greetingMessage: data.greetingMessage || prev.greetingMessage,
        tagline: data.tagline || prev.tagline,
        suggestedPrompts: data.suggestedTopics || prev.suggestedPrompts,
      }));
      setActiveTab('customize');
    } catch (err: any) {
      setBuilderError(err.message || '오류가 발생했습니다.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const accentColors = [
    { label: 'Amber (따뜻한 통찰)', value: '#f59e0b' },
    { label: 'Blue (명료한 실행)', value: '#3b82f6' },
    { label: 'Purple (창의적 영감)', value: '#8b5cf6' },
    { label: 'Rose (공감과 힐링)', value: '#ec4899' },
    { label: 'Emerald (자연스러운 평온)', value: '#10b981' },
    { label: 'Indigo (깊은 철학)', value: '#6366f1' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-white/20 bg-[#0D0D0D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/5 font-serif italic text-lg"
              style={{ color: formData.accentColor }}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 block">Identity Architecture</span>
              <h2 className="font-serif text-lg font-bold text-white">에이전트 페르소나 설정</h2>
              <p className="text-xs text-white/50">나만을 위해 동작할 AI의 정체성, 어조, 사유의 심도를 설계합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-black/40 px-6">
          <button
            onClick={() => setActiveTab('presets')}
            className={`border-b-2 px-4 py-3 text-xs uppercase tracking-wider font-semibold transition ${
              activeTab === 'presets'
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            프리셋 페르소나 선택
          </button>
          <button
            onClick={() => setActiveTab('customize')}
            className={`border-b-2 px-4 py-3 text-xs uppercase tracking-wider font-semibold transition ${
              activeTab === 'customize'
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            정밀 세부 커스터마이징
          </button>
          <button
            onClick={() => setActiveTab('ai_builder')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs uppercase tracking-wider font-semibold transition ${
              activeTab === 'ai_builder'
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            AI 프롬프트 생성기
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRESET_PERSONAS.map((preset) => {
                  const isSelected = formData.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`cursor-pointer border p-4 transition-all duration-200 ${
                        isSelected
                          ? 'border-white bg-white/[0.08] shadow-lg ring-1 ring-white/20'
                          : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 items-center justify-center border border-white/20 bg-white/5 font-serif italic"
                            style={{ color: preset.accentColor }}
                          >
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-serif font-bold text-white text-sm">{preset.name}</h3>
                            <p className="text-[11px] text-white/50">{preset.role}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center bg-white text-black text-xs font-bold">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-white/70 line-clamp-2 leading-relaxed">
                        {preset.tagline}
                      </p>
                      <div className="mt-3 flex items-center gap-2 font-mono text-[9px] text-white/50">
                        <span className="border border-white/10 bg-white/5 px-1.5 py-0.5">공감 {preset.empathyLevel}%</span>
                        <span className="border border-white/10 bg-white/5 px-1.5 py-0.5">적극 {preset.proactivityLevel}%</span>
                        <span className="border border-white/10 bg-white/5 px-1.5 py-0.5">심도 {preset.depthLevel}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border border-white/10 bg-white/[0.02] p-4">
                <h4 className="font-serif text-xs font-bold tracking-wider text-white/80 uppercase">현재 선택된 에이전트 서약</h4>
                <p className="mt-1 text-xs text-white/60 leading-relaxed">{formData.tagline}</p>
                <div className="mt-3 border-t border-white/10 pt-2.5">
                  <h4 className="font-serif text-xs font-bold tracking-wider text-white/80 uppercase">첫 인사말</h4>
                  <p className="mt-1 text-xs text-white/60 font-serif italic">"{formData.greetingMessage}"</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customize' && (
            <div className="space-y-5">
              {/* Basic Identity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">에이전트 이름</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                    placeholder="예: 루멘, 네오, 아틀라스"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">역할 및 정체성</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                    placeholder="예: 나만의 수석 전략 파트너"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-2 font-serif italic">에이전트 테마 색상</label>
                <div className="flex flex-wrap gap-2">
                  {accentColors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, accentColor: c.value })}
                      className={`flex items-center gap-2 border px-3 py-1.5 text-xs transition ${
                        formData.accentColor === c.value
                          ? 'border-white bg-white/15 text-white'
                          : 'border-white/10 bg-black/40 text-white/50 hover:border-white/30'
                      }`}
                    >
                      <span className="h-2.5 w-2.5" style={{ backgroundColor: c.value }} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone of Voice */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">톤앤매너 & 대화 스타일</label>
                <input
                  type="text"
                  value={formData.toneOfVoice}
                  onChange={(e) => setFormData({ ...formData, toneOfVoice: e.target.value })}
                  className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                  placeholder="예: 지적이고 통찰력 넘치며 다정한 어조"
                />
              </div>

              {/* Sliders for Empathy, Proactivity, Depth */}
              <div className="border border-white/10 bg-white/[0.02] p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-white/90 uppercase tracking-wider">
                  <Sliders className="h-4 w-4 text-white/70" />
                  <span>지능 및 반응 성향 조절 (Cognitive Calibration)</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/60 mb-1 font-mono">
                    <span>EMPATHY (공감 vs 냉철)</span>
                    <span className="font-bold text-white">{formData.empathyLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={formData.empathyLevel}
                    onChange={(e) => setFormData({ ...formData, empathyLevel: Number(e.target.value) })}
                    className="w-full accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>이성적/냉철한 피드백</span>
                    <span>무조건적 공감과 위로</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/60 mb-1 font-mono">
                    <span>PROACTIVITY (주도성 & 제안력)</span>
                    <span className="font-bold text-white">{formData.proactivityLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={formData.proactivityLevel}
                    onChange={(e) => setFormData({ ...formData, proactivityLevel: Number(e.target.value) })}
                    className="w-full accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>수동적 질의응답</span>
                    <span>주도적 질문 및 통찰 제안</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/60 mb-1 font-mono">
                    <span>DEPTH (사유 및 분석 깊이)</span>
                    <span className="font-bold text-white">{formData.depthLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={formData.depthLevel}
                    onChange={(e) => setFormData({ ...formData, depthLevel: Number(e.target.value) })}
                    className="w-full accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>간결한 한눈 요약</span>
                    <span>다각도 심층 구조화 분석</span>
                  </div>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">
                  에이전트 맞춤 지침 (System Instructions)
                </label>
                <textarea
                  rows={4}
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-xs font-mono text-white/90 placeholder-white/30 focus:border-white/50 focus:outline-none"
                  placeholder="에이전트가 지켜야 할 특별한 행동 지침이나 가치관을 작성하세요."
                />
              </div>

              {/* Greeting */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">시작 인사말</label>
                <input
                  type="text"
                  value={formData.greetingMessage}
                  onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                  className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'ai_builder' && (
            <div className="space-y-4">
              <div className="border border-white/20 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 font-serif text-sm font-bold text-white">
                  <Wand2 className="h-4 w-4 text-white/70" />
                  <span>AI 기반 에이전트 성격 자동 합성 (Auto-Synthesis)</span>
                </div>
                <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
                  내가 원하는 에이전트의 성격, 말투, 관계를 자유롭게 적어보세요. Gemini가 나만을 위한 최적화된 시스템 지침과 인사말을 자동으로 작성해줍니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">
                  원하는 에이전트 성향 및 분위기 설명
                </label>
                <textarea
                  rows={4}
                  value={builderConcept}
                  onChange={(e) => setBuilderConcept(e.target.value)}
                  className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                  placeholder="예: 겉으로는 냉철하고 팩트를 정확히 짚어주지만, 속으로는 누구보다 나의 성공을 진심으로 응원해주는 멘토. 코딩과 비즈니스 아이디어 정리에 탁월하고 군더더기 없는 문체를 썼으면 좋겠어."
                />
              </div>

              {builderError && (
                <div className="border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
                  {builderError}
                </div>
              )}

              <button
                onClick={handleGenerateCustomPrompt}
                disabled={isGeneratingPrompt || !builderConcept.trim()}
                className="flex w-full items-center justify-center gap-2 border border-white/40 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-white/90 disabled:opacity-30"
              >
                {isGeneratingPrompt ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>최적의 페르소나 지침 설계 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>AI 맞춤 페르소나 프롬프트 생성 & 적용</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/80 px-6 py-4">
          <button
            onClick={() => handleSelectPreset(PRESET_PERSONAS[0])}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>기본값 초기화</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white transition"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="border border-white/40 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 shadow-md transition"
            >
              페르소나 적용 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
