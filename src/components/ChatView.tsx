import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Trash2,
  Brain,
  BookOpen,
  Target,
  ArrowDown,
  Loader2,
  RotateCcw,
  Zap,
  FileSpreadsheet,
  FileText,
  Download,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AgentPersona,
  UserProfile,
  AgentMemoryItem,
  KnowledgeDocument,
  UserGoal,
  ChatMessage,
  ChatSession,
} from '../types';
import { exportMarkdownToExcel, exportMarkdownToDocx } from '../utils/fileExport';

interface ChatViewProps {
  activePersona: AgentPersona;
  userProfile: UserProfile;
  memories: AgentMemoryItem[];
  knowledgeDocs: KnowledgeDocument[];
  goals: UserGoal[];
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  onClearChat: () => void;
  isStreaming: boolean;
  onOpenPersonaModal: () => void;
  onOpenMemoryModal: () => void;
  onOpenKnowledgeModal: () => void;
  onOpenFileStudio?: () => void;
  onSaveDiscoveredMemory?: (category: string, content: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activePersona,
  userProfile,
  memories,
  knowledgeDocs,
  goals,
  messages,
  onSendMessage,
  onClearChat,
  isStreaming,
  onOpenPersonaModal,
  onOpenMemoryModal,
  onOpenKnowledgeModal,
  onOpenFileStudio,
  onSaveDiscoveredMemory,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Speech Recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ko-KR';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleToggleRecord = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Speech recognition start failed', err);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(userText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`_\[\]]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;

    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    setPlayingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Textarea dynamic auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-5xl flex-col px-3 py-3 sm:px-6">
      {/* Context Awareness Bar - Clean & Informative */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 text-slate-400">
          <span className="flex items-center gap-2 font-semibold text-slate-100">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            {activePersona.name}
          </span>
          <span className="text-slate-700">|</span>
          <button
            onClick={onOpenMemoryModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition"
          >
            <Brain className="h-3.5 w-3.5 text-blue-400" />
            <span>기억 {memories.length}개</span>
          </button>
          <button
            onClick={onOpenKnowledgeModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition"
          >
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            <span>지식 {knowledgeDocs.length}건</span>
          </button>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span>목표 {goals.length}개</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenFileStudio && (
            <button
              onClick={onOpenFileStudio}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 transition"
              title="엑셀/워드 파일 생성 스튜디오 열기"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>문서·엑셀 생성</span>
            </button>
          )}
          <button
            onClick={onClearChat}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-red-300 transition"
            title="대화 내역 비우기"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">대화 비우기</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Monogram */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm ${
                  isUser
                    ? 'bg-slate-700 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isUser ? userProfile.name.charAt(0) : activePersona.name.charAt(0)}
              </div>

              {/* Message Bubble */}
              <div
                className={`group relative max-w-[90%] sm:max-w-[82%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed border transition-all shadow-sm ${
                  isUser
                    ? 'rounded-tr-sm border-blue-500/30 bg-blue-600 text-white'
                    : 'rounded-tl-sm border-slate-800 bg-slate-900 text-slate-200'
                }`}
              >
                {/* Author & Timestamp */}
                <div className={`flex items-center justify-between gap-3 mb-2 text-xs ${isUser ? 'text-blue-100/80' : 'text-slate-400'}`}>
                  <span className="font-semibold">
                    {isUser ? userProfile.name : activePersona.name}
                  </span>
                  <span className="text-[11px] opacity-75">{msg.timestamp}</span>
                </div>

                {/* Markdown content */}
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>

                {/* Discovered Memory Tag if present */}
                {msg.discoveredMemories && msg.discoveredMemories.length > 0 && (
                  <div className="mt-3.5 space-y-1.5 border-t border-slate-800 pt-2.5">
                    {msg.discoveredMemories.map((disc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-1.5 text-xs text-amber-200"
                      >
                        <span className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                          <span>새로운 기억 포착: <strong className="font-semibold text-amber-100">{disc.content}</strong></span>
                        </span>
                        {onSaveDiscoveredMemory && (
                          <button
                            onClick={() => onSaveDiscoveredMemory(disc.category, disc.content)}
                            className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200 hover:bg-amber-500 hover:text-black transition-colors"
                          >
                            저장
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions (Copy / TTS / Excel / Word Download) */}
                {!isUser && (
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-800/80 pt-2 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={async () => {
                        try {
                          await exportMarkdownToDocx(
                            msg.content,
                            `${activePersona.name}_문서_${msg.id.slice(-6)}`,
                            activePersona.name
                          );
                          setDownloadedId(`docx-${msg.id}`);
                          setTimeout(() => setDownloadedId(null), 2500);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/90 px-2 py-1 text-xs text-slate-300 hover:border-blue-400 hover:text-white transition"
                      title="이 답변을 워드(.docx) 문서로 다운로드"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                      <span>{downloadedId === `docx-${msg.id}` ? 'DOCX 완료' : 'DOCX'}</span>
                    </button>

                    <button
                      onClick={() => {
                        try {
                          exportMarkdownToExcel(
                            msg.content,
                            `${activePersona.name}_데이터_${msg.id.slice(-6)}`
                          );
                          setDownloadedId(`xlsx-${msg.id}`);
                          setTimeout(() => setDownloadedId(null), 2500);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/90 px-2 py-1 text-xs text-slate-300 hover:border-emerald-400 hover:text-white transition"
                      title="이 답변의 표 데이터를 엑셀(.xlsx) 파일로 다운로드"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{downloadedId === `xlsx-${msg.id}` ? 'XLSX 완료' : 'XLSX'}</span>
                    </button>

                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      title="텍스트 복사"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSpeak(msg.id, msg.content)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      title="음성으로 듣기"
                    >
                      {playingId === msg.id ? (
                        <VolumeX className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming Loading indicator */}
        {isStreaming && (
          <div className="flex items-start gap-3 animate-in fade-in duration-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm">
              {activePersona.name.charAt(0)}
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-300 flex items-center gap-2.5 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              <span>{activePersona.name}가 생각을 정리하고 답변을 작성 중입니다...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Action Prompts (Quick Starter Chips) */}
      <div className="mb-2.5 flex flex-wrap gap-1.5 overflow-x-auto py-1 scrollbar-none">
        {onOpenFileStudio && (
          <button
            onClick={onOpenFileStudio}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-900/50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>📊 엑셀/워드 문서 스튜디오</span>
          </button>
        )}
        {activePersona.suggestedPrompts.map((promptText, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(promptText)}
            disabled={isStreaming}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>{promptText}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        className="relative rounded-2xl border border-slate-700/80 bg-slate-900 p-2.5 shadow-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`${activePersona.name}에게 무엇이든 물어보거나 지시하세요... (Shift+Enter 줄바꿈)`}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-[160px]"
        />

        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 px-1">
          {/* Left tools: Speech recognition */}
          <div className="flex items-center gap-2">
            {speechSupported && (
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition border ${
                  isRecording
                    ? 'border-red-500 bg-red-950/40 text-red-300 animate-pulse'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
                title="음성으로 입력하기"
              >
                {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                <span className="text-xs font-medium">{isRecording ? '듣는 중...' : '음성 입력'}</span>
              </button>
            )}
          </div>

          {/* Right submit button */}
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-30 shadow-sm"
          >
            <span>전송</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
