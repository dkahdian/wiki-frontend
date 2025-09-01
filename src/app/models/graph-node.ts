export interface GraphNode {
  id: string; // Article title (normalized with underscores)
  title: string; // Display title (with spaces)
  expanded: boolean;
  degree: number; // From API, capped at perRootMax
}
