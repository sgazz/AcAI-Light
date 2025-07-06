/**
 * API konfiguracija
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/**
 * Dokument endpoints
 */
export const DOCUMENTS_ENDPOINT = `${API_BASE}/documents`;
export const UPLOAD_ENDPOINT = `${API_BASE}/documents/upload`;

/**
 * Chat endpoints
 */
export const CHAT_SESSIONS_ENDPOINT = `${API_BASE}/chat/sessions`;
export const CHAT_HISTORY_ENDPOINT = `${API_BASE}/chat/history`;
export const CHAT_NEW_SESSION_ENDPOINT = `${API_BASE}/chat/new-session`;
export const CHAT_ENDPOINT = `${API_BASE}/chat`;
export const CHAT_RAG_ENDPOINT = `${API_BASE}/chat/rag`;
export const CHAT_RAG_MULTISTEP_ENDPOINT = `${API_BASE}/chat/rag-multistep`;
export const CHAT_RAG_ENHANCED_CONTEXT_ENDPOINT = `${API_BASE}/chat/rag-enhanced-context`;

/**
 * OCR endpoints
 */
export const OCR_INFO_ENDPOINT = `${API_BASE}/ocr/info`;
export const OCR_SUPPORTED_FORMATS_ENDPOINT = `${API_BASE}/ocr/supported-formats`;
export const OCR_EXTRACT_ENDPOINT = `${API_BASE}/ocr/extract`;
export const OCR_EXTRACT_ADVANCED_ENDPOINT = `${API_BASE}/ocr/extract-advanced`;
export const OCR_BATCH_EXTRACT_ENDPOINT = `${API_BASE}/ocr/batch-extract`;
export const OCR_FIX_TEXT_ENDPOINT = `${API_BASE}/ocr/fix-text`;
export const OCR_UPDATE_TEXT_ENDPOINT = `${API_BASE}/ocr/update-text`;

/**
 * Search endpoints
 */
export const SEARCH_MULTISTEP_ENDPOINT = `${API_BASE}/search/multistep`;

/**
 * Health check endpoint
 */
export const HEALTH_CHECK_ENDPOINT = `${API_BASE}/`;

/**
 * Query Rewriting endpoints
 */
export const QUERY_ENHANCE_ENDPOINT = `${API_BASE}/query/enhance`;
export const QUERY_EXPAND_ENDPOINT = `${API_BASE}/query/expand`;
export const QUERY_ANALYZE_ENDPOINT = `${API_BASE}/query/analyze`;

/**
 * Fact Checking endpoints
 */
export const FACT_CHECK_VERIFY_ENDPOINT = `${API_BASE}/fact-check/verify`;
export const FACT_CHECK_VERIFY_MULTIPLE_ENDPOINT = `${API_BASE}/fact-check/verify-multiple`;

/**
 * Session Management Endpoints
 */
export const SESSION_METADATA_ENDPOINT = `${API_BASE}/session/metadata`;
export const SESSION_CATEGORIES_ENDPOINT = `${API_BASE}/session/categories`;
export const SESSION_SHARING_ENDPOINT = `${API_BASE}/session/sharing`;
export const SESSIONS_METADATA_ENDPOINT = `${API_BASE}/sessions/metadata`;

/**
 * Centralizovani API request helper sa error handling-om
 */
export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Backend error response (naš format)
      if (data && typeof data === 'object' && data.error) {
        const err = new Error(data.error.message || data.error.code || 'Greška na serveru');
        (err as any).status = data.status || 'error';
        (err as any).code = data.error.code;
        (err as any).category = data.error.category;
        (err as any).severity = data.error.severity;
        (err as any).timestamp = data.error.timestamp;
        throw err;
      }
      // FastAPI/Next.js error
      if (data && data.detail) {
        const err = new Error(data.detail);
        (err as any).status = 'error';
        throw err;
      }
      // Plain text error
      throw new Error(typeof data === 'string' ? data : 'Nepoznata greška');
    }
    return data;
  } catch (err: any) {
    // Network error
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netErr = new Error('Nema konekcije sa serverom. Proverite internet ili backend.');
      (netErr as any).status = 'network';
      throw netErr;
    }
    throw err;
  }
}

// Session Management API functions
export const createSessionMetadata = async (sessionId: string, name?: string, description?: string) => {
  return apiRequest(SESSION_METADATA_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, name, description }),
  });
};

export const getSessionMetadata = async (sessionId: string) => {
  return apiRequest(`${SESSION_METADATA_ENDPOINT}/${sessionId}`);
};

export const updateSessionMetadata = async (sessionId: string, data: { name?: string; description?: string; is_archived?: boolean }) => {
  return apiRequest(`${SESSION_METADATA_ENDPOINT}/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const addSessionCategories = async (sessionId: string, categories: string[]) => {
  return apiRequest(`${SESSION_CATEGORIES_ENDPOINT}/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ categories }),
  });
};

export const getSessionCategories = async (sessionId: string) => {
  return apiRequest(`${SESSION_CATEGORIES_ENDPOINT}/${sessionId}`);
};

export const createShareLink = async (sessionId: string, permissions: string = 'read', expiresIn: string = '7d') => {
  return apiRequest(`${SESSION_SHARING_ENDPOINT}/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ permissions, expires_in: expiresIn }),
  });
};

export const getShareLinks = async (sessionId: string) => {
  return apiRequest(`${SESSION_SHARING_ENDPOINT}/${sessionId}`);
};

export const revokeShareLink = async (shareLinkId: string) => {
  return apiRequest(`${SESSION_SHARING_ENDPOINT}/${shareLinkId}`, {
    method: 'DELETE',
  });
};

export const getAllSessionsMetadata = async () => {
  return apiRequest(SESSIONS_METADATA_ENDPOINT);
};

// Study Room API Endpoints
export const STUDY_ROOM_CREATE_ENDPOINT = `${API_BASE}/study-room/create`;
export const STUDY_ROOM_LIST_ENDPOINT = `${API_BASE}/study-room/list`;
export const STUDY_ROOM_JOIN_ENDPOINT = `${API_BASE}/study-room/join`;
export const STUDY_ROOM_MEMBERS_ENDPOINT = (roomId: string) => `${API_BASE}/study-room/${roomId}/members`;
export const STUDY_ROOM_MESSAGE_ENDPOINT = (roomId: string) => `${API_BASE}/study-room/${roomId}/message`;
export const STUDY_ROOM_MESSAGES_ENDPOINT = (roomId: string) => `${API_BASE}/study-room/${roomId}/messages`;
export const STUDY_ROOM_LEAVE_ENDPOINT = (roomId: string) => `${API_BASE}/study-room/${roomId}/leave`;

// Study Room WebSocket URL
export const STUDY_ROOM_WS_URL = (roomId: string, userId: string, username: string) => 
  `ws://localhost:8001/ws/study-room/${roomId}`;

// Study Journal API Endpoints
export const STUDY_JOURNAL_ENTRIES_ENDPOINT = `${API_BASE}/study-journal/entries`;
export const STUDY_JOURNAL_GOALS_ENDPOINT = `${API_BASE}/study-journal/goals`;

// Study Journal Flashcards Endpoints
export const STUDY_JOURNAL_FLASHCARDS_ENDPOINT = `${API_BASE}/study-journal/flashcards`;

// Study Journal API Functions
export const createJournalEntry = async (entryData: {
  user_id: string;
  subject: string;
  topic?: string;
  entry_type: 'reflection' | 'note' | 'question' | 'achievement';
  content: string;
  mood_rating?: number;
  study_time_minutes?: number;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  related_chat_session?: string;
  related_problem_id?: string;
  related_study_room_id?: string;
  is_public?: boolean;
}) => {
  return await apiRequest(STUDY_JOURNAL_ENTRIES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entryData),
  });
};

export const getJournalEntries = async (
  userId: string,
  subject?: string,
  entryType?: string,
  limit: number = 50,
  offset: number = 0
) => {
  const params = new URLSearchParams({
    user_id: userId,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (subject) params.append('subject', subject);
  if (entryType) params.append('entry_type', entryType);
  
  return await apiRequest(`${STUDY_JOURNAL_ENTRIES_ENDPOINT}?${params}`);
};

export const updateJournalEntry = async (entryId: string, updateData: any) => {
  return await apiRequest(`${STUDY_JOURNAL_ENTRIES_ENDPOINT}/${entryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
};

export const deleteJournalEntry = async (entryId: string) => {
  return await apiRequest(`${STUDY_JOURNAL_ENTRIES_ENDPOINT}/${entryId}`, {
    method: 'DELETE',
  });
};

export const createStudyGoal = async (goalData: {
  user_id: string;
  title: string;
  description?: string;
  subject?: string;
  target_date: string;
  goal_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  target_value: number;
  current_value?: number;
  status?: 'active' | 'completed' | 'overdue' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  measurement_unit?: string;
  tags?: string[];
}) => {
  return await apiRequest(STUDY_JOURNAL_GOALS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goalData),
  });
};

export const getStudyGoals = async (
  userId: string,
  status?: string,
  subject?: string,
  limit: number = 50,
  offset: number = 0
) => {
  const params = new URLSearchParams({
    user_id: userId,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (status) params.append('status', status);
  if (subject) params.append('subject', subject);
  
  return await apiRequest(`${STUDY_JOURNAL_GOALS_ENDPOINT}?${params}`);
};

export const updateGoalProgress = async (goalId: string, newValue: number) => {
  return await apiRequest(`${STUDY_JOURNAL_GOALS_ENDPOINT}/${goalId}/progress`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ new_value: newValue }),
  });
};

// Study Room API Functions
export const createStudyRoom = async (roomData: {
  name: string;
  description?: string;
  subject?: string;
  max_participants?: number;
  admin_user_id?: string;
}) => {
  return await apiRequest(STUDY_ROOM_CREATE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(roomData),
  });
};

export const listStudyRooms = async (userId: string = 'default_admin') => {
  return await apiRequest(`${STUDY_ROOM_LIST_ENDPOINT}?user_id=${userId}`);
};

export const joinStudyRoom = async (joinData: {
  invite_code: string;
  user_id: string;
  username: string;
}) => {
  return await apiRequest(STUDY_ROOM_JOIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(joinData),
  });
};

export const getStudyRoomMembers = async (roomId: string) => {
  return await apiRequest(STUDY_ROOM_MEMBERS_ENDPOINT(roomId));
};

export const sendStudyRoomMessage = async (roomId: string, messageData: {
  user_id: string;
  username: string;
  content: string;
  type?: string;
}) => {
  return await apiRequest(STUDY_ROOM_MESSAGE_ENDPOINT(roomId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messageData),
  });
};

export const getStudyRoomMessages = async (roomId: string, limit: number = 50, offset: number = 0) => {
  return await apiRequest(`${STUDY_ROOM_MESSAGES_ENDPOINT(roomId)}?limit=${limit}&offset=${offset}`);
};

export const leaveStudyRoom = async (roomId: string, userId: string) => {
  return await apiRequest(`${STUDY_ROOM_LEAVE_ENDPOINT(roomId)}?user_id=${userId}`, {
    method: 'DELETE',
  });
};

// Exam Simulation API Endpoints
export const EXAM_CREATE_ENDPOINT = `${API_BASE}/exam/create`;
export const EXAM_GET_ENDPOINT = (examId: string) => `${API_BASE}/exam/${examId}`;
export const EXAM_LIST_ENDPOINT = `${API_BASE}/exams`;
export const EXAM_START_ENDPOINT = (examId: string) => `${API_BASE}/exam/${examId}/start`;
export const EXAM_ANSWER_ENDPOINT = (attemptId: string) => `${API_BASE}/exam/attempt/${attemptId}/answer`;
export const EXAM_FINISH_ENDPOINT = (attemptId: string) => `${API_BASE}/exam/attempt/${attemptId}/finish`;
export const EXAM_ATTEMPTS_ENDPOINT = (examId: string) => `${API_BASE}/exam/${examId}/attempts`;
export const EXAM_GENERATE_QUESTIONS_ENDPOINT = `${API_BASE}/exam/generate-questions`;

// Exam Simulation API Functions
export const createExam = async (examData: {
  title: string;
  description?: string;
  subject?: string;
  duration_minutes?: number;
  total_points?: number;
  passing_score?: number;
  questions?: any[];
  created_by: string;
  is_public?: boolean;
  allow_retakes?: boolean;
  max_attempts?: number;
}) => {
  return await apiRequest(EXAM_CREATE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(examData),
  });
};

export const getExam = async (examId: string) => {
  return await apiRequest(EXAM_GET_ENDPOINT(examId));
};

export const listExams = async (userId?: string, subject?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId);
  if (subject) params.append('subject', subject);
  
  return await apiRequest(`${EXAM_LIST_ENDPOINT}?${params.toString()}`);
};

export const startExamAttempt = async (examId: string, attemptData: {
  user_id: string;
  username: string;
}) => {
  return await apiRequest(EXAM_START_ENDPOINT(examId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(attemptData),
  });
};

export const submitAnswer = async (attemptId: string, answerData: {
  question_id: string;
  answer: any;
}) => {
  return await apiRequest(EXAM_ANSWER_ENDPOINT(attemptId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(answerData),
  });
};

export const finishExamAttempt = async (attemptId: string) => {
  return await apiRequest(EXAM_FINISH_ENDPOINT(attemptId), {
    method: 'POST',
  });
};

export const getExamAttempts = async (examId: string, userId: string) => {
  return await apiRequest(`${EXAM_ATTEMPTS_ENDPOINT(examId)}?user_id=${userId}`);
};

export const generateAIQuestions = async (generationData: {
  subject: string;
  topic: string;
  count?: number;
  difficulty?: string;
}) => {
  return await apiRequest(EXAM_GENERATE_QUESTIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(generationData),
  });
};

// Study Journal Flashcards Functions
export const createFlashcard = async (flashcardData: {
  user_id: string;
  subject: string;
  topic?: string;
  front_content: string;
  back_content: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  is_archived?: boolean;
}) => {
  return await apiRequest(STUDY_JOURNAL_FLASHCARDS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flashcardData),
  });
};

export const getFlashcardsForReview = async (
  userId: string,
  limit: number = 20
) => {
  const params = new URLSearchParams({
    user_id: userId,
    limit: limit.toString(),
  });
  return await apiRequest(`${STUDY_JOURNAL_FLASHCARDS_ENDPOINT}?${params}`);
};

export const reviewFlashcard = async (
  flashcardId: string,
  difficultyRating: number,
  wasCorrect: boolean,
  responseTimeSeconds?: number
) => {
  return await apiRequest(`${STUDY_JOURNAL_FLASHCARDS_ENDPOINT}/${flashcardId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      difficulty_rating: difficultyRating,
      was_correct: wasCorrect,
      response_time_seconds: responseTimeSeconds,
    }),
  });
};

// Career Guidance API Endpoints
export const CAREER_GUIDANCE_PROFILE_ENDPOINT = `${API_BASE}/career-guidance/profile`;
export const CAREER_GUIDANCE_SKILLS_ENDPOINT = `${API_BASE}/career-guidance/skills`;
export const CAREER_GUIDANCE_ASSESSMENTS_ENDPOINT = `${API_BASE}/career-guidance/assessments`;
export const CAREER_GUIDANCE_JOBS_ENDPOINT = `${API_BASE}/career-guidance/jobs`;
export const CAREER_GUIDANCE_PATHS_ENDPOINT = `${API_BASE}/career-guidance/paths`;
export const CAREER_GUIDANCE_INDUSTRIES_ENDPOINT = `${API_BASE}/career-guidance/industries`;
export const CAREER_GUIDANCE_INSIGHTS_ENDPOINT = `${API_BASE}/career-guidance/insights`;

// Career Guidance API Functions

// Profile Management
export const createCareerProfile = async (profileData: {
  user_id: string;
  current_position: string;
  years_of_experience: number;
  education_level: string;
  preferred_industries: string[];
  salary_expectations: number;
  location_preferences: string[];
  remote_work_preference: boolean;
}) => {
  return await apiRequest(CAREER_GUIDANCE_PROFILE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
};

export const getCareerProfile = async (userId: string) => {
  return await apiRequest(`${CAREER_GUIDANCE_PROFILE_ENDPOINT}/${userId}`);
};

export const updateCareerProfile = async (profileId: string, updateData: any) => {
  return await apiRequest(`${CAREER_GUIDANCE_PROFILE_ENDPOINT}/${profileId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
};

// Skills Management
export const addSkill = async (skillData: {
  user_id: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
  years_of_experience: number;
  is_certified: boolean;
  certification_name?: string;
  certification_date?: string;
}) => {
  return await apiRequest(CAREER_GUIDANCE_SKILLS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(skillData),
  });
};

export const getUserSkills = async (userId: string, category?: string) => {
  const url = category 
    ? `${CAREER_GUIDANCE_SKILLS_ENDPOINT}/${userId}?category=${category}`
    : `${CAREER_GUIDANCE_SKILLS_ENDPOINT}/${userId}`;
  return await apiRequest(url);
};

export const updateSkill = async (skillId: string, updateData: any) => {
  return await apiRequest(`${CAREER_GUIDANCE_SKILLS_ENDPOINT}/${skillId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
};

export const deleteSkill = async (skillId: string) => {
  return await apiRequest(`${CAREER_GUIDANCE_SKILLS_ENDPOINT}/${skillId}`, {
    method: 'DELETE',
  });
};

export const getSkillsSummary = async (userId: string) => {
  return await apiRequest(`${CAREER_GUIDANCE_SKILLS_ENDPOINT}/${userId}/summary`);
};

// Assessments
export const createCareerAssessment = async (assessmentData: {
  user_id: string;
  assessment_type: string;
  assessment_name: string;
  questions: any[];
}) => {
  return await apiRequest(CAREER_GUIDANCE_ASSESSMENTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assessmentData),
  });
};

export const getUserAssessments = async (userId: string, assessmentType?: string) => {
  const url = assessmentType 
    ? `${CAREER_GUIDANCE_ASSESSMENTS_ENDPOINT}/${userId}?assessment_type=${assessmentType}`
    : `${CAREER_GUIDANCE_ASSESSMENTS_ENDPOINT}/${userId}`;
  return await apiRequest(url);
};

export const getAssessmentQuestions = async (assessmentType: string) => {
  return await apiRequest(`${CAREER_GUIDANCE_ASSESSMENTS_ENDPOINT}/questions/${assessmentType}`);
};

export const calculateAssessmentResults = async (assessmentId: string, answers: any) => {
  return await apiRequest(`${CAREER_GUIDANCE_ASSESSMENTS_ENDPOINT}/${assessmentId}/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answers }),
  });
};

// Job Recommendations
export const getJobRecommendations = async (userId: string, status?: string) => {
  const url = status 
    ? `${CAREER_GUIDANCE_JOBS_ENDPOINT}/${userId}?status=${status}`
    : `${CAREER_GUIDANCE_JOBS_ENDPOINT}/${userId}`;
  return await apiRequest(url);
};

export const generateJobRecommendations = async (userId: string, limit: number = 10) => {
  return await apiRequest(`${CAREER_GUIDANCE_JOBS_ENDPOINT}/generate/${userId}?limit=${limit}`, {
    method: 'POST',
  });
};

export const updateJobApplicationStatus = async (jobId: string, status: string) => {
  return await apiRequest(`${CAREER_GUIDANCE_JOBS_ENDPOINT}/${jobId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
};

// Career Paths
export const createCareerPath = async (pathData: {
  user_id: string;
  path_name: string;
  target_role: string;
  starting_position: string;
  steps: any[];
  estimated_duration: number;
  required_skills: string[];
  progress_percentage: number;
  is_active: boolean;
}) => {
  return await apiRequest(CAREER_GUIDANCE_PATHS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pathData),
  });
};

export const getUserCareerPaths = async (userId: string, activeOnly: boolean = true) => {
  return await apiRequest(`${CAREER_GUIDANCE_PATHS_ENDPOINT}/${userId}?active_only=${activeOnly}`);
};

export const updateCareerPathProgress = async (pathId: string, progressPercentage: number) => {
  return await apiRequest(`${CAREER_GUIDANCE_PATHS_ENDPOINT}/${pathId}/progress`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ progress_percentage: progressPercentage }),
  });
};

// Industries
export const getAllIndustries = async () => {
  return await apiRequest(CAREER_GUIDANCE_INDUSTRIES_ENDPOINT);
};

export const getIndustryDetails = async (industryName: string) => {
  return await apiRequest(`${CAREER_GUIDANCE_INDUSTRIES_ENDPOINT}/${encodeURIComponent(industryName)}`);
};

export const getIndustryTrends = async () => {
  return await apiRequest(`${CAREER_GUIDANCE_INDUSTRIES_ENDPOINT}/trends`);
};

// Career Insights
export const getUserCareerInsights = async (userId: string) => {
  return await apiRequest(`${CAREER_GUIDANCE_INSIGHTS_ENDPOINT}/${userId}`);
};

// OCR API Functions
export const fixOcrText = async (text: string, mode: 'fix' | 'format') => {
  return await apiRequest(OCR_FIX_TEXT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, mode }),
  });
};

export const updateOcrText = async (documentId: string, newText: string) => {
  return await apiRequest(OCR_UPDATE_TEXT_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ document_id: documentId, new_text: newText }),
  });
}; 