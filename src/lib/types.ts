export type PDFMode = 'text' | 'image' | 'image_recommended';

export type Provider = 'anthropic' | 'openrouter';

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
}

export interface ExamAnswer {
  taskId: string;
  answer: string;
}

export interface GradingFeedback {
  taskId: string;
  earnedPoints: number;
  maxPoints: number;
  feedback: string;
  correctPoints: string[];
  missingPoints: string[];
}

export interface GradingResult {
  totalEarned: number;
  totalMax: number;
  percentage: number;
  feedback: GradingFeedback[];
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
  consentGiven: boolean;
  rightsConfirmed: boolean;
  analysisResult: AnalysisResult | null;
  selectedMode: 'random' | 'type-training' | null;
  selectedDifficulty: 'easier' | 'same' | 'harder';
  selectedTypeId: string | null;
  generatedExam: GeneratedExam | null;
  currentStep: AppStep;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}
