export interface SituationalRewrite {
  id: string;
  label: string;
  description: string;
  text: string;
}

export interface GrammarAnalysis {
  correctedText: string;
  mistakesFound: string[];
  situations: SituationalRewrite[];
  socialMedia: SituationalRewrite[];
}

export interface SavedSentence {
  id: string;
  originalText: string;
  correctedText: string;
  timestamp: string;
}
