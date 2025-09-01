import { Injectable, signal, computed, inject } from '@angular/core';
import { GraphNode } from '../models/graph-node';
import { GraphLink } from '../models/graph-link';
import { LinksResult } from '../models/api-models';
import { environment } from '../../environments/environment';
import { ApiClientService } from './api-client.service';

@Injectable({
  providedIn: 'root'
})
export class GraphStoreService {
  private apiClient = inject(ApiClientService);

  // Core state using signals
  private nodes = signal<Map<string, GraphNode>>(new Map());
  private links = signal<Map<string, GraphLink>>(new Map());
  private linksCache = signal<Map<string, LinksResult>>(new Map());
  private rootNodes = signal<Set<string>>(new Set());
  private lastExpandedRoot = signal<string | null>(null);

  // Computed values
  public readonly allNodes = computed(() => Array.from(this.nodes().values()));
  public readonly allLinks = computed(() => Array.from(this.links().values()));
  public readonly visibleNodeCount = computed(() => this.allNodes().length);
  public readonly rootNodesList = computed(() => Array.from(this.rootNodes()));

  /**
   * Add a new root node (seed article)
   */
  addRootNode(title: string): void {
    const nodeId = this.apiClient.normalizeTitle(title);
    const displayTitle = this.apiClient.denormalizeTitle(nodeId);

    if (!this.nodes().has(nodeId)) {
      const newNode: GraphNode = {
        id: nodeId,
        title: displayTitle,
        expanded: false,
        degree: 0
      };

      const updatedNodes = new Map(this.nodes());
      updatedNodes.set(nodeId, newNode);
      this.nodes.set(updatedNodes);
    }

    const updatedRoots = new Set(this.rootNodes());
    updatedRoots.add(nodeId);
    this.rootNodes.set(updatedRoots);
  }

  /**
   * Expand a node with links from API result
   */
  expandNode(nodeId: string, linksResult: LinksResult): void {
    const node = this.nodes().get(nodeId);
    if (!node) return;

    // Add linked articles as nodes, sorted by length then alphabetically
    const sortedLinks = [...linksResult.linkedArticles]
      .sort((a, b) => {
        if (a.length !== b.length) {
          return a.length - b.length;
        }
        return a.localeCompare(b);
      })
      .slice(0, environment.graph.perRootMax); // Cap per root

    // Check if adding these nodes would exceed overall limit
    const currentNodeCount = this.visibleNodeCount();
    const newNodesCount = sortedLinks.filter(title => !this.nodes().has(this.apiClient.normalizeTitle(title))).length;
    
    let updatedNodes: Map<string, GraphNode>;
    let updatedLinks: Map<string, GraphLink>;
    
    if (currentNodeCount + newNodesCount > environment.graph.overallMax) {
      // Clear canvas, keep only this root node and mark it as the last expanded root
      this.lastExpandedRoot.set(nodeId);
      updatedNodes = new Map<string, GraphNode>();
      updatedNodes.set(nodeId, { ...node, expanded: true, degree: Math.min(linksResult.count, environment.graph.perRootMax) });
      updatedLinks = new Map<string, GraphLink>();
      
      // Update the signals immediately for the cleared state
      this.nodes.set(updatedNodes);
      this.links.set(updatedLinks);
      this.rootNodes.set(new Set([nodeId]));
    } else {
      // Track this as the last expanded root
      this.lastExpandedRoot.set(nodeId);
      // Update node as expanded
      updatedNodes = new Map(this.nodes());
      updatedNodes.set(nodeId, { ...node, expanded: true, degree: Math.min(linksResult.count, environment.graph.perRootMax) });
      updatedLinks = new Map(this.links());
    }

    // Add child nodes and links
    
    sortedLinks.forEach(childTitle => {
      const childNodeId = this.apiClient.normalizeTitle(childTitle);
      const childDisplayTitle = this.apiClient.denormalizeTitle(childNodeId);

      // Add child node if not exists
      if (!updatedNodes.has(childNodeId)) {
        const childNode: GraphNode = {
          id: childNodeId,
          title: childDisplayTitle,
          expanded: false,
          degree: 0
        };
        updatedNodes.set(childNodeId, childNode);
      }

      // Create link
      const linkKey = `${nodeId}->${childNodeId}`;
      const reverseKey = `${childNodeId}->${nodeId}`;
      
      // Check if reverse link exists to make it bidirectional
      const reverseLink = updatedLinks.get(reverseKey);
      if (reverseLink) {
        updatedLinks.set(reverseKey, { ...reverseLink, bidirectional: true });
        updatedLinks.set(linkKey, {
          source: nodeId,
          target: childNodeId,
          bidirectional: true
        });
      } else {
        updatedLinks.set(linkKey, {
          source: nodeId,
          target: childNodeId,
          bidirectional: false
        });
      }
    });

    this.nodes.set(updatedNodes);
    this.links.set(updatedLinks);

    // Cache the links result
    const updatedCache = new Map(this.linksCache());
    updatedCache.set(nodeId, linksResult);
    this.linksCache.set(updatedCache);
  }

  /**
   * Collapse a node (hide its children)
   */
  collapseNode(nodeId: string): void {
    const node = this.nodes().get(nodeId);
    if (!node || !node.expanded) return;

    // Mark node as collapsed
    const updatedNodes = new Map(this.nodes());
    updatedNodes.set(nodeId, { ...node, expanded: false });

    // Remove links originating from this node
    const updatedLinks = new Map(this.links());
    const linksToRemove: string[] = [];

    updatedLinks.forEach((link, key) => {
      if (link.source === nodeId) {
        linksToRemove.push(key);
      }
    });

    linksToRemove.forEach(key => updatedLinks.delete(key));

    // Remove orphaned nodes (nodes that are no longer connected and not roots)
    const connectedNodes = new Set<string>();
    updatedLinks.forEach(link => {
      connectedNodes.add(link.source);
      connectedNodes.add(link.target);
    });

    const nodesToRemove: string[] = [];
    updatedNodes.forEach((node, id) => {
      if (!this.rootNodes().has(id) && !connectedNodes.has(id)) {
        nodesToRemove.push(id);
      }
    });

    nodesToRemove.forEach(id => updatedNodes.delete(id));

    this.nodes.set(updatedNodes);
    this.links.set(updatedLinks);
  }

  /**
   * Check if links are cached for a node
   */
  hasLinksCache(nodeId: string): boolean {
    return this.linksCache().has(nodeId);
  }

  /**
   * Get cached links for a node
   */
  getCachedLinks(nodeId: string): LinksResult | undefined {
    return this.linksCache().get(nodeId);
  }

  /**
   * Clear the entire canvas except keep the specified root expanded
   */
  private clearCanvasKeepRoot(rootNodeId: string): void {
    const rootNode = this.nodes().get(rootNodeId);
    if (!rootNode) return;

    const clearedNodes = new Map<string, GraphNode>();
    clearedNodes.set(rootNodeId, rootNode);
    
    this.nodes.set(clearedNodes);
    this.links.set(new Map());
    this.rootNodes.set(new Set([rootNodeId]));
  }

  /**
   * Get a specific node by ID
   */
  getNode(nodeId: string): GraphNode | undefined {
    return this.nodes().get(nodeId);
  }

  /**
   * Clear all data (for testing/reset)
   */
  clear(): void {
    this.nodes.set(new Map());
    this.links.set(new Map());
    this.linksCache.set(new Map());
    this.rootNodes.set(new Set());
  }

  /**
   * Load initial demo data for Graph Theory topic
   */
  loadInitialData(): void {
    // Demo data for Graph Theory
    const demoNodes: GraphNode[] = [
      {
        id: 'Graph_theory',
        title: 'Graph theory',
        degree: 4,
        expanded: true
      },
      {
        id: 'Graph_(discrete_mathematics)',
        title: 'Graph (discrete mathematics)',
        degree: 3,
        expanded: false
      },
      {
        id: 'Vertex_(graph_theory)',
        title: 'Vertex (graph theory)',
        degree: 2,
        expanded: false
      },
      {
        id: 'Edge_(graph_theory)',
        title: 'Edge (graph theory)',
        degree: 2,
        expanded: false
      },
      {
        id: 'Tree_(graph_theory)',
        title: 'Tree (graph theory)',
        degree: 3,
        expanded: false
      }
    ];

    const demoLinks: GraphLink[] = [
      {
        source: 'Graph_theory',
        target: 'Graph_(discrete_mathematics)',
        bidirectional: false
      },
      {
        source: 'Graph_theory',
        target: 'Vertex_(graph_theory)',
        bidirectional: false
      },
      {
        source: 'Graph_theory',
        target: 'Edge_(graph_theory)',
        bidirectional: false
      },
      {
        source: 'Graph_theory',
        target: 'Tree_(graph_theory)',
        bidirectional: false
      }
    ];

    // Load the demo data
    const nodesMap = new Map<string, GraphNode>();
    const linksMap = new Map<string, GraphLink>();
    
    demoNodes.forEach(node => nodesMap.set(node.id, node));
    demoLinks.forEach(link => linksMap.set(`${link.source}-${link.target}`, link));

    this.nodes.set(nodesMap);
    this.links.set(linksMap);
    this.rootNodes.set(new Set(['Graph_theory']));
    
    // Cache the demo data as if it came from API
    const demoLinksResult: LinksResult = {
      count: demoLinks.length,
      title: 'Graph_theory',
      linkedArticles: demoLinks.map(link => link.target)
    };
    
    this.linksCache.set(new Map([
      ['Graph_theory', demoLinksResult]
    ]));
  }
}
