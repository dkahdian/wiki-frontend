export interface GraphLink {
  source: string; // Node id (normalized title)
  target: string; // Node id (normalized title)
  bidirectional: boolean; // True if both A->B and B->A exist
}
