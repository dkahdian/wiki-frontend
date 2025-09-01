export interface SearchResult {
  search: string[];
  totalhits: number;
}

export interface LinksResult {
  count: number;
  title: string;
  linkedArticles: string[];
}

export interface GraphAction {
  type: 'expand' | 'collapse';
  nodeId: string;
  timestamp: number;
}
