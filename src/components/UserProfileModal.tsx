import React, { useState } from 'react';
import { X, User, Plus, Trash2, Heart, Target, Sparkles, MessageCircle } from 'lucide-react';
import { UserProfile, HonorificStyle } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<UserProfile>({ ...userProfile });
  const [newInterest, setNewInterest] = useState('');
  const [newValue, setNewValue] = useState('');

  if (!isOpen) return null;

  const handleAddInterest = () => {
    if (!newInterest.trim()) return;
    if (!formData.interests.includes(newInterest.trim())) {
      setFormData({ ...formData, interests: [...formData.interests, newInterest.trim()] });
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (item: string) => {
    setFormData({ ...formData, interests: formData.interests.filter((i) => i !== item) });
  };

  const handleAddValue = () => {
    if (!newValue.trim()) return;
    if (!formData.values.includes(newValue.trim())) {
      setFormData({ ...formData, values: [...formData.values, newValue.trim()] });
    }
    setNewValue('');
  };

  const handleRemoveValue = (item: string) => {
    setFormData({ ...formData, values: formData.values.filter((v) => v !== item) });
  };

  const handleSave = () => {
    onSaveProfile(formData);
    onClose();
  };

  const honorificOptions: HonorificStyle[] = [
    '존댓말 (다정하고 정중한 어조)',
    '반말 (친근하고 격없는 친구 어조)',
    '전문적이고 간결한 보고체',
    '따뜻한 멘토 스타일',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-white/20 bg-[#0D0D0D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/5 font-serif italic text-lg text-white/90">
              <User className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 block">User Dossier Configuration</span>
              <h2 className="font-serif text-lg font-bold text-white">사용자 프로필 (About Me)</h2>
              <p className="text-xs text-white/50">에이전트가 나를 더 깊이 이해하고 맞춤 조언을 건넬 수 있도록 정보를 정밀하게 기록합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name & Role */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">이름 / 호칭</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                placeholder="예: 지호"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">직업 / 역할 / 사명</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                placeholder="예: 프로덕트 디자이너 & 개발자"
              />
            </div>
          </div>

          {/* Current Focus */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1 font-serif italic">
              <Target className="h-3.5 w-3.5 text-white/60" />
              <span>현재 가장 집중하고 있는 핵심 과업 / 목표</span>
            </label>
            <textarea
              rows={2}
              value={formData.currentFocus}
              onChange={(e) => setFormData({ ...formData, currentFocus: e.target.value })}
              className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
              placeholder="예: 이번 분기 안에 사이드 프로젝트 런칭하기, 주 3회 운동 루틴 사수하기"
            />
          </div>

          {/* Speaking Style Preference */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-2 font-serif italic">
              <MessageCircle className="h-3.5 w-3.5 text-white/60" />
              <span>선호하는 에이전트 대화 어조</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {honorificOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFormData({ ...formData, honorificStyle: opt })}
                  className={`border px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200 ${
                    formData.honorificStyle === opt
                      ? 'border-white bg-white/[0.08] text-white shadow-sm'
                      : 'border-white/10 bg-black/40 text-white/50 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Interests Tags */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1 font-serif italic">
              <Sparkles className="h-3.5 w-3.5 text-white/60" />
              <span>관심사 & 탐구 분야 (키워드)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.interests.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1 border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/90"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(item)}
                    className="text-white/40 hover:text-white transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                className="flex-1 border border-white/15 bg-black/90 px-3.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                placeholder="새 관심사 추가 후 Enter (예: AI Agent, 미니멀리즘, 서예)"
              />
              <button
                type="button"
                onClick={handleAddInterest}
                className="border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Core Values */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1 font-serif italic">
              <Heart className="h-3.5 w-3.5 text-white/60" />
              <span>나의 핵심 가치관 & 행동 원칙</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.values.map((val) => (
                <span
                  key={val}
                  className="flex items-center gap-1 border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/90"
                >
                  {val}
                  <button
                    type="button"
                    onClick={() => handleRemoveValue(val)}
                    className="text-white/40 hover:text-white transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddValue())}
                className="flex-1 border border-white/15 bg-black/90 px-3.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
                placeholder="새 가치관 추가 후 Enter (예: 절제, 꾸준함, 주체성)"
              />
              <button
                type="button"
                onClick={handleAddValue}
                className="border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Custom Notes / Quirks */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1 font-serif italic">
              에이전트에게 특별히 알려주고 싶은 나만의 특성 / 습관 / 취향 메모
            </label>
            <textarea
              rows={3}
              value={formData.customNotes}
              onChange={(e) => setFormData({ ...formData, customNotes: e.target.value })}
              className="w-full border border-white/15 bg-black/90 px-3.5 py-2 text-xs text-white/90 placeholder-white/30 focus:border-white/50 focus:outline-none"
              placeholder="예: 긴 설명보다는 핵심 요약과 예시를 좋아함. 오전에는 집중도가 높고 오후 3시경에는 리프레시가 필요함."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-black/80 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white transition"
          >
            닫기
          </button>
          <button
            onClick={handleSave}
            className="border border-white/40 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white/90 shadow-md transition"
          >
            프로필 저장
          </button>
        </div>
      </div>
    </div>
  );
};
