import React, { useState } from 'react';
import {
  X,
  FileText,
  Sparkles,
  RotateCcw,
  Loader2,
  Brain,
  Download,
  Share2,
  Bot,
  Flame,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentPersona, UserProfile, AgentMemoryItem, KnowledgeDocument, UserGoal } from '../types';
import { exportMarkdownToDocx, exportMarkdownToExcel } from '../utils/fileExport';

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: AgentPersona;
  userProfile: UserProfile;
  memories: AgentMemoryItem[];
  knowledgeDocs: KnowledgeDocument[];
  goals: UserGoal[];
}

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  onClose,
  activePersona,
  userProfile,
  memories,
  knowledgeDocs,
  goals,
}) => {
  const [dossierContent, setDossierContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateDossier = async () => {
    setIsLoading(true);
    setDossierContent(null);

    try {
      const res = await fetch('/api/agent/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          userProfile,
          memories,
          knowledgeDocs,
          goals,
        }),
      });

      if (!res.ok) {
        throw new Error('보고서 생성 실패');
      }

      const data = await res.json();
      setDossierContent(data.dossier || '분석 보고서가 없습니다.');
    } catch (err: any) {
      setDossierContent(`오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!dossierContent) return;
    navigator.clipboard.writeText(dossierContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col border border-white/20 bg-[#0D0D0D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/5 font-serif italic text-lg text-white/90">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 block">Cognitive Synthesis</span>
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-3">
                <span>AI 지능 보고서 (User Intelligence Dossier)</span>
                <span className="border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/80 uppercase">
                  {activePersona.name} Edition
                </span>
              </h2>
              <p className="text-xs text-white/50">
                에이전트가 학습한 <strong>{userProfile.name}</strong>님의 행동 패턴, 핵심 가치, 목표 및 성장 전략 종합 분석
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Intelligence Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-white/10 bg-black/40 p-3 gap-2 text-xs">
          <div className="border border-white/10 bg-white/[0.02] p-2.5">
            <span className="font-mono text-[9px] tracking-wider uppercase text-white/40 block">SUBJECT</span>
            <span className="font-serif font-bold text-white">{userProfile.name}</span>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-2.5">
            <span className="font-mono text-[9px] tracking-wider uppercase text-white/40 block">MEMORIES</span>
            <span className="font-serif font-bold text-white/90">{memories.length} RECORDS</span>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-2.5">
            <span className="font-mono text-[9px] tracking-wider uppercase text-white/40 block">DOCUMENTS</span>
            <span className="font-serif font-bold text-white/90">{knowledgeDocs.length} ENTRIES</span>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-2.5">
            <span className="font-mono text-[9px] tracking-wider uppercase text-white/40 block">ACTIVE GOALS</span>
            <span className="font-serif font-bold text-white/90">{goals.length} ACTIVE</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[380px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-white/80" />
              <p className="font-serif text-sm font-semibold text-white/90">
                {userProfile.name}님의 다차원 데이터를 결합하여 심층 지능 보고서를 작성 중입니다...
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Synthesizing Cognitive & Behavioral Vectors</p>
            </div>
          ) : dossierContent ? (
            <div className="space-y-4">
              <div className="markdown-body text-xs text-white/80 leading-relaxed font-serif">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{dossierContent}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="h-10 w-10 text-white/50 mb-3" />
              <h3 className="font-serif text-base font-bold text-white">
                에이전트가 바라보는 나의 종합 인텔리전스를 산출해보세요
              </h3>
              <p className="mt-2 text-xs text-white/50 max-w-md leading-relaxed mb-6 font-serif">
                현재 등록된 가치관, 기억, 지식 문서, 목표 달성 현황을 총체적으로 결합하여 잠재력 분포, 인지적 병목 해결책 및 전략적 협업 가이드를 도출합니다.
              </p>
              <button
                onClick={handleGenerateDossier}
                className="flex items-center gap-2 border border-white/40 bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 shadow-md transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>심층 지능 보고서 생성 시작</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/80 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {dossierContent && (
              <>
                <button
                  onClick={async () => {
                    await exportMarkdownToDocx(
                      dossierContent,
                      `${userProfile.name}_인지_지능_보고서`,
                      `${activePersona.name} & ${userProfile.name}`
                    );
                  }}
                  className="flex items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-blue-400 hover:text-white transition"
                  title="워드 파일(.docx)로 저장"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-300" />
                  <span>.DOCX</span>
                </button>

                <button
                  onClick={() => {
                    exportMarkdownToExcel(
                      dossierContent,
                      `${userProfile.name}_인지_지능_보고서`
                    );
                  }}
                  className="flex items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-emerald-400 hover:text-white transition"
                  title="엑셀 파일(.xlsx)로 저장"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-300" />
                  <span>.XLSX</span>
                </button>

                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/40 hover:text-white transition"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <Share2 className="h-3.5 w-3.5" />}
                  <span>{copied ? '복사됨' : '복사'}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {dossierContent && (
              <button
                onClick={handleGenerateDossier}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>재분석</span>
              </button>
            )}
            <button
              onClick={onClose}
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
