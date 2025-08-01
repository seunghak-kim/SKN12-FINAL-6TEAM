// 캐릭터 정보
export interface SearchResult {
  id: string;
  name: string;
  description: string;
  avatar: string;
}

// 채팅 메시지 (백엔드 API 응답 형식에 맞춤)
export interface ChatMessage {
  chat_messages_id: string;
  session_id: string;
  sender_type: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// 프론트엔드 전용 메시지 타입 (기존 코드와 호환성 유지)
export interface FrontendChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// 채팅 세션 (백엔드 API 응답 형식)
export interface ChatSession {
  chat_sessions_id: string;
  user_id: number;
  persona_id: number;
  session_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 채팅 세션 상세 정보 (메시지 포함)
export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

// 메시지 전송 요청
export interface SendMessageRequest {
  content: string;
  enable_tts?: boolean;
  voice_type?: string;
}

// 메시지 전송 응답
export interface SendMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  session_updated: boolean;
}

// 세션 생성 요청
export interface CreateSessionRequest {
  user_id: number;
  persona_id: number;
  session_name?: string;
}


// 평가 정보
export interface Rating {
  id: string;
  name: string;
  rating: number;
  comment: string;
}

// 채팅 기록 (프론트엔드용)
export interface ChatHistory {
  id: string;
  characterId: string;
  characterName: string;
  characterAvatar: string;
  messages: FrontendChatMessage[];
  date: string;
  lastMessage: string;
}

// 테스트 결과 (기존)
export interface TestResult {
  id: string;
  testType: 'HTP' | 'Drawing';
  result: string;
  characterMatch: string;
  date: string;
  description: string;
  images?: string[];
  personalityScores?: {
    추진이: number;
    내면이: number;
    관계이: number;
    쾌락이: number;
    안정이: number;
  };
}

// 백엔드 API - 페르소나 정보
export interface PersonaInfo {
  persona_id: number;
  persona_name: string;
  persona_description: string;
  tts_audio_url?: string;
  tts_voice_type?: string;
}

// 백엔드 API - 그림 테스트 결과
export interface DrawingTestResult {
  result_id: number;
  persona_type?: number;
  summary_text?: string;
  created_at: string;
  persona_info?: PersonaInfo;
  personality_scores?: {
    추진이: number;
    내면이: number;
    관계이: number;
    쾌락이: number;
    안정이: number;
  };
}

// 백엔드 API - 그림 테스트
export interface DrawingTest {
  test_id: number;
  user_id: number;
  image_url: string;
  submitted_at: string;
  result?: DrawingTestResult;
}

// 사용자 프로필
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  joinDate: string;
  totalTests: number;
  totalChats: number;
}

// 화면 타입
export type ScreenType = 'landing' | 'main' | 'chat' | 'results' | 'mypage';

// 앱 상태
export interface AppState {
  currentScreen: ScreenType;
  selectedCharacter: SearchResult | null;
  chatMessages: FrontendChatMessage[];
  chatHistory: ChatHistory[];
  testResults: TestResult[];
  userProfile: UserProfile | null;
  showModal: boolean;
  showRatingModal: boolean;
}

// API 에러 응답
export interface ApiError {
  error: string;
  detail?: string;
  code?: number;
}

// Pipeline API - 이미지 분석 응답
export interface PipelineAnalysisResponse {
  test_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
}

// Pipeline API - 분석 단계 정보
export interface AnalysisStep {
  name: string;
  description: string;
  completed: boolean;
  current: boolean;
}

// Pipeline API - 분석 상태 응답
export interface PipelineStatusResponse {
  test_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  steps?: AnalysisStep[];
  current_step?: number;
  completed_steps?: number;
  total_steps?: number;
  estimated_remaining?: string;
  result?: DrawingTestResult;
  error?: string;
}

// Rating API - 평가 요청
export interface RatingRequest {
  session_id: string;
  user_id: number;
  rating: number;  // 1-5
  comment?: string;
}

// Rating API - 평가 응답  
export interface RatingResponse {
  ratings_id: number;
  session_id: string;
  user_id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

// Rating API - 평균 평점 응답
export interface AverageRatingResponse {
  session_id?: string;
  user_id?: number;
  average_rating: number;
  total_ratings: number;
}