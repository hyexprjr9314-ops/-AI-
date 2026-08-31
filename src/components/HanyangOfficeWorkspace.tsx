import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2,
  Utensils,
  Calculator,
  Receipt,
  CreditCard,
  Sparkles,
  Briefcase,
  Shirt,
  FileText,
  HandCoins,
  HeartPulse,
  UserPlus,
  GraduationCap,
  Box,
  Building,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Scan,
  RefreshCw,
  Send,
  Calendar,
  DollarSign,
  UserCheck,
  Check,
  X,
  FolderOpen,
} from 'lucide-react';
import {
  GAModule,
  GARecord,
  MealPriceItem,
  RetroactivePayResult,
} from '../types';
import { HANYANG_MODULES, GA_COMMON_FIELDS } from '../data/hanyangAdminData';
import { exportToExcel, exportMarkdownToDocx } from '../utils/fileExport';
import { Storage } from '../lib/storage';

interface HanyangOfficeWorkspaceProps {
  onAskAgent: (prompt: string) => void;
  onNavigateToChat: () => void;
  onNavigateToNas: () => void;
}

export const HanyangOfficeWorkspace: React.FC<HanyangOfficeWorkspaceProps> = ({
  onAskAgent,
  onNavigateToChat,
  onNavigateToNas,
}) => {
  // State
  const [selectedCompany, setSelectedCompany] = useState<'HANYANG' | 'CHUNGNAM'>('HANYANG');
  const [selectedModuleKey, setSelectedModuleKey] = useState<string>('dashboard');
  const [records, setRecords] = useState<GARecord[]>(() => Storage.getRecords());
  const [mealPrices, setMealPrices] = useState<MealPriceItem[]>(() => Storage.getMealPrices());

  // Persist to localStorage + server (SQLite) on every change so business
  // records survive reloads and are shared across browsers/devices.
  useEffect(() => {
    Storage.setRecords(records);
  }, [records]);
  useEffect(() => {
    Storage.setMealPrices(mealPrices);
  }, [mealPrices]);

  // Sub-tabs
  const [mealTab, setMealTab] = useState<'issuance' | 'receipts' | 'prices' | 'analytics'>('issuance');
  const [payTab, setPayTab] = useState<'annual' | 'driver' | 'contract' | 'retro' | 'payroll'>('annual');
  const [expenseTab, setExpenseTab] = useState<'contracts' | 'ledger' | 'approval' | 'analytics' | 'search'>('contracts');
  const [cardTab, setCardTab] = useState<'ledger' | 'analytics'>('ledger');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);

  // Period Analytics Controls
  const [analysisPeriodUnit, setAnalysisPeriodUnit] = useState<'month' | 'quarter' | 'half' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  // Modal / Form States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GARecord | null>(null);
  const [recordFormData, setRecordFormData] = useState<Partial<GARecord>>({});

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<MealPriceItem | null>(null);
  const [priceFormData, setPriceFormData] = useState<Partial<MealPriceItem>>({});

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [activeSheetRecord, setActiveSheetRecord] = useState<GARecord | null>(null);

  // OCR Modal — backed by the real /api/ocr-receipt Gemini Vision endpoint
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  interface OcrRow {
    item?: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
    note?: string;
  }
  interface OcrResult {
    filename: string;
    title?: string;
    vendor?: string;
    date?: string;
    totalAmount?: number;
    category?: string;
    paymentMethod?: string;
    manager?: string;
    note?: string;
    rows: OcrRow[];
  }
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const handleOcrFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsOcrLoading(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/ocr-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType: file.type || 'application/pdf',
          targetModule: 'meal_coupons',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `OCR 요청이 실패했습니다 (${res.status}).`);
      }
      const parsed = await res.json();
      setOcrResult({ filename: file.name, rows: [], ...parsed });
      setIsOcrModalOpen(true);
    } catch (err: any) {
      showToast(`OCR 인식 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Retroactive Pay Calculator Form State
  const [retroForm, setRetroForm] = useState({
    employee: '홍길동 차장',
    jobType: 'annual' as 'annual' | 'driver',
    oldPay: 42000000,
    newPay: 46800000,
    start: '2026-01-01',
    end: '2026-08-31',
  });
  const [retroResult, setRetroResult] = useState<RetroactivePayResult | null>(null);

  // Quick Card Expense Form
  const [cardQuickForm, setCardQuickForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    card: '신한법인 (8841)',
    user: Storage.getUserProfile().name,
    merchant: '',
    amount: 0,
    purpose: '',
  });

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Icon mapping
  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils': return <Utensils className="h-4 w-4" />;
      case 'Calculator': return <Calculator className="h-4 w-4" />;
      case 'Receipt': return <Receipt className="h-4 w-4" />;
      case 'CreditCard': return <CreditCard className="h-4 w-4" />;
      case 'Sparkles': return <Sparkles className="h-4 w-4" />;
      case 'Briefcase': return <Briefcase className="h-4 w-4" />;
      case 'Shirt': return <Shirt className="h-4 w-4" />;
      case 'FileText': return <FileText className="h-4 w-4" />;
      case 'HandCoins': return <HandCoins className="h-4 w-4" />;
      case 'HeartPulse': return <HeartPulse className="h-4 w-4" />;
      case 'UserPlus': return <UserPlus className="h-4 w-4" />;
      case 'GraduationCap': return <GraduationCap className="h-4 w-4" />;
      case 'Box': return <Box className="h-4 w-4" />;
      case 'Building': return <Building className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  // Active module
  const currentModule = HANYANG_MODULES.find((m) => m.key === selectedModuleKey);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (r.company_id !== selectedCompany) return false;
      if (selectedModuleKey !== 'dashboard' && r.module !== selectedModuleKey) return false;
      if (selectedModuleKey === 'meal_coupons') {
        if (mealTab === 'issuance' && r.ledger_type !== 'issuance') return false;
        if (mealTab === 'receipts' && r.ledger_type !== 'receipts') return false;
      }
      if (selectedModuleKey === 'payroll') {
        if (payTab !== 'retro' && r.payroll_type && r.payroll_type !== payTab) return false;
      }
      if (statusFilter && r.status !== statusFilter) return false;
      if (searchQuery) {
        const needle = searchQuery.toLowerCase();
        const jsonStr = JSON.stringify(r).toLowerCase();
        if (!jsonStr.includes(needle)) return false;
      }
      return true;
    });
  }, [records, selectedCompany, selectedModuleKey, mealTab, payTab, statusFilter, searchQuery]);

  // Card summary statistics
  const cardSummary = useMemo(() => {
    const cardRecords = records.filter((r) => r.module === 'cards');
    const totalAmount = cardRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const monthlyLimit = 5000000;
    const usageRate = Math.round((totalAmount / monthlyLimit) * 100);
    const remaining = Math.max(0, monthlyLimit - totalAmount);
    const isOver = totalAmount > monthlyLimit;
    return { totalAmount, monthlyLimit, usageRate, remaining, isOver, count: cardRecords.length };
  }, [records]);

  // Card usage by purpose, for the 월 한도 500만원 분석 tab
  const cardPurposeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    records
      .filter((r) => r.module === 'cards')
      .forEach((r) => {
        const key = r.purpose || '기타';
        map.set(key, (map.get(key) || 0) + (Number(r.amount) || 0));
      });
    return Array.from(map.entries())
      .map(([purpose, amount]) => ({ purpose, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [records]);

  // Meal Coupon Statistics
  const mealSummary = useMemo(() => {
    const mealRecords = records.filter((r) => r.module === 'meal_coupons');
    let totalIssued = 0;
    let totalReceived = 0;
    mealRecords.forEach((r) => {
      if (r.ledger_type === 'issuance' || r.quantity) totalIssued += Number(r.quantity) || 0;
      if (r.ledger_type === 'receipts' || r.received_quantity) totalReceived += Number(r.received_quantity) || 0;
    });
    const avgPrice = 6500;
    const totalExpense = totalReceived * avgPrice;
    const consumptionRate = totalIssued ? Math.round((totalReceived / totalIssued) * 100) : 0;
    return { totalIssued, totalReceived, avgPrice, totalExpense, consumptionRate };
  }, [records]);

  // Monthly issued/received trend for the 기간별 사용 분석 tab, computed
  // from actual records instead of a hardcoded 4-month sample.
  const mealMonthlyTrend = useMemo(() => {
    const byMonth = new Map<string, { issued: number; received: number }>();
    records
      .filter((r) => r.module === 'meal_coupons' && r.date)
      .forEach((r) => {
        const month = r.date.slice(0, 7);
        const entry = byMonth.get(month) || { issued: 0, received: 0 };
        if (r.ledger_type === 'issuance' || r.quantity) entry.issued += Number(r.quantity) || 0;
        if (r.ledger_type === 'receipts' || r.received_quantity) entry.received += Number(r.received_quantity) || 0;
        byMonth.set(month, entry);
      });
    return Array.from(byMonth.entries())
      .map(([month, v]) => ({ month, issued: v.issued, received: v.received, expense: v.received * mealSummary.avgPrice }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [records]);

  // Expense Summary
  const expenseSummary = useMemo(() => {
    const expRecords = records.filter((r) => r.module === 'expenses');
    const totalAmount = expRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const avgAmount = expRecords.length ? Math.round(totalAmount / expRecords.length) : 0;
    return { totalAmount, count: expRecords.length, avgAmount };
  }, [records]);

  // Expense category breakdown for the 지출 통계 분석 tab
  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    records
      .filter((r) => r.module === 'expenses')
      .forEach((r) => {
        const key = r.category || '미분류';
        map.set(key, (map.get(key) || 0) + (Number(r.amount) || 0));
      });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [records]);

  // Expense records still awaiting approval, for the 경비승인 명세서 tab
  const pendingExpenseApprovals = useMemo(
    () => records.filter((r) => r.module === 'expenses' && r.status !== '승인완료' && r.status !== '완료'),
    [records]
  );

  // Handle Calculate Retroactive Pay (월별 실제 일수 기반 일할 계산)
  const handleCalculateRetro = (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = new Date(retroForm.start);
    const endDate = new Date(retroForm.end);

    if (endDate < startDate || retroForm.newPay < retroForm.oldPay) {
      showToast('소급 기간과 인상 급여액을 확인하세요.');
      return;
    }

    const monthlyDiff = (retroForm.newPay - retroForm.oldPay) / (retroForm.jobType === 'annual' ? 12 : 1);
    let total = 0;
    const details = [];

    const curr = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (curr <= last) {
      const year = curr.getFullYear();
      const month = curr.getMonth() + 1;
      const monthDays = new Date(year, month, 0).getDate();

      const firstDay = (curr.getFullYear() === startDate.getFullYear() && curr.getMonth() === startDate.getMonth())
        ? startDate.getDate()
        : 1;

      const lastDay = (curr.getFullYear() === endDate.getFullYear() && curr.getMonth() === endDate.getMonth())
        ? endDate.getDate()
        : monthDays;

      const eligibleDays = lastDay - firstDay + 1;
      const amount = Math.round((monthlyDiff * eligibleDays) / monthDays);
      total += amount;

      details.push({
        month: `${year}-${String(month).padStart(2, '0')}`,
        eligible_days: eligibleDays,
        month_days: monthDays,
        amount,
      });

      curr.setMonth(curr.getMonth() + 1);
    }

    const result: RetroactivePayResult = {
      old_annual: retroForm.oldPay,
      new_annual: retroForm.newPay,
      monthly_difference: Math.round(monthlyDiff),
      total: Math.round(total),
      start: retroForm.start,
      end: retroForm.end,
      details,
    };

    setRetroResult(result);
    showToast(`${retroForm.employee} 소급 계산 완료!`);
  };

  // Handle Save Record Form
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordFormData.title || !recordFormData.date) {
      showToast('업무명과 기준일은 필수 항목입니다.');
      return;
    }

    if (editingRecord) {
      setRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? { ...r, ...recordFormData } : r))
      );
      showToast('업무 정보가 수정되었습니다.');
    } else {
      const newRec: GARecord = {
        id: Date.now(),
        company_id: selectedCompany,
        module: selectedModuleKey === 'dashboard' ? 'expenses' : selectedModuleKey,
        title: recordFormData.title || '새 업무',
        date: recordFormData.date || new Date().toISOString().slice(0, 10),
        status: recordFormData.status || '진행중',
        manager: recordFormData.manager || Storage.getUserProfile().name,
        ledger_type: mealTab === 'receipts' ? 'receipts' : 'issuance',
        payroll_type: payTab === 'retro' ? 'annual' : payTab,
        ...recordFormData,
      };
      setRecords((prev) => [newRec, ...prev]);
      showToast('새 업무 대장이 등록되었습니다.');
    }

    setIsRecordModalOpen(false);
    setEditingRecord(null);
    setRecordFormData({});
  };

  // Handle Delete Record
  const handleDeleteRecord = (id: number) => {
    if (!confirm(`ID ${id} 업무를 삭제하시겠습니까?`)) return;
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showToast('삭제 완료되었습니다.');
  };

  // Handle Quick Add Card Expense
  const handleAddCardQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardQuickForm.merchant || !cardQuickForm.amount) {
      showToast('사용처와 금액을 입력하세요.');
      return;
    }
    const newCardRec: GARecord = {
      id: Date.now(),
      company_id: selectedCompany,
      module: 'cards',
      title: `${cardQuickForm.date} ${cardQuickForm.merchant} 법인카드 사용`,
      date: cardQuickForm.date,
      status: '등록완료',
      manager: cardQuickForm.user,
      card: cardQuickForm.card,
      user: cardQuickForm.user,
      merchant: cardQuickForm.merchant,
      amount: Number(cardQuickForm.amount),
      purpose: cardQuickForm.purpose,
    };
    setRecords((prev) => [newCardRec, ...prev]);
    setCardQuickForm({
      date: new Date().toISOString().slice(0, 10),
      card: '신한법인 (8841)',
      user: Storage.getUserProfile().name,
      merchant: '',
      amount: 0,
      purpose: '',
    });
    showToast('법인카드 사용 내역이 등록되었습니다.');
  };

  // Approve a specific pending expense record — flips its own status to
  // '승인완료' instead of always inserting the same hardcoded record.
  const handleApproveExpense = (id: number) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: '승인완료' } : r)));
    showToast('경비 승인이 지출 대장에 반영되었습니다.');
  };

  // Handle Export Table
  const handleExportData = async (format: 'xlsx' | 'docx') => {
    const exportList = filteredRecords.length > 0 ? filteredRecords : records;
    if (format === 'xlsx') {
      const headerRow = ['ID', '업무명', '기준일', '처리상태', '담당자', '대상/거래처', '금액/수량', '비고'];
      const dataRows = exportList.map((r) => [
        r.id,
        r.title,
        r.date,
        r.status,
        r.manager || '-',
        r.vendor || r.employee || r.merchant || '',
        r.amount ? Number(r.amount) : (r.quantity ? Number(r.quantity) : ''),
        r.note || '',
      ]);
      exportToExcel(
        [
          {
            sheetName: `${selectedCompany}_총무대장`,
            data: [headerRow, ...dataRows],
          },
        ],
        `${selectedCompany}_총무업무대장_${new Date().toISOString().slice(0, 10)}`
      );
      showToast('엑셀(.xlsx) 파일이 다운로드되었습니다.');
    } else if (format === 'docx') {
      const docxText = `# ${selectedCompany} 총무 워크스페이스 업무 대장 보고서\n\n기준일: ${new Date().toLocaleDateString()}\n담당자: ${Storage.getUserProfile().name}\n\n| ID | 업무명 | 기준일 | 상태 | 담당자 | 비고 |\n|---|---|---|---|---|---|\n` +
        exportList.map((r) => `| ${r.id} | ${r.title} | ${r.date} | ${r.status} | ${r.manager || '-'} | ${r.note || '-'} |`).join('\n');
      await exportMarkdownToDocx(
        `${selectedCompany}_총무대장보고서_${new Date().toISOString().slice(0, 10)}`,
        docxText
      );
      showToast('워드(.docx) 문서가 다운로드되었습니다.');
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-7xl flex-col px-3 py-3 sm:px-6">
      {/* Top Header: Company Channel & Quick Actions */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-md backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* Channel Selector */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              onClick={() => setSelectedCompany('HANYANG')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                selectedCompany === 'HANYANG'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-black">HY</span>
              <span>한양고속</span>
            </button>
            <button
              onClick={() => setSelectedCompany('CHUNGNAM')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedCompany === 'CHUNGNAM'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px]">CN</span>
              <span>충남고속</span>
              <span className="text-[10px] text-slate-500">(연동 준비)</span>
            </button>
          </div>

          <div className="hidden h-5 w-px bg-slate-800 md:block" />

          {/* Module Switcher Title */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-orange-500/20 px-2 py-1 text-xs font-bold text-orange-300">
              {currentModule?.title || '업무 대시보드'}
            </span>
            <span className="text-xs text-slate-400 hidden lg:inline">
              한양고속 총무부 전용 지능형 워크스페이스
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToNas}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-950/40 px-3 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-900/50 shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>NAS 4,253건 검색기</span>
          </button>

          <button
            onClick={() => {
              onAskAgent(`한양아, 현재 한양고속 ${currentModule?.title || '총무 전체'} 현황과 지출/식권 데이터를 종합 분석해서 보고해줘.`);
              onNavigateToChat();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:from-orange-400 hover:to-amber-500"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>한양 AI 분석 요청</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: Left Module Sidebar + Right Dynamic Panel */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-12">
        {/* Left Sidebar: 14 GA Modules */}
        <div className="flex flex-col gap-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5 shadow-sm lg:col-span-3">
          <button
            onClick={() => setSelectedModuleKey('dashboard')}
            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
              selectedModuleKey === 'dashboard'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>00. 업무 대시보드</span>
            </div>
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
              {records.length}건
            </span>
          </button>

          <div className="my-1.5 h-px bg-slate-800" />
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            총무 14대 관리 업무
          </span>

          <div className="space-y-0.5">
            {HANYANG_MODULES.map((mod, idx) => {
              const count = records.filter((r) => r.module === mod.key).length;
              const isSelected = selectedModuleKey === mod.key;
              return (
                <button
                  key={mod.key}
                  onClick={() => setSelectedModuleKey(mod.key)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                    isSelected
                      ? 'bg-slate-800 text-orange-400 font-bold border border-orange-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-mono text-slate-500">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {getModuleIcon(mod.icon)}
                    <span className="truncate">{mod.title}</span>
                  </div>
                  {count > 0 && (
                    <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Dynamic Module View */}
        <div className="flex flex-col overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm lg:col-span-9">
          {/* VIEW 0: DASHBOARD */}
          {selectedModuleKey === 'dashboard' && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/40 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">한양고속 누적 업무</span>
                    <Building2 className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">{records.length}건</div>
                  <span className="mt-1 block text-xs text-orange-300/80">14개 총무 모듈 통합 연동</span>
                </div>

                <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">8월 식권 회수·수취</span>
                    <Utensils className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">{mealSummary.totalReceived.toLocaleString()}장</div>
                  <span className="mt-1 block text-xs text-blue-300/80">
                    소모율 {mealSummary.consumptionRate}% (지출 {mealSummary.totalExpense.toLocaleString()}원)
                  </span>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">법인카드 8월 한도</span>
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">
                    {cardSummary.totalAmount.toLocaleString()}원
                  </div>
                  <span className="mt-1 block text-xs text-emerald-300/80">
                    500만원 중 잔여 {cardSummary.remaining.toLocaleString()}원 ({cardSummary.usageRate}% 소진)
                  </span>
                </div>
              </div>

              {/* 14 Modules Quick Grid */}
              <div>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  총무 업무 모듈 바로가기
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {HANYANG_MODULES.map((mod) => {
                    const count = records.filter((r) => r.module === mod.key).length;
                    return (
                      <button
                        key={mod.key}
                        onClick={() => setSelectedModuleKey(mod.key)}
                        className="flex flex-col items-start justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-orange-500/60 hover:bg-slate-800/80"
                      >
                        <div className="flex items-center gap-2 text-orange-400">
                          {getModuleIcon(mod.icon)}
                          <span className="text-xs font-bold text-slate-200">{mod.title}</span>
                        </div>
                        <span className="mt-2 text-[11px] text-slate-400">{count}건 등록됨 →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1: MEAL COUPONS (식권 관리) */}
          {selectedModuleKey === 'meal_coupons' && (
            <div className="space-y-4">
              {/* Sub-navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1">
                  <button
                    onClick={() => setMealTab('issuance')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      mealTab === 'issuance' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    식권 발급 대장
                  </button>
                  <button
                    onClick={() => setMealTab('receipts')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      mealTab === 'receipts' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    식권 수취 보고 대장
                  </button>
                  <button
                    onClick={() => setMealTab('prices')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      mealTab === 'prices' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    식당별 단가 관리
                  </button>
                  <button
                    onClick={() => setMealTab('analytics')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      mealTab === 'analytics' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    기간별 사용 분석
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={ocrFileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleOcrFileSelected}
                  />
                  <button
                    onClick={() => ocrFileInputRef.current?.click()}
                    disabled={isOcrLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-2.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-900/50 disabled:opacity-50"
                  >
                    <Scan className="h-3.5 w-3.5" />
                    <span>{isOcrLoading ? 'OCR 인식 중...' : '수취 PDF/사진 OCR'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingRecord(null);
                      setRecordFormData({
                        title: mealTab === 'receipts' ? '2026년 8월 식권 수취 보고' : '2026년 9월 식권 발급 현황',
                        date: new Date().toISOString().slice(0, 10),
                        status: '진행중',
                        manager: Storage.getUserProfile().name,
                      });
                      setIsRecordModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-orange-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ 새 대장 등록</span>
                  </button>
                </div>
              </div>

              {/* Sub-tab 1 & 2: Meal Records Table */}
              {(mealTab === 'issuance' || mealTab === 'receipts') && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300">
                    💡 <strong>{mealTab === 'issuance' ? '식권 발급 대장' : '식권 수취 보고 대장'}</strong>: 제목을 누르면 상세 시트를 열 수 있으며, 실시간 수량 및 단가 관리가 가능합니다.
                  </div>
                  {/* Table rendering will be in common table section */}
                </div>
              )}

              {/* Sub-tab 3: Restaurant Meal Prices */}
              {mealTab === 'prices' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      영업소별 지정 식당 단가 ({mealPrices.length}개소)
                    </span>
                    <button
                      onClick={() => {
                        setEditingPrice(null);
                        setPriceFormData({ unit_price: 7000, effective_from: '2026-01-01', status: '사용중' });
                        setIsPriceModalOpen(true);
                      }}
                      className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-500"
                    >
                      + 새 식당 단가 등록
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 bg-slate-900 text-slate-400">
                        <tr>
                          <th className="p-2.5">식당명 / 영업소</th>
                          <th className="p-2.5">식권 단가</th>
                          <th className="p-2.5">적용 시작일</th>
                          <th className="p-2.5">상태</th>
                          <th className="p-2.5">비고</th>
                          <th className="p-2.5 text-right">작업</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {mealPrices.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-900/50">
                            <td className="p-2.5 font-semibold text-white">{p.restaurant}</td>
                            <td className="p-2.5 text-orange-300 font-mono font-bold">
                              {p.unit_price.toLocaleString()}원
                            </td>
                            <td className="p-2.5 text-slate-400">{p.effective_from}</td>
                            <td className="p-2.5">
                              <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/30">
                                {p.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400">{p.note || '-'}</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => {
                                  setMealPrices((prev) => prev.filter((item) => item.id !== p.id));
                                  showToast('식당 단가가 삭제되었습니다.');
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Meal Analytics */}
              {mealTab === 'analytics' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[11px] text-slate-400">총 발급 수량</span>
                      <strong className="mt-1 block text-lg text-white font-mono">
                        {mealSummary.totalIssued.toLocaleString()}장
                      </strong>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[11px] text-slate-400">총 수취·회수량</span>
                      <strong className="mt-1 block text-lg text-emerald-400 font-mono">
                        {mealSummary.totalReceived.toLocaleString()}장
                      </strong>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[11px] text-slate-400">발급 대비 소모율</span>
                      <strong className="mt-1 block text-lg text-blue-400 font-mono">
                        {mealSummary.consumptionRate}%
                      </strong>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[11px] text-slate-400">장당 평균 단가</span>
                      <strong className="mt-1 block text-lg text-amber-400 font-mono">
                        {mealSummary.avgPrice.toLocaleString()}원
                      </strong>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[11px] text-slate-400">총 식권 정산 지출</span>
                      <strong className="mt-1 block text-lg text-orange-400 font-mono">
                        {mealSummary.totalExpense.toLocaleString()}원
                      </strong>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h4 className="text-xs font-bold text-slate-200 mb-3">
                      월별 식권 발급/수취 추이
                    </h4>
                    {mealMonthlyTrend.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-500">아직 등록된 식권 대장이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {mealMonthlyTrend.map((item) => (
                          <div key={item.month} className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>{item.month}</span>
                              <span>
                                발급 {item.issued}장 | 수취 {item.received}장 | 지출 {item.expense.toLocaleString()}원
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                              <div
                                style={{ width: `${item.issued ? (item.received / item.issued) * 100 : 0}%` }}
                                className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: PAYROLL & RETROACTIVE PAY CALCULATOR */}
          {selectedModuleKey === 'payroll' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1">
                  <button
                    onClick={() => setPayTab('annual')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      payTab === 'annual' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    연봉제 임금 조견표
                  </button>
                  <button
                    onClick={() => setPayTab('driver')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      payTab === 'driver' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    운전기사 임금 조견표
                  </button>
                  <button
                    onClick={() => setPayTab('retro')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      payTab === 'retro' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡️ 소급분 실시간 계산기
                  </button>
                  <button
                    onClick={() => setPayTab('payroll')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      payTab === 'payroll' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pay Roll 급여대장
                  </button>
                </div>

                <button
                  onClick={() => {
                    setEditingRecord(null);
                    setRecordFormData({
                      title: '2026년 임금 조견표 항목',
                      date: new Date().toISOString().slice(0, 10),
                      status: '진행중',
                      manager: Storage.getUserProfile().name,
                    });
                    setIsRecordModalOpen(true);
                  }}
                  className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-orange-400"
                >
                  + 새 임금표 등록
                </button>
              </div>

              {/* RETROACTIVE PAY CALCULATOR */}
              {payTab === 'retro' && (
                <div className="rounded-2xl border border-blue-500/40 bg-slate-950 p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-blue-400" />
                        한양고속 임금 인상 소급분 실시간 일할 계산기
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        월별 연봉 차액을 계산하고, 소급 시작·종료월은 실제 일수(28/30/31일)로 정확하게 일할 계산합니다.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCalculateRetro} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">직원명 / 대상</label>
                      <input
                        type="text"
                        value={retroForm.employee}
                        onChange={(e) => setRetroForm({ ...retroForm, employee: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">기존 연봉 (원)</label>
                      <input
                        type="number"
                        value={retroForm.oldPay}
                        onChange={(e) => setRetroForm({ ...retroForm, oldPay: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">인상 연봉 (원)</label>
                      <input
                        type="number"
                        value={retroForm.newPay}
                        onChange={(e) => setRetroForm({ ...retroForm, newPay: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">소급 시작일</label>
                      <input
                        type="date"
                        value={retroForm.start}
                        onChange={(e) => setRetroForm({ ...retroForm, start: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">소급 종료일</label>
                      <input
                        type="date"
                        value={retroForm.end}
                        onChange={(e) => setRetroForm({ ...retroForm, end: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md"
                      >
                        ⚡️ 소급분 일할 계산 실행
                      </button>
                    </div>
                  </form>

                  {/* Result Panel */}
                  {retroResult && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-xs text-slate-400">{retroForm.employee} 소급 총 지급액</span>
                          <div className="text-2xl font-black text-blue-400 font-mono">
                            {retroResult.total.toLocaleString()}원
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>월 인상 차액: <strong className="text-white">{retroResult.monthly_difference.toLocaleString()}원</strong></div>
                          <div>소급 기간: {retroResult.start} ~ {retroResult.end}</div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-1.5">적용월</th>
                              <th className="py-1.5">일수 계산</th>
                              <th className="py-1.5 text-right">월별 소급 지급액</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {retroResult.details.map((row) => (
                              <tr key={row.month}>
                                <td className="py-1.5 font-medium text-white">{row.month}</td>
                                <td className="py-1.5 text-slate-400">
                                  {row.eligible_days}일 / {row.month_days}일 기준
                                </td>
                                <td className="py-1.5 text-right font-mono font-bold text-emerald-400">
                                  {row.amount.toLocaleString()}원
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: EXPENSES (경비·고정비) */}
          {selectedModuleKey === 'expenses' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1">
                  <button
                    onClick={() => setExpenseTab('contracts')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      expenseTab === 'contracts' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    통합 계약관리대장
                  </button>
                  <button
                    onClick={() => setExpenseTab('ledger')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      expenseTab === 'ledger' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    경비지출 대장
                  </button>
                  <button
                    onClick={() => setExpenseTab('approval')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      expenseTab === 'approval' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    경비승인 명세서
                  </button>
                  <button
                    onClick={() => setExpenseTab('analytics')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      expenseTab === 'analytics' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    지출 통계 분석
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingRecord(null);
                      setRecordFormData({
                        title: '2026년 8월 경비 지출건',
                        date: new Date().toISOString().slice(0, 10),
                        status: '진행중',
                        manager: Storage.getUserProfile().name,
                      });
                      setIsRecordModalOpen(true);
                    }}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-orange-400"
                  >
                    + 새 경비 등록
                  </button>
                </div>
              </div>

              {expenseTab === 'ledger' && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300">
                  💡 <strong>경비지출 대장</strong>: 등록된 모든 경비 건은 아래 공용 대장 표에서 검색·정렬·수정·삭제할 수 있습니다.
                  승인이 필요한 건은 <strong>경비승인 명세서</strong> 탭에서 처리하세요.
                </div>
              )}

              {expenseTab === 'approval' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200">
                    승인 대기 중인 경비 ({pendingExpenseApprovals.length}건)
                  </h4>
                  {pendingExpenseApprovals.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-500">승인 대기 중인 경비가 없습니다.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="p-2">업무명</th>
                            <th className="p-2">거래처</th>
                            <th className="p-2">계정과목</th>
                            <th className="p-2">금액</th>
                            <th className="p-2">상태</th>
                            <th className="p-2 text-right">작업</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                          {pendingExpenseApprovals.map((r) => (
                            <tr key={r.id}>
                              <td className="p-2 font-semibold text-white">{r.title}</td>
                              <td className="p-2 text-slate-400">{r.vendor || '-'}</td>
                              <td className="p-2 text-slate-400">{r.category || '-'}</td>
                              <td className="p-2 font-mono">{r.amount ? `${Number(r.amount).toLocaleString()}원` : '-'}</td>
                              <td className="p-2">{r.status}</td>
                              <td className="p-2 text-right">
                                <button
                                  onClick={() => handleApproveExpense(r.id)}
                                  className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>승인 완료·지출 반영</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {expenseTab === 'analytics' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <span className="text-[11px] text-slate-500">총 지출 건수</span>
                      <p className="mt-1 font-mono text-lg font-bold text-white">{expenseSummary.count}건</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <span className="text-[11px] text-slate-500">총 지출액</span>
                      <p className="mt-1 font-mono text-lg font-bold text-white">{expenseSummary.totalAmount.toLocaleString()}원</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <span className="text-[11px] text-slate-500">건당 평균</span>
                      <p className="mt-1 font-mono text-lg font-bold text-white">{expenseSummary.avgAmount.toLocaleString()}원</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">계정과목별 지출 분포</h4>
                    {expenseCategoryBreakdown.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-500">아직 등록된 경비가 없습니다.</p>
                    ) : (
                      expenseCategoryBreakdown.map(({ category, amount }) => {
                        const pct = expenseSummary.totalAmount ? Math.round((amount / expenseSummary.totalAmount) * 100) : 0;
                        return (
                          <div key={category} className="space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-300">
                              <span>{category}</span>
                              <span className="font-mono">{amount.toLocaleString()}원 ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {expenseTab === 'contracts' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200">
                    한양고속 본사 및 영업소 통합 계약관리 현황
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-2">계약종류</th>
                          <th className="p-2">계약서명</th>
                          <th className="p-2">시작일</th>
                          <th className="p-2">종료일</th>
                          <th className="p-2">보증금</th>
                          <th className="p-2">월 비용</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        <tr>
                          <td className="p-2 font-semibold text-orange-300">숙소 임대차</td>
                          <td className="p-2">고양 백석 합숙소 301호</td>
                          <td className="p-2 text-slate-400">2025-05-01</td>
                          <td className="p-2 text-slate-400">2027-04-30</td>
                          <td className="p-2 font-mono">10,000,000원</td>
                          <td className="p-2 font-mono font-bold text-white">350,000원</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-orange-300">전산 렌탈</td>
                          <td className="p-2">본사/영업소 복합기 12대</td>
                          <td className="p-2 text-slate-400">2024-01-01</td>
                          <td className="p-2 text-slate-400">2026-12-31</td>
                          <td className="p-2 font-mono">0원</td>
                          <td className="p-2 font-mono font-bold text-white">1,240,000원</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: CORPORATE CARDS (법인카드) */}
          {selectedModuleKey === 'cards' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1">
                  <button
                    onClick={() => setCardTab('ledger')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      cardTab === 'ledger' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    실시간 사용내역 즉시 등록
                  </button>
                  <button
                    onClick={() => setCardTab('analytics')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      cardTab === 'analytics' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    월 한도 500만원 분석
                  </button>
                </div>
              </div>

              {/* Monthly Limit Progress Bar */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    8월 법인카드 총 사용액: <strong className="text-white font-mono">{cardSummary.totalAmount.toLocaleString()}원</strong>
                  </span>
                  <span className={`font-bold ${cardSummary.isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                    월 한도 {cardSummary.monthlyLimit.toLocaleString()}원 ({cardSummary.usageRate}% 소진)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, cardSummary.usageRate)}%` }}
                    className={`h-full rounded-full ${
                      cardSummary.isOver ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-amber-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>잔여 한도: {cardSummary.remaining.toLocaleString()}원</span>
                  <span>결제 {cardSummary.count}건</span>
                </div>
              </div>

              {cardTab === 'ledger' && (
                <form onSubmit={handleAddCardQuick} className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-3">
                  <span className="text-xs font-bold text-slate-300">법인카드 결제 직후 1초 빠른 등록</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <input
                      type="date"
                      value={cardQuickForm.date}
                      onChange={(e) => setCardQuickForm({ ...cardQuickForm, date: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="사용처 (예: GS칼텍스)"
                      value={cardQuickForm.merchant}
                      onChange={(e) => setCardQuickForm({ ...cardQuickForm, merchant: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="결제금액 (원)"
                      value={cardQuickForm.amount || ''}
                      onChange={(e) => setCardQuickForm({ ...cardQuickForm, amount: Number(e.target.value) })}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="사용목적 (예: 차량주유)"
                      value={cardQuickForm.purpose}
                      onChange={(e) => setCardQuickForm({ ...cardQuickForm, purpose: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-orange-400"
                    >
                      카드 결제 즉시 등록
                    </button>
                  </div>
                </form>
              )}

              {cardTab === 'analytics' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">사용목적별 지출 분포 (총 {cardSummary.count}건)</h4>
                  {cardPurposeBreakdown.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-500">아직 등록된 카드 사용 내역이 없습니다.</p>
                  ) : (
                    cardPurposeBreakdown.map(({ purpose, amount }) => {
                      const pct = cardSummary.totalAmount ? Math.round((amount / cardSummary.totalAmount) * 100) : 0;
                      return (
                        <div key={purpose} className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-300">
                            <span>{purpose}</span>
                            <span className="font-mono">{amount.toLocaleString()}원 ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* GENERIC MODULE VIEW — the other 10 modules (영세 청소도급,
              출장비 정산, 피복 지급, 사규·규정, 급여 가불, 보건·검진, 채용,
              교육·안전, 비품·소모품, 시설·합숙소) don't have a bespoke
              screen like the 4 above, but the record table right below
              already lists/filters/edits/deletes their data — the only
              thing missing was a way to add a record, since the dynamic
              form above (driven by currentModule.fields) now handles the
              module-specific fields for any module. */}
          {currentModule &&
            !['dashboard', 'meal_coupons', 'payroll', 'expenses', 'cards'].includes(selectedModuleKey) && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">{currentModule.description}</p>
                <button
                  onClick={() => {
                    setEditingRecord(null);
                    setRecordFormData({});
                    setIsRecordModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-orange-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ 새 업무 등록</span>
                </button>
              </div>
            )}

          {/* COMMON RECORDS TABLE FOR ALL MODULES */}
          <div className="mt-4 space-y-3">
            {/* Toolbar: Search, Status Filter, Export */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="대장 내 모든 데이터 실시간 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">모든 처리상태</option>
                  <option value="진행중">진행중</option>
                  <option value="승인완료">승인완료</option>
                  <option value="완료">완료</option>
                  <option value="등록완료">등록완료</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleExportData('xlsx')}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500 hover:text-emerald-300"
                  title="엑셀(.xlsx)로 내보내기"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>XLSX</span>
                </button>

                <button
                  onClick={() => handleExportData('docx')}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500 hover:text-blue-300"
                  title="워드(.docx) 보고서로 내보내기"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  <span>DOCX</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400">
                  <tr>
                    <th className="p-3">업무명 (시트 열기)</th>
                    <th className="p-3">기준일</th>
                    <th className="p-3">상태</th>
                    <th className="p-3">담당자</th>
                    <th className="p-3">주요 내용 / 금액</th>
                    <th className="p-3 text-right">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        등록된 업무 데이터가 없습니다. 상단에서 새 대장을 등록해보세요.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setActiveSheetRecord(rec);
                              setIsSheetModalOpen(true);
                            }}
                            className="font-bold text-orange-300 hover:text-orange-200 underline underline-offset-4 text-left"
                          >
                            {rec.title}
                          </button>
                        </td>
                        <td className="p-3 text-slate-400">{rec.date}</td>
                        <td className="p-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            rec.status.includes('완료')
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{rec.manager || '-'}</td>
                        <td className="p-3 font-mono text-slate-300">
                          {rec.amount ? `${Number(rec.amount).toLocaleString()}원` : rec.quantity ? `${rec.quantity}매` : rec.vendor || rec.employee || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingRecord(rec);
                                setRecordFormData(rec);
                                setIsRecordModalOpen(true);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Record Create/Edit Dialog */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingRecord ? '총무 업무 정보 수정' : '새 총무 대장 등록'}
              </h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">업무명 *</label>
                <input
                  type="text"
                  value={recordFormData.title || ''}
                  onChange={(e) => setRecordFormData({ ...recordFormData, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              {/* Fields are driven by the selected module's own schema
                  (HANYANG_MODULES[].fields, which already includes the
                  common title/date/status/manager/deadline/note fields) so
                  every module — not just the 4 that used to have a bespoke
                  form — captures its real data (amount, vendor, employee...). */}
              <div className="grid grid-cols-2 gap-3">
                {(currentModule?.fields || GA_COMMON_FIELDS)
                  .filter((field) => field.key !== 'title')
                  .map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {field.label}
                        {field.required ? ' *' : ''}
                      </label>
                      {field.key === 'status' ? (
                        <select
                          value={recordFormData.status || '진행중'}
                          onChange={(e) => setRecordFormData({ ...recordFormData, status: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                        >
                          <option value="진행중">진행중</option>
                          <option value="승인완료">승인완료</option>
                          <option value="완료">완료</option>
                          <option value="대기">대기</option>
                        </select>
                      ) : (
                        <input
                          type={
                            field.kind === 'date'
                              ? 'date'
                              : field.kind === 'money' || field.kind === 'integer'
                              ? 'number'
                              : 'text'
                          }
                          value={recordFormData[field.key] ?? ''}
                          onChange={(e) =>
                            setRecordFormData({
                              ...recordFormData,
                              [field.key]:
                                field.kind === 'money' || field.kind === 'integer'
                                  ? e.target.value === ''
                                    ? ''
                                    : Number(e.target.value)
                                  : e.target.value,
                            })
                          }
                          placeholder={field.key === 'manager' ? Storage.getUserProfile().name : undefined}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-orange-400"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Fullscreen Interactive Sheet Viewer */}
      {isSheetModalOpen && activeSheetRecord && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 p-3 sm:p-6 animate-in fade-in">
          <div className="flex items-center justify-between rounded-t-2xl border border-slate-800 bg-slate-900 px-4 py-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                HANYANG UNIVER SHEET · INTERACTIVE SPREADSHEET
              </span>
              <h3 className="text-base font-bold text-white leading-tight">
                {activeSheetRecord.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onAskAgent(`"${activeSheetRecord.title}" 시트의 셀 데이터와 합계 수식을 분석하고 최적화해줘.`);
                  setIsSheetModalOpen(false);
                  onNavigateToChat();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:from-orange-400 hover:to-amber-500"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI 시트 도우미</span>
              </button>
              <button
                onClick={() => {
                  setEditingRecord(activeSheetRecord);
                  setRecordFormData(activeSheetRecord);
                  setIsSheetModalOpen(false);
                  setIsRecordModalOpen(true);
                }}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 shadow-sm"
              >
                항목 수정
              </button>
              <button
                onClick={() => setIsSheetModalOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded-b-2xl border-x border-b border-slate-800 bg-slate-900/90 p-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-300">
                  표 데이터 그리드 (Excel 호환 매트릭스)
                </span>
                <span className="text-xs text-slate-500">
                  행 / 열 데이터 실시간 수식 (=SUM, =AVERAGE) 지원
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800">
                  <thead className="bg-slate-800 text-slate-300 font-bold">
                    <tr>
                      <th className="p-2 border border-slate-700 w-10">#</th>
                      <th className="p-2 border border-slate-700 w-48">항목</th>
                      <th className="p-2 border border-slate-700">값</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {(HANYANG_MODULES.find((m) => m.key === activeSheetRecord.module)?.fields || GA_COMMON_FIELDS)
                      .map((field, idx) => {
                        const value = (activeSheetRecord as Record<string, unknown>)[field.key];
                        if (value === undefined || value === null || value === '') return null;
                        return (
                          <tr key={field.key} className="hover:bg-slate-900">
                            <td className="p-2 border border-slate-800 font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2 border border-slate-800 font-medium text-white">{field.label}</td>
                            <td className="p-2 border border-slate-800 font-mono text-orange-300">
                              {field.kind === 'money' ? `${Number(value).toLocaleString()}원` : String(value)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OCR Preview Modal — shows the real Gemini Vision parse of the
          uploaded receipt/PDF and, on confirm, actually creates a record
          from it (the old version only showed a toast and saved nothing). */}
      {isOcrModalOpen && ocrResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scan className="h-4 w-4 text-purple-400" />
                식권 수취 OCR 인식 결과
              </h3>
              <button onClick={() => setIsOcrModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-2">
              <div className="text-slate-400">
                인식된 파일: <strong className="text-white">{ocrResult.filename}</strong>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                <div>거래처: <strong className="text-white">{ocrResult.vendor || '-'}</strong></div>
                <div>일자: <strong className="text-white">{ocrResult.date || '-'}</strong></div>
                <div>분류: <strong className="text-white">{ocrResult.category || '-'}</strong></div>
                <div>결제수단: <strong className="text-white">{ocrResult.paymentMethod || '-'}</strong></div>
              </div>
              {ocrResult.rows.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {ocrResult.rows.map((row, idx) => (
                    <div key={idx} className="rounded bg-slate-900 p-2 text-slate-300 font-mono">
                      {[row.item, row.quantity, row.unitPrice?.toLocaleString(), row.amount?.toLocaleString()]
                        .filter((v) => v !== undefined && v !== null)
                        .join(' | ')}
                    </div>
                  ))}
                </div>
              )}
              <div className="text-right text-sm font-bold text-white pt-1 border-t border-slate-800">
                합계: {(ocrResult.totalAmount || 0).toLocaleString()}원
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsOcrModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  const totalQty = ocrResult.rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
                  const newRec: GARecord = {
                    id: Date.now(),
                    company_id: selectedCompany,
                    module: 'meal_coupons',
                    title: ocrResult.title || `${ocrResult.filename} OCR 인식`,
                    date: ocrResult.date || new Date().toISOString().slice(0, 10),
                    status: '등록완료',
                    manager: ocrResult.manager || Storage.getUserProfile().name,
                    employee: ocrResult.vendor,
                    received_quantity: totalQty || undefined,
                    unit_price: ocrResult.rows[0]?.unitPrice,
                    amount: ocrResult.totalAmount,
                    note: ocrResult.note,
                    ledger_type: 'receipts',
                  };
                  setRecords((prev) => [newRec, ...prev]);
                  setIsOcrModalOpen(false);
                  showToast('OCR 결과가 식권 수취 대장에 실제로 추가되었습니다.');
                }}
                className="rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500"
              >
                시트에 자동 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-orange-500/50 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-in slide-in-from-bottom duration-200">
          <Check className="h-4 w-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
