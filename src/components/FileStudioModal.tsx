import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  X,
  Sparkles,
  RefreshCw,
  Table as TableIcon,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentPersona, UserProfile, AgentMemoryItem, KnowledgeDocument } from '../types';
import { exportToExcel, exportMarkdownToDocx, exportMarkdownToExcel } from '../utils/fileExport';

interface FileStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: AgentPersona;
  userProfile: UserProfile;
  memories: AgentMemoryItem[];
  knowledgeDocs: KnowledgeDocument[];
}

type StudioTab = 'excel' | 'docx';

export const FileStudioModal: React.FC<FileStudioModalProps> = ({
  isOpen,
  onClose,
  activePersona,
  userProfile,
  memories,
  knowledgeDocs,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('excel');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generated Excel Data State
  const [excelResult, setExcelResult] = useState<{
    title: string;
    description?: string;
    sheets: { sheetName: string; headers: string[]; rows: string[][] }[];
  } | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // Generated Docx Markdown Data State
  const [docxResult, setDocxResult] = useState<{
    title: string;
    content: string;
  } | null>(null);

  if (!isOpen) return null;

  const excelTemplates = [
    { label: '📊 2026 연간 예산 및 지출 계획서', query: '2026년도 연간 사업/프로젝트 예산안과 분기별 예상 지출 항목 계획표를 요약 시트와 세부 내역 시트로 작성해줘' },
    { label: '📅 주간 스프린트 & 담당자 일정표', query: '주간 개발/업무 스프린트 태스크 목록, 우선순위, 담당자, 진척도 및 마감일 관리 시트 작성' },
    { label: '💪 월간 루틴 & 습관 트래커', query: '월간 데일리 습관(운동, 독서, 업무 몰입) 체크리스트 및 주차별 달성률 통계 시트 작성' },
    { label: '💰 수입/지출 가계부 & 자산 현황', query: '고정지출, 변동지출, 저축 및 투자 카테고리별 월간 자산 관리 시트' },
  ];

  const docxTemplates = [
    { label: '📄 신규 사업/서비스 기획서 초안', query: '신규 AI 에이전트 기반 서비스 사업 기획서 초안 (문제정의, 솔루션, 타겟 고객, 비즈니스 모델, 로드맵 포함)' },
    { label: '📝 주간 업무 실적 및 주간 회고 보고서', query: '이번 주 주요 성과, 진행 중인 프로젝트 이슈, 다음 주 우선순위 과제 및 KPT 회고 보고서' },
    { label: '🎯 개인 성장 & 커리어 로드맵 가이드', query: '앞으로의 1년 커리어 목표 달성을 위한 역량 강화 가이드라인 및 행동 수칙' },
    { label: '📋 프로젝트 요구사항 정의서(PRD)', query: '웹 애플리케이션 개발을 위한 기능적/비기능적 요구사항 정의서(PRD)' },
  ];

  const handleGenerate = async (customPrompt?: string) => {
    const textToRun = customPrompt || prompt;
    if (!textToRun.trim() || isLoading) return;

    setIsLoading(true);
    setDownloadSuccess(false);
    setErrorMessage(null);

    try {
      if (activeTab === 'excel') {
        const res = await fetch('/api/agent/generate-spreadsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToRun,
            persona: activePersona,
            userProfile,
            memories,
            knowledgeDocs,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `엑셀 생성에 실패했습니다 (${res.status}).`);
        if (data.sheets && data.sheets.length > 0) {
          setExcelResult(data);
          setActiveSheetIndex(0);
        } else {
          throw new Error('생성된 표 데이터가 비어 있습니다. 요청 내용을 조금 더 구체적으로 적어주세요.');
        }
      } else {
        const res = await fetch('/api/agent/generate-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: textToRun,
            docType: 'report',
            persona: activePersona,
            userProfile,
            memories,
            knowledgeDocs,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `문서 생성에 실패했습니다 (${res.status}).`);
        if (data.documentContent) {
          const firstLineTitle = textToRun.slice(0, 30);
          setDocxResult({
            title: firstLineTitle,
            content: data.documentContent,
          });
        } else {
          throw new Error('생성된 문서 내용이 비어 있습니다. 요청 내용을 조금 더 구체적으로 적어주세요.');
        }
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      setErrorMessage(err.message || '생성 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!excelResult) return;
    setIsExporting(true);
    try {
      const sheetsData = excelResult.sheets.map((s) => ({
        sheetName: s.sheetName,
        data: [s.headers, ...s.rows],
      }));
      exportToExcel(sheetsData, excelResult.title || 'Spreadsheet');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Excel export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!docxResult) return;
    setIsExporting(true);
    try {
      await exportMarkdownToDocx(docxResult.content, docxResult.title, `${activePersona.name} & ${userProfile.name}`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Docx export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col border border-white/20 bg-[#0D0D0D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/5 font-serif italic text-lg text-white">
              {activeTab === 'excel' ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 block">Document & Data Studio</span>
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <span>AI 문서 및 엑셀 생성 스튜디오</span>
                <span className="border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/80 uppercase">
                  Native XLSX / DOCX
                </span>
              </h2>
              <p className="text-xs text-white/50">원하는 주제나 서식을 입력하면 {activePersona.name}가 서식과 표가 완성된 실제 파일로 제작합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 border-b border-white/10 bg-black/40 p-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('excel');
              setDownloadSuccess(false);
            }}
            className={`flex items-center justify-center gap-2 border py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'excel'
                ? 'border-white bg-white text-black'
                : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>📊 엑셀 스프레드시트 (.xlsx)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('docx');
              setDownloadSuccess(false);
            }}
            className={`flex items-center justify-center gap-2 border py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'docx'
                ? 'border-white bg-white text-black'
                : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>📄 워드 보고서/기획서 (.docx)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Preset Chips */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-white/50 mb-2">
              빠른 템플릿 프리셋
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(activeTab === 'excel' ? excelTemplates : docxTemplates).map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrompt(tpl.query);
                    handleGenerate(tpl.query);
                  }}
                  disabled={isLoading}
                  className="flex items-center justify-between text-left border border-white/10 bg-white/[0.02] p-2.5 text-xs text-white/70 hover:border-white/30 hover:bg-white/[0.06] hover:text-white transition disabled:opacity-40"
                >
                  <span className="font-serif font-medium truncate pr-2">{tpl.label}</span>
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-white/40" />
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Box */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">
              {activeTab === 'excel'
                ? '생성할 엑셀 표와 데이터에 대한 설명 / 요구사항'
                : '작성할 워드 문서의 주제 / 섹션 구성 요구사항'}
            </label>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeTab === 'excel'
                    ? '예: 2026년 1분기 마케팅 채널별 집행 예산 및 예상 전환수 비교표'
                    : '예: AI 에이전트 도입을 위한 전사 업무 효율화 기획서'
                }
                className="flex-1 border border-white/15 bg-black/90 px-3.5 py-2 text-xs sm:text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none resize-none"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={!prompt.trim() || isLoading}
                className="border border-white/40 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 disabled:opacity-30 transition flex flex-col items-center justify-center gap-1 shrink-0 min-w-[90px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[10px]">생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>생성하기</span>
                  </>
                )}
              </button>
            </div>
            {errorMessage && (
              <div className="mt-2 border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="border border-white/10 bg-black/40 p-4 min-h-[260px] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                LIVE ARTIFACT PREVIEW
              </span>
              {((activeTab === 'excel' && excelResult) || (activeTab === 'docx' && docxResult)) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerate()}
                    className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition"
                    title="다시 생성"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>재생성</span>
                  </button>
                  <button
                    onClick={activeTab === 'excel' ? handleDownloadExcel : handleDownloadDocx}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 border border-white/40 bg-white px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 transition shadow-sm"
                  >
                    {downloadSuccess ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                        <span>다운로드 완료!</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        <span>{activeTab === 'excel' ? '.XLSX 파일 받기' : '.DOCX 파일 받기'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-3">
                <Loader2 className="h-7 w-7 animate-spin text-white/80" />
                <p className="font-serif text-sm font-medium text-white/90">
                  {userProfile.name}님의 요구사항과 기억 맥락을 결합하여 고품질 {activeTab === 'excel' ? '엑셀 스프레드시트' : '워드 보고서'}를 빌드하고 있습니다...
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Gemini Synthesis Engine Active</p>
              </div>
            ) : activeTab === 'excel' ? (
              excelResult ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-sm font-bold text-white">{excelResult.title}</h3>
                    {excelResult.sheets.length > 1 && (
                      <div className="flex gap-1">
                        {excelResult.sheets.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveSheetIndex(idx)}
                            className={`px-2.5 py-1 text-[11px] font-mono border transition ${
                              activeSheetIndex === idx
                                ? 'border-white bg-white/10 text-white'
                                : 'border-white/10 text-white/40 hover:text-white'
                            }`}
                          >
                            {s.sheetName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {excelResult.sheets[activeSheetIndex] && (
                    <div className="overflow-x-auto border border-white/10">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                          <tr className="bg-white/10 text-white border-b border-white/20">
                            <th className="p-2 border-r border-white/10 w-10 text-center text-white/40">#</th>
                            {excelResult.sheets[activeSheetIndex].headers.map((h, i) => (
                              <th key={i} className="p-2 border-r border-white/10 font-semibold tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {excelResult.sheets[activeSheetIndex].rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={`border-b border-white/5 ${
                                rIdx % 2 === 1 ? 'bg-white/[0.02]' : 'bg-transparent'
                              } hover:bg-white/[0.05]`}
                            >
                              <td className="p-2 border-r border-white/10 text-center text-white/30 text-[10px]">
                                {rIdx + 1}
                              </td>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2 border-r border-white/10 text-white/80">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-white/40">
                  <TableIcon className="h-10 w-10 mb-2 stroke-[1.2]" />
                  <p className="font-serif text-xs text-white/60">위에서 템플릿을 선택하거나 원하는 엑셀 명세를 입력 후 생성 버튼을 누르세요.</p>
                  <p className="font-mono text-[10px] mt-1 text-white/30">정교한 셀 정렬과 복수 시트가 완비된 XLSX로 즉시 내려받을 수 있습니다.</p>
                </div>
              )
            ) : (
              docxResult ? (
                <div className="space-y-4 font-serif text-white/80 leading-relaxed max-h-[420px] overflow-y-auto pr-2">
                  <div className="border-b border-white/10 pb-2">
                    <h3 className="text-base font-bold text-white">{docxResult.title}</h3>
                  </div>
                  <div className="markdown-body text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{docxResult.content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-white/40">
                  <FileCheck className="h-10 w-10 mb-2 stroke-[1.2]" />
                  <p className="font-serif text-xs text-white/60">보고서, 기획서, 회고록, 매뉴얼 등의 주제를 입력하세요.</p>
                  <p className="font-mono text-[10px] mt-1 text-white/30">대제목, 표, 불릿 포인트가 정돈된 Microsoft Word (.docx) 파일로 다운로드됩니다.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/80 px-6 py-4">
          <span className="font-mono text-[10px] text-white/40">
            PERSONAL INTELLIGENCE ENGINE • NATIVE OFFICE EXPORTER
          </span>
          <button
            onClick={onClose}
            className="border border-white/20 bg-white/10 px-5 py-2 text-xs font-medium text-white hover:bg-white/20 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
