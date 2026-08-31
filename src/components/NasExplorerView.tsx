import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Search,
  FileText,
  FileSpreadsheet,
  File,
  Sparkles,
  RefreshCw,
  ExternalLink,
  HardDrive,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Send,
} from 'lucide-react';
import { NasFileItem } from '../types';

interface NasExplorerViewProps {
  onAskAgent: (prompt: string) => void;
  onNavigateToChat: () => void;
}

interface NasStatus {
  root: string;
  reachable: boolean;
  indexedCount: number;
  lastIndexedAt: string | null;
}

export const NasExplorerView: React.FC<NasExplorerViewProps> = ({
  onAskAgent,
  onNavigateToChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedExt, setSelectedExt] = useState('전체');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [nasFiles, setNasFiles] = useState<NasFileItem[]>([]);
  const [status, setStatus] = useState<NasStatus | null>(null);

  const categories = ['전체', '노무/임금', '식권/복리후생', '경비/결재', '법인카드', '계약/시설', '보건/안전', '피복/용품', '사규/규정'];
  const extensions = ['전체', '.hwp', '.xlsx', '.docx', '.pdf'];

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/nas/status');
      if (res.ok) setStatus(await res.json());
    } catch {
      // server unreachable — status stays null, UI shows the disconnected state
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedCategory !== '전체') params.set('category', selectedCategory);
      if (selectedExt !== '전체') params.set('ext', selectedExt);
      const res = await fetch(`/api/nas/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNasFiles(data.files || []);
      }
    } catch {
      // server unreachable — leave the previous result list as-is
    }
  }, [searchQuery, selectedCategory, selectedExt]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleRefreshIndex = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/nas/refresh', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setRefreshError(err.error || 'NAS 색인 새로고침에 실패했습니다.');
      } else {
        await fetchStatus();
        await fetchFiles();
      }
    } catch {
      setRefreshError('서버에 연결할 수 없습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredFiles = nasFiles;

  const getExtBadge = (ext: string) => {
    switch (ext.toLowerCase()) {
      case '.hwp':
        return <span className="rounded bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-500/30">HWP</span>;
      case '.xlsx':
        return <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">XLSX</span>;
      case '.docx':
        return <span className="rounded bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/30">DOCX</span>;
      case '.pdf':
        return <span className="rounded bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">PDF</span>;
      default:
        return <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">FILE</span>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-7xl flex-col px-3 py-3 sm:px-6 space-y-3">
      {/* Top Banner: NAS Status & Statistics */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  한양고속 사내 NAS 문서 색인 & 탐색기
                </h2>
                {status?.reachable ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    NAS 색인 연결됨
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-950 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    {status ? 'NAS에 연결할 수 없음' : '서버 연결 확인 중...'}
                  </span>
                )}
              </div>
              <span className="block text-xs text-slate-400 font-mono mt-0.5">
                루트: {status?.root || '-'}{' '}
                <strong className="text-orange-400">({(status?.indexedCount ?? 0).toLocaleString()}건 색인됨)</strong>
                {!status?.reachable && status && (
                  <span className="ml-2 text-rose-400">
                    — 이 서버가 사내망(NAS)에 연결된 PC에서 실행 중이 아니면 색인할 수 없습니다.
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshIndex}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span>{isRefreshing ? '인덱싱 중...' : '색인 새로고침'}</span>
            </button>

            <button
              onClick={() => {
                onAskAgent(`한양아, 사내 NAS의 '총무부_노무' 폴더에 있는 취업규칙, 임금협상 합의서, 식권 정산표 등 핵심 문서 목록을 파악하고 요약해줘.`);
                onNavigateToChat();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:from-orange-400 hover:to-amber-500"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>한양 AI에게 NAS 지식 분석 요청</span>
            </button>
          </div>
        </div>
        {refreshError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            {refreshError}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="파일명 또는 상대경로 검색... 예: 임금협상, 취업규칙, 식권"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs transition ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Extension Filter */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
          {extensions.map((ext) => (
            <button
              key={ext}
              onClick={() => setSelectedExt(ext)}
              className={`rounded-md px-2 py-0.5 text-xs uppercase font-mono transition ${
                selectedExt === ext
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {ext}
            </button>
          ))}
        </div>
      </div>

      {/* File List Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">확장자</th>
              <th className="p-3">파일명</th>
              <th className="p-3">분류</th>
              <th className="p-3">상대 경로</th>
              <th className="p-3">크기</th>
              <th className="p-3">수정일시</th>
              <th className="p-3 text-right">AI 작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  {status && !status.reachable
                    ? 'NAS에 연결할 수 없어 색인된 파일이 없습니다. "색인 새로고침"을 눌러 다시 시도하세요.'
                    : '검색 조건에 맞는 NAS 파일이 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredFiles.map((file, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 transition">
                  <td className="p-3">{getExtBadge(file.extension)}</td>
                  <td className="p-3 font-semibold text-white">
                    <span className="cursor-pointer hover:text-orange-400 transition flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      {file.file_name}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-slate-800/90 px-2 py-0.5 text-[10px] text-slate-300">
                      {file.category}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-xs" title={file.relative_path}>
                    {file.relative_path}
                  </td>
                  <td className="p-3 font-mono text-slate-400">{formatBytes(file.size_bytes)}</td>
                  <td className="p-3 text-slate-400">{file.modified_at}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        onAskAgent(`NAS 파일 "${file.file_name}" (${file.category}) 내용을 분석하고, 우리 회사 관련 핵심 조항이나 규정을 알려줘.`);
                        onNavigateToChat();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-500/20 transition"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>한양 AI 분석</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
