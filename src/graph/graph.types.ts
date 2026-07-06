export interface GraphNode {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  evidence_ids: string[];
  impact_strength: string;
  impact_category: string;
  reason?: string;
  confidence: number;
}

export interface EvidenceSpan {
  id: string;
  source_file: string;
  section_heading: string;
  excerpt: string;
  extraction_type: string;
  confidence: number;
}

export interface ChangeRequestInput {
  title: string;
  description?: string;
  targetService?: string;
}

export interface AnalysisResult {
  summary: {
    totalServices: number;
    highImpact: number;
    mediumImpact: number;
    risks: number;
  };
  impacts: unknown[];
  risks: { type: string; severity: string; description: string; recommendation: string }[];
  recommendedActions: string[];
  findings: { type: string; message: string }[];
}
