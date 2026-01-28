
export interface FileData {
  id: string;
  name: string;
  content: string;
  type: 'target' | 'reference';
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  type: 'orthography' | 'grammar' | 'style' | 'punctuation';
  pageNumber: number;
}

export interface ReviewResult {
  fullCorrectedText: string;
  corrections: Correction[];
  score: number; // 0-100
}

export enum AppStatus {
  IDLE = 'IDLE',
  EXTRACTING_TEXT = 'EXTRACTING_TEXT',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
