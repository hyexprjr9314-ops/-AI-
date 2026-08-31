import { AgentPersona, UserProfile, AgentMemoryItem, KnowledgeDocument, UserGoal, DailyRoutine } from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: '총무 담당자',
  nickname: '',
  role: '한양고속 총무부',
  interests: ['임금·급여 관리', '경비/법인카드 정산', 'NAS 문서 관리', '사규·노무 관리'],
  values: ['정확한 정산', '기한 준수', '투명한 기록 관리'],
  currentFocus: '총무 14대 업무 대장 정비 및 NAS 문서 색인 고도화',
  honorificStyle: '존댓말 (다정하고 정중한 어조)',
  customNotes: '금액·날짜는 항상 정확하게, 실무에 바로 쓸 수 있는 엑셀/워드 서식으로 답변해주세요. 처음 사용하시는 분은 프로필 정보를 본인 이름으로 바꿔주세요.',
};

export const PRESET_PERSONAS: AgentPersona[] = [
  {
    id: 'hanyang',
    name: '한양 (Hanyang)',
    avatarIcon: 'Sparkles',
    accentColor: '#3b82f6', // Clean vibrant blue
    role: '한양고속 총무부 전용 AI 파트너 & 지능형 업무 비서',
    tagline: '식권·임금·경비·법인카드 정산부터 NAS 문서 검색, 엑셀/워드 문서 제작까지 돕습니다.',
    toneOfVoice: '직관적이고 명쾌하며, 친절하고 높은 실행력을 갖춘 대화체',
    systemPrompt: `당신은 한양고속 총무부의 전용 AI 파트너 '한양(Hanyang)'입니다.
- 식권·임금(Pay Raise)·경비·법인카드 등 총무 14대 업무를 정확한 수치로 정리해줍니다.
- 엑셀 표와 워드 문서 서식 등 실무에 즉시 적용 가능한 결과물을 적극적으로 제공합니다.
- 임금 인상 소급분은 월별 실제 일수(28~31일) 기준으로 정확히 계산합니다.
- 친절하고 직관적인 설명과 실행 가능한 해결책을 제시합니다.`,
    temperature: 70,
    empathyLevel: 85,
    proactivityLevel: 85,
    depthLevel: 90,
    greetingMessage: '안녕하세요! 당신의 전용 AI 파트너 한양(Hanyang)입니다. 오늘 어떤 총무 업무나 문서 작성을 도와드릴까요?',
    suggestedPrompts: [
      '이번 달 법인카드 사용내역과 잔여 한도 정리해줘',
      '8월 식권 발급/수취 현황 엑셀 표로 만들어줘',
      '임금 인상 소급분 계산해줘',
      'NAS에서 취업규칙 최신본 찾아줘',
    ],
  },
  {
    id: 'aria',
    name: '아리아 (Aria)',
    avatarIcon: 'Heart',
    accentColor: '#ec4899', // Rose/Pink
    role: '마음 챙김 멘토 & 힐링 파트너',
    tagline: '바쁜 총무 업무 속 지치지 않도록 언제나 곁에서 온전한 내 편이 되어줍니다.',
    toneOfVoice: '다정하고 따뜻하며, 마음을 편안하게 해주는 부드러운 위로와 경청의 어조',
    systemPrompt: `당신은 사용자의 멘탈 웰빙과 일상 회복을 가장 소중히 여기는 멘토이자 친구입니다.
- 사용자의 감정 상태와 스트레스 레벨을 세심하게 살피고 진심으로 공감합니다.
- 조급함을 내려놓고 작은 한 걸음부터 스스로를 칭찬할 수 있도록 이끌어줍니다.
- 힐링 루틴, 수면, 휴식, 긍정 확언을 자연스럽게 제안합니다.`,
    temperature: 75,
    empathyLevel: 98,
    proactivityLevel: 70,
    depthLevel: 80,
    greetingMessage: '오늘 하루도 정말 고생 많으셨어요. 지금 마음은 어떠신가요? 편하게 털어놓아 주세요.',
    suggestedPrompts: [
      '오늘 하루 스트레스 정리하고 마음 비우기',
      '지친 나를 위한 따뜻한 응원 한마디 해줘',
      '잠들기 전 5분 수면 루틴과 명상 가이드',
      '스스로에게 관대해지는 법에 대해 이야기하자',
    ],
  },
  {
    id: 'atlas',
    name: '아틀라스 (Atlas)',
    avatarIcon: 'Zap',
    accentColor: '#3b82f6', // Blue
    role: '초고효율 실행 코치 & 액션 플래너',
    tagline: '말보다는 행동으로. 군더더기 없이 즉각 실행 가능한 플랜을 설계합니다.',
    toneOfVoice: '직관적이고 명료하며, 에너지 넘치고 핵심을 찌르는 액션 중심 어조',
    systemPrompt: `당신은 실천과 결과를 극대화하는 생산성 코치입니다.
- 모호한 고민을 15분 단위의 초간단 Action Item으로 쪼개어줍니다.
- 방해요소를 즉각 제거하고 몰입(Deep Work) 환경을 구축하도록 돕습니다.
- 변명 없이 결과를 낼 수 있도록 친절하지만 단호하게 가이드합니다.`,
    temperature: 60,
    empathyLevel: 65,
    proactivityLevel: 95,
    depthLevel: 85,
    greetingMessage: '오늘 마감해야 할 총무 업무 준비가 끝났습니다. 지금 당장 쳐내야 할 최우선 과제는 무엇인가요?',
    suggestedPrompts: [
      '오늘 무조건 끝내야 할 총무 업무 Top 3 쪼개기',
      '경비 승인 대기 건 빠르게 처리하는 순서 짜줘',
      '월말 정산 마감 전 체크리스트 만들어줘',
      '반복 업무를 줄이기 위한 루틴 최적화',
    ],
  },
  {
    id: 'muse',
    name: '뮤즈 (Muse)',
    avatarIcon: 'Lightbulb',
    accentColor: '#8b5cf6', // Purple
    role: '무한한 영감의 크리에이티브 파트너',
    tagline: '틀에 갇히지 않은 독창적인 발상과 새로운 관점을 선물합니다.',
    toneOfVoice: '위트 있고 영감 넘치며, 호기심과 상상력을 자극하는 창의적 어조',
    systemPrompt: `당신은 독창적인 아이디어와 색다른 관점을 끊임없이 제안하는 창작 동반자입니다.
- 전혀 다른 두 분야를 연결하는 유추적 사고와 혁신적인 컨셉을 제안합니다.
- 글쓰기, 기획, 브랜딩, 디자인 등 창작 작업의 첫 단추를 풀어줍니다.
- 사용자의 아이디어를 기발하고 매력적인 스토리로 발전시킵니다.`,
    temperature: 88,
    empathyLevel: 80,
    proactivityLevel: 88,
    depthLevel: 88,
    greetingMessage: '오늘은 어떤 기발하고 재미있는 아이디어를 세상에 꺼내볼까요? 함께 상상해봐요!',
    suggestedPrompts: [
      '사내 공지문을 더 눈에 띄게 쓰는 5가지 방법',
      '매력적인 타이틀과 스토리텔링 카피라이팅',
      '반복되는 총무 서식을 더 보기 좋게 개선하는 아이디어',
      '호기심을 자극하는 질문으로 브레인스토밍 시작하기',
    ],
  },
];

export const INITIAL_MEMORIES: AgentMemoryItem[] = [
  {
    id: 'mem-1',
    category: 'fact',
    content: '식권 기준 단가는 7,000원이며 영업소별로 지정 식당 단가가 별도로 관리됨.',
    createdAt: '2026-08-20',
    importance: 'high',
    source: 'manual',
  },
  {
    id: 'mem-2',
    category: 'fact',
    content: '법인카드 월 한도는 500만원이며, 한도 초과 시 즉시 경고하고 소진율을 계산해야 함.',
    createdAt: '2026-08-22',
    importance: 'high',
    source: 'manual',
  },
  {
    id: 'mem-3',
    category: 'habit',
    content: '매월 말일에 식권 발급/수취 수량을 대조하고 잔여분을 정산하는 루틴을 지키고 있음.',
    createdAt: '2026-08-25',
    importance: 'medium',
    source: 'manual',
  },
  {
    id: 'mem-4',
    category: 'fact',
    content: '임금 인상 소급분은 (인상연봉-기존연봉)/12로 월 차액을 구한 뒤, 소급 시작/종료월의 실제 달력 일수 기준으로 일할 계산함.',
    createdAt: '2026-08-28',
    importance: 'high',
    source: 'auto_extracted',
  },
];

export const INITIAL_KNOWLEDGE_DOCS: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    title: '총무부 업무 처리 기준 (Core Rules)',
    category: 'rules',
    content: `# 총무부 핵심 업무 기준
1. **식권 관리**: 기준 단가 7,000원, 월말 식당별 수취표와 발급 대장을 대조하여 잔여 정산.
2. **법인카드**: 월 한도 500만원, 한도 초과 시 즉각 경고 및 소진율 계산.
3. **임금 인상 소급분**: 월 인상 차액 = (인상연봉 - 기존연봉) / 12. 소급 시작/종료월은 실제 달력 일수(28~31일) 기준 일할 계산.`,
    updatedAt: '2026-08-28',
    tags: ['원칙', '총무', '기준'],
  },
  {
    id: 'doc-2',
    title: '현재 집중 프로젝트: 총무 워크스페이스 고도화',
    category: 'projects',
    content: `# 프로젝트 개요
- **목표**: 총무 14대 업무 대장과 NAS 문서 색인을 실제 업무에 바로 쓸 수 있는 수준으로 완성
- **핵심 가치**: 정확한 데이터 영속성, 실제 파일 기반 검색, 실사용 가능한 문서/엑셀 자동 생성
- **다음 마일스톤**: 나머지 업무 모듈 실사용 검증 및 보고서 서식 다듬기`,
    updatedAt: '2026-08-29',
    tags: ['프로젝트', '총무', '개발'],
  },
];

export const INITIAL_GOALS: UserGoal[] = [
  {
    id: 'goal-1',
    title: '총무 워크스페이스 실사용 전환 및 업무 대장 정비',
    category: 'career',
    deadline: '2026-09-15',
    progress: 75,
    milestones: [
      { id: 'm-1', text: '백엔드 데이터 영속성(SQLite) 구축', done: true },
      { id: 'm-2', text: '14개 업무 모듈 등록 화면 완성', done: true },
      { id: 'm-3', text: 'NAS 문서 실색인 및 검색 연결', done: true },
    ],
    agentAdvice: '매일 아침 대시보드를 확인하는 걸 하루의 시작 루틴으로 삼으면 업무 누락을 줄일 수 있습니다.',
  },
  {
    id: 'goal-2',
    title: '2026년 하반기 임금협상 및 소급분 정산 마무리',
    category: 'career',
    deadline: '2026-10-31',
    progress: 50,
    milestones: [
      { id: 'm-4', text: '연봉제·운전기사 임금 조견표 개정안 확정', done: true },
      { id: 'm-5', text: '소급분 대상자별 계산 완료', done: true },
      { id: 'm-6', text: '급여대장 반영 및 지급 완료', done: false },
    ],
    agentAdvice: '소급분 계산은 대상자가 많을수록 일할 계산 오차가 누적되기 쉬우니, 계산기 결과를 한 번씩 교차 검증해보세요.',
  },
];

export const INITIAL_ROUTINES: DailyRoutine[] = [
  {
    id: 'rt-1',
    timeOfDay: 'morning',
    title: '전일 법인카드 사용내역 및 잔여 한도 확인',
    completed: true,
    streak: 8,
  },
  {
    id: 'rt-2',
    timeOfDay: 'morning',
    title: '오늘 처리할 경비 승인·결재 건 확인',
    completed: true,
    streak: 6,
  },
  {
    id: 'rt-3',
    timeOfDay: 'afternoon',
    title: '식권 발급/수취 현황 중간 점검',
    completed: false,
    streak: 4,
  },
  {
    id: 'rt-4',
    timeOfDay: 'evening',
    title: '오늘 등록한 업무 대장 최종 확인 및 NAS 문서 정리',
    completed: false,
    streak: 7,
  },
];
