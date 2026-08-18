export interface InvalidAnnotationField {
  fieldKey: string;
  fieldType: string;
  values: string[];
}

export interface AnalysisResult {
  annotators: string[];
  annotationFields: string[];
  matchedSessions: { sessionId: string; name: string; _id: string }[];
  unmatchedSessionIds: string[];
  missingSessionNames: string[];
  fieldTypes: Record<string, string>;
  invalidValues: InvalidAnnotationField[];
}

export interface AnnotationTemplateField {
  fieldKey: string;
  slots: number;
}

export interface AnnotationTemplateConfig {
  annotators: string[];
  fields: AnnotationTemplateField[];
}
