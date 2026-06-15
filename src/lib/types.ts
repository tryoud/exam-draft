export type PDFMode = 'text' | 'image' | 'image_recommended';

export type Provider = 'examdraft' | 'anthropic' | 'openrouter';

export interface AccountUser {
  id: string;
  email: string;
}

export interface AccountState {
  user: AccountUser | null;
  credits: number;
  plan: 'free' | 'credits' | 'byok';
  loading: boolean;
}

export interface ExtractedFile {
  name: string;
  size: number;
  type: 'exam' | 'slides';
  mode: PDFMode;
  text: string | null;
  base64: string | null;
  tokenEstimate: number;
  pageCount: number;
  imageCount: number;
  hasSignificantImages: boolean;
}

export interface TaskType {
  id: string;
  name: string;
  description: string;
  frequency: number;
  avgPoints: number;
  difficulty: number;
  exampleQuestion: string;
  hasdiagramContext: boolean;
}

export interface TopicLikelihood {
  topic: string;
  likelihood: 'high' | 'medium' | 'low';
  evidenceNote: string;
  pointImpact: 'high' | 'medium' | 'low';
}

export interface RiskGap {
  gap: string;
  severity: 'critical' | 'important' | 'minor';
}

export interface AnalysisResult {
  subject: string;
  totalTaskTypes: number;
  taskTypes: TaskType[];
  averageDifficulty: number;
  estimatedDuration: number;
  totalPoints: number;
  topicAreas: string[];
  examCount: number;
  hasSlideContext: boolean;
  slideTopics: string[];
  hadImageOnlyContent: boolean;
  /** 0–100: how well the uploaded material covers the module */
  coverageScore?: number;
  /** 0–100: how confident the analysis is based on available evidence */
  confidenceScore?: number;
  /** Topics sorted by exam likelihood with evidence notes */
  topicLikelihoods?: TopicLikelihood[];
  /** Recurring patterns and anomalies across exams */
  recurringPatterns?: string[];
  /** Gaps that could hurt the student in the real exam */
  riskGaps?: RiskGap[];
  /** Concrete next study actions derived from the analysis */
  nextBestActions?: string[];
}

export interface SubTask {
  label: string;
  text: string;
  points: number;
}

export interface ExamTask {
  id: string;
  number: number;
  type: string;
  typeId: string;
  title: string;
  description: string;
  points: number;
  subTasks?: SubTask[];
  hints?: string[];
  hasDiagram?: boolean;
  diagramDescription?: string;
  /** Present for multiple-choice tasks: keyed A/B/C/D (or more) */
  options?: Record<string, string>;
}

export interface ExamSolution {
  taskId: string;
  solution: string;
  keyPoints: string[];
  commonMistakes: string[];
  /** For multiple-choice tasks: the single correct option key, e.g. "B" */
  correctOption?: string;
}

export interface GeneratedExam {
  title: string;
  duration: number;
  totalPoints: number;
  tasks: ExamTask[];
  includedTypes: string[];
  excludedTypes: string[];
  solution: ExamSolution[];
}

export interface ExamGenerationInput {
  analysis: AnalysisResult;
  mode: 'random' | 'type-training';
  difficulty: 'easier' | 'same' | 'harder';
  selectedTypeId?: string;
  excludedTopics?: string[];
  improvementConsent?: boolean;
}

export interface ExamAnswer {
  taskId: string;
  answer: string;
}

export type ErrorCategory =
  | 'konzept_nicht_verstanden'
  | 'rechenfehler'
  | 'begruendung_fehlt'
  | 'falsches_verfahren'
  | 'zeitmanagement'
  | 'diagramm_interpretation';

export const ERROR_CATEGORY_LABELS: Record<ErrorCategory, string> = {
  konzept_nicht_verstanden: 'Konzept nicht verstanden',
  rechenfehler: 'Rechenfehler',
  begruendung_fehlt: 'Begründung fehlt',
  falsches_verfahren: 'Falsches Verfahren',
  zeitmanagement: 'Zeitmanagement',
  diagramm_interpretation: 'Diagramm/Interpretation',
};

export interface GradingFeedback {
  taskId: string;
  earnedPoints: number;
  maxPoints: number;
  feedback: string;
  correctPoints: string[];
  missingPoints: string[];
  errorCategory?: ErrorCategory;
  nextPracticeHint?: string;
}

export interface FlashCard {
  id: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  userAnswer: string;
  modelSolution: string;
  keyPoints: string[];
  errorCategory?: ErrorCategory;
  createdAt: string;
}

export interface GradingResult {
  totalEarned: number;
  totalMax: number;
  percentage: number;
  feedback: GradingFeedback[];
}

export type StudyTaskType = 'type-training' | 'simulation' | 'review' | 'mistake-review' | 'daily-drill';

export interface StudyTask {
  id: string;
  day: number;
  date: string;
  title: string;
  taskType: StudyTaskType;
  estimatedMinutes: number;
  linkedPracticeMode?: 'random' | 'type-training';
  linkedTypeId?: string;
  focusSessionUrl: string;
  completionStatus: 'pending' | 'done' | 'skipped';
}

export interface StudyPlan {
  id: string;
  moduleSubject: string;
  examDate: string;
  dailyMinutes: number;
  confidenceScoreAtCreation: number;
  createdAt: string;
  tasks: StudyTask[];
  totalDays: number;
  studyDays: number;
}

export type AppStep = 0 | 1 | 2 | 3 | 4;

export interface AppState {
  apiKey: string | null;
  provider: Provider;
  openrouterModel: string;         // generation model
  openrouterAnalysisModel: string; // analysis model (can be cheaper)
  examFiles: ExtractedFile[];
  slideFiles: ExtractedFile[];
  includeSlides: boolean;
  lectureContextMode: 'summary' | 'pdfs';
  lectureContextText: string;
  moduleName: string;
  universityName: string;
  examDate: string;
  targetGrade: string;
  consentGiven: boolean;
  rightsConfirmed: boolean;
  improvementConsent: boolean;
  analysisResult: AnalysisResult | null;
  selectedMode: 'random' | 'type-training' | null;
  selectedDifficulty: 'easier' | 'same' | 'harder';
  selectedTypeId: string | null;
  selectedExcludedTopics: string[];
  generatedExam: GeneratedExam | null;
  currentStep: AppStep;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}
