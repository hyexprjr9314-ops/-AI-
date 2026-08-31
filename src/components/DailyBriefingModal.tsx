import React, { useState } from 'react';
import {
  X,
  SunMedium,
  Moon,
  Zap,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Bot,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentPersona, UserProfile, AgentMemoryItem, UserGoal, DailyRoutine } from '../types';
import { exportMarkdownToDocx, exportMarkdownToExcel } from '../utils/fileExport';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: AgentPersona;
  userProfile: UserProfile;
  memories: AgentMemoryItem[];
  goals: UserGoal[];
  routines: DailyRoutine[];
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  isOpen,
  onClose,
  activePersona,
  userProfile,
  memories,
  goals,
  routines,
}) => {
  const [briefingType, setBriefingType] = useState<'morning' | 'evening' | 'focus'>('morning');
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateBriefing = async (type = briefingType) => {
    setIsLoading(true);
    setBriefingText(null);
    setAudioError(null);

    try {
      const res = await fetch('/api/agent/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          persona: activePersona,
          userProfile,
          memories,
          goals,
          routines,
          currentDateTime: new Date().toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
          }),
        }),
      });

      if (!res.ok) {
        throw new Error('브리핑 생성 중 오류가 발생했습니다.');
      }

      const data = await res.json();
      setBriefingText(data.briefing || '브리핑 내용이 없습니다.');
    } catch (err: any) {
      setBriefingText(`오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakBriefing = () => {
    if (!briefingText) return;

    if ('speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }

      window.speechSynthesis.cancel();
      const cleanText = briefingText.replace(/[#*`_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setAudioError('브라우저에서 음성 합성을 지원하지 않습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-white/20 bg-[#0D0D0D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/5 font-serif italic text-lg"
              style={{ color: activePersona.accentColor }}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 block">Executive Summary</span>
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-3">
                <span>{activePersona.name}의 데일리 브리핑</span>
                <span className="border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/80 uppercase">
                  Tailored Intelligence
                </span>
              </h2>
              <p className="text-xs text-white/50">
                <strong>{userProfile.name}</strong>님의 목표와 기억을 결합한 하루 계획을 확인하세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isPlayingAudio && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              onClose();
            }}
            className="p-1.5 text-white/40 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 border-b border-white/10 bg-black/40 p-2 gap-2">
          <button
            onClick={() => {
              setBriefingType('morning');
              handleGenerateBriefing('morning');
            }}
            className={`flex items-center justify-center gap-2 border py-2.5 text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
              briefingType === 'morning'
                ? 'border-white bg-white text-black'
                : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
            }`}
          >
            <SunMedium className="h-3.5 w-3.5" />
            <span>🌅 Morning</span>
          </button>

          <button
            onClick={() => {
              setBriefingType('evening');
              handleGenerateBriefing('evening');
            }}
            className={`flex items-center justify-center gap-2 border py-2.5 text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
              briefingType === 'evening'
                ? 'border-white bg-white text-black'
                : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>🌙 Evening</span>
          </button>

          <button
            onClick={() => {
              setBriefingType('focus');
              handleGenerateBriefing('focus');
            }}
            className={`flex items-center justify-center gap-2 border py-2.5 text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
              briefingType === 'focus'
                ? 'border-white bg-white text-black'
                : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>⚡ Deep Focus</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[320px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-white/80" />
              <p className="font-serif text-sm font-medium text-white/90">
                {userProfile.name}님의 목표, 루틴, 기억을 종합하여 맞춤 브리핑을 조율하고 있습니다...
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Gemini Synthesis Engine Active</p>
            </div>
          ) : briefingText ? (
            <div className="space-y-4">
              <div className="markdown-body text-xs text-white/80 leading-relaxed font-serif">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefingText}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="h-8 w-8 text-white/60 mb-3" />
              <h3 className="font-serif text-base font-bold text-white">
                {userProfile.name}님만을 위한 오늘의 브리핑을 준비할까요?
              </h3>
              <p className="mt-1 text-xs text-white/50 max-w-sm mb-6">
                현재 시간과 진행 중인 목표, 등록된 루틴 및 기억 저장소를 반영하여 하루의 최적 항로를 제안합니다.
              </p>
              <button
                onClick={() => handleGenerateBriefing()}
                className="flex items-center gap-2 border border-white/40 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 shadow-md transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>지금 브리핑 생성하기</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/80 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {briefingText && (
              <>
                <button
                  onClick={async () => {
                    await exportMarkdownToDocx(
                      briefingText,
                      `${activePersona.name}_데일리브리핑_${briefingType}`,
                      activePersona.name
                    );
                  }}
                  className="flex items-center gap-1.5 border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-blue-400 hover:text-white transition"
                  title="워드 파일(.docx)로 저장"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-300" />
                  <span>.DOCX</span>
                </button>

                <button
                  onClick={() => {
                    exportMarkdownToExcel(
                      briefingText,
                      `${activePersona.name}_데일리브리핑_${briefingType}`
                    );
                  }}
                  className="flex items-center gap-1.5 border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-emerald-400 hover:text-white transition"
                  title="엑셀 파일(.xlsx)로 저장"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-300" />
                  <span>.XLSX</span>
                </button>

                <button
                  onClick={handleSpeakBriefing}
                  className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition ${
                    isPlayingAudio
                      ? 'border-white bg-white/20 text-white'
                      : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {isPlayingAudio ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span>{isPlayingAudio ? '중지' : '음성'}</span>
                </button>
              </>
            )}
            {audioError && <span className="text-[11px] text-red-400">{audioError}</span>}
          </div>

          <div className="flex items-center gap-2">
            {briefingText && (
              <button
                onClick={() => handleGenerateBriefing()}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>재생성</span>
              </button>
            )}
            <button
              onClick={() => {
                if (isPlayingAudio && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                onClose();
              }}
              className="border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
