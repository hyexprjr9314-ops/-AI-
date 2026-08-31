import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Search,
  Tag,
  Sparkles,
  FileText,
  Check,
  Eye,
  Code,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { KnowledgeDocument, UserProfile } from '../types';
import { exportMarkdownToDocx, exportMarkdownToExcel } from '../utils/fileExport';

interface KnowledgeBaseViewProps {
  documents: KnowledgeDocument[];
  onAddDocument: (doc: Omit<KnowledgeDocument, 'id' | 'updatedAt'>) => void;
  onUpdateDocument: (doc: KnowledgeDocument) => void;
  onDeleteDocument: (id: string) => void;
  userProfile: UserProfile;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  documents,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  userProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(documents[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Form states
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<KnowledgeDocument['category']>('rules');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const filteredDocs = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setIsEditing(true);
    setEditTitle('');
    setEditCategory('rules');
    setEditContent(`# 새로운 문서 제목\n\n내용을 작성하세요. 에이전트가 이 내용을 학습하고 대화 시 참고합니다.`);
    setEditTags('원칙, 가이드');
  };

  const handleStartEdit = (doc: KnowledgeDocument) => {
    setIsCreatingNew(false);
    setIsEditing(true);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditContent(doc.content);
    setEditTags(doc.tags.join(', '));
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    const tagsArray = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (isCreatingNew) {
      onAddDocument({
        title: editTitle.trim(),
        category: editCategory,
        content: editContent.trim(),
        tags: tagsArray,
      });
    } else if (selectedDoc) {
      onUpdateDocument({
        ...selectedDoc,
        title: editTitle.trim(),
        category: editCategory,
        content: editContent.trim(),
        tags: tagsArray,
        updatedAt: new Date().toISOString().split('T')[0],
      });
    }

    setIsEditing(false);
    setIsCreatingNew(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/20 bg-white/5 font-serif text-lg italic text-white/90">
            03
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 block">
              Knowledge Repository
            </span>
            <h1 className="font-serif text-xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>나만의 지식 베이스 (Knowledge Vault)</span>
              <span className="border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/80">
                {documents.length} DOCS
              </span>
            </h1>
            <p className="mt-1 text-xs text-white/60 leading-relaxed max-w-2xl">
              <strong>{userProfile.name}</strong>님의 업무 규칙, 프로젝트 개요, 삶의 철학, 코딩 가이드라인 등을 저장하세요.
              에이전트는 이 문서들을 시스템 컨텍스트로 직접 읽고 완벽히 숙지합니다.
            </p>
          </div>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-2 border border-white/40 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-black transition-all hover:bg-white/90 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" />
          <span>새 지식 문서 작성</span>
        </button>
      </div>

      {/* Main 2-Column Split: Doc List + Reader/Editor */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Document List (4 cols) */}
        <div className="space-y-3 lg:col-span-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="문서 제목, 내용, 태그 검색..."
              className="w-full border border-white/10 bg-white/[0.02] pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredDocs.map((doc) => {
              const isSelected = !isCreatingNew && selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setIsEditing(false);
                    setIsCreatingNew(false);
                  }}
                  className={`group cursor-pointer border p-3.5 transition-all duration-200 ${
                    isSelected
                      ? 'border-white/50 bg-white/[0.06] shadow-sm'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xs font-bold text-white line-clamp-1">{doc.title}</h3>
                    <span className="font-mono text-[9px] text-white/40 shrink-0">{doc.updatedAt}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                    {doc.content.replace(/[#*`_]/g, '')}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {doc.tags.map((t) => (
                      <span
                        key={t}
                        className="border border-white/10 bg-black/40 px-1.5 py-0.2 font-mono text-[9px] text-white/60"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Document Viewer / Editor (8 cols) */}
        <div className="border border-white/10 bg-white/[0.02] p-6 lg:col-span-8 min-h-[500px] flex flex-col justify-between">
          {isEditing ? (
            /* Editing / Creating Mode */
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="h-3.5 w-3.5 text-white/70" />
                  <span>{isCreatingNew ? '새 지식 문서 작성' : '문서 수정'}</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="flex items-center gap-1.5 border border-white/20 bg-black/40 px-2.5 py-1 text-xs text-white/80 hover:border-white/40 hover:text-white transition"
                  >
                    {previewMode ? <Code className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span className="text-[11px]">{previewMode ? '에디터 보기' : '미리보기'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">문서 제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                  placeholder="예: 나의 핵심 업무 원칙 3가지"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">카테고리</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as KnowledgeDocument['category'])}
                    className="w-full border border-white/15 bg-black/90 px-3 py-2 text-xs text-white/90 focus:border-white/50 focus:outline-none"
                  >
                    <option value="rules">규칙 & 원칙 (Rules)</option>
                    <option value="projects">프로젝트 개요 (Projects)</option>
                    <option value="life">삶의 가치 & 건강 (Life)</option>
                    <option value="ideas">아이디어 & 메모 (Ideas)</option>
                    <option value="reference">참고 자료 (Reference)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">태그 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full border border-white/15 bg-black/90 px-3 py-2 text-xs text-white/90 placeholder-white/30 focus:border-white/50 focus:outline-none"
                    placeholder="원칙, 생산성, DeepWork"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">마크다운 본문</label>
                {previewMode ? (
                  <div className="markdown-body min-h-[260px] max-h-[360px] overflow-y-auto border border-white/15 bg-black/80 p-4 text-xs text-white/90">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    rows={12}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full font-mono border border-white/15 bg-black/90 p-3.5 text-xs text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                    placeholder="# 제목 및 세부 지침을 마크다운으로 입력하세요."
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 text-xs text-white/50 hover:text-white transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  onClick={handleSave}
                  className="flex items-center gap-2 border border-white/40 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-black hover:bg-white/90 transition"
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>문서 저장 완료</span>
                </button>
              </div>
            </div>
          ) : selectedDoc ? (
            /* Document Reading Mode */
            <div className="flex flex-col justify-between flex-1">
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-white">{selectedDoc.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/80">
                        {selectedDoc.category.toUpperCase()}
                      </span>
                      <span className="font-mono text-[10px] text-white/40">최근 업데이트: {selectedDoc.updatedAt}</span>
                      <div className="flex gap-1">
                        {selectedDoc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="border border-white/10 bg-black/40 px-1.5 py-0.2 font-mono text-[9px] text-white/50"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        await exportMarkdownToDocx(
                          selectedDoc.content,
                          selectedDoc.title,
                          userProfile.name
                        );
                      }}
                      className="flex items-center gap-1 border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:border-blue-400 hover:text-white transition"
                      title="이 지식 문서를 워드(.docx) 파일로 다운로드"
                    >
                      <FileText className="h-3 w-3 text-blue-300" />
                      <span>.DOCX</span>
                    </button>
                    <button
                      onClick={() => {
                        exportMarkdownToExcel(selectedDoc.content, selectedDoc.title);
                      }}
                      className="flex items-center gap-1 border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:border-emerald-400 hover:text-white transition"
                      title="이 지식 문서의 표/데이터를 엑셀(.xlsx) 파일로 다운로드"
                    >
                      <FileSpreadsheet className="h-3 w-3 text-emerald-300" />
                      <span>.XLSX</span>
                    </button>
                    <button
                      onClick={() => handleStartEdit(selectedDoc)}
                      className="flex items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40 hover:text-white transition"
                    >
                      <Edit3 className="h-3 w-3 text-white/60" />
                      <span>수정</span>
                    </button>
                    <button
                      onClick={() => onDeleteDocument(selectedDoc.id)}
                      className="border border-white/10 p-1.5 text-white/40 hover:border-red-500/50 hover:text-red-300 transition"
                      title="문서 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Markdown content container */}
                <div className="markdown-body text-xs text-[#D0D0D0] max-h-[440px] overflow-y-auto pr-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedDoc.content}</ReactMarkdown>
                </div>
              </div>

              <div className="mt-6 border border-white/10 bg-black/40 p-3.5 flex items-center justify-between text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-white/40" />
                  <span className="font-serif italic text-white/70">에이전트가 이 문서의 내용을 실시간 지능 컨텍스트로 항상 숙지하고 있습니다.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
              <FileText className="h-8 w-8 text-white/30 mb-2" />
              <p className="font-serif text-xs text-white/50">선택된 문서가 없습니다. 새 문서를 작성해보세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
