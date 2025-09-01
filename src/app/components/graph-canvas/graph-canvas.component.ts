import { Component, ElementRef, ViewChild, signal, inject, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
import { GraphStoreService } from '../../services/graph-store.service';
import { RateLimiterService } from '../../services/rate-limiter.service';
import { ApiClientService } from '../../services/api-client.service';
import { ToastService } from '../../services/toast.service';
import { GraphNode } from '../../models/graph-node';

@Component({
  selector: 'app-graph-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="graph-container">
      <div #cytoscapeContainer class="cytoscape-container"></div>
      <div *ngIf="isLoading()" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="text-white mt-4">Loading graph data...</div>
      </div>
    </div>
  `,
  styles: [`
    .graph-container {
      position: relative;
      height: 100%;
      width: 100%;
      background-color: #0F172A;
    }

    .cytoscape-container {
      width: 100%;
      height: 100%;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 3px solid #374151;
      border-top: 3px solid #60A5FA;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class GraphCanvasComponent implements OnDestroy {
  @ViewChild('cytoscapeContainer', { static: true }) cytoscapeContainer!: ElementRef;

  private graphStore = inject(GraphStoreService);
  private rateLimiter = inject(RateLimiterService);
  private apiClient = inject(ApiClientService);
  private toastService = inject(ToastService);

  private cy: Core | null = null;
  public selectedNode = signal<GraphNode | null>(null);
  public isLoading = signal(false);
  private clickOutsideListener?: (event: Event) => void;

  // Computed values for reactive updates
  private nodes = computed(() => this.graphStore.allNodes());
  private links = computed(() => this.graphStore.allLinks());

  constructor() {
    // Update graph when data changes - needs to be in constructor for injection context
    effect(() => {
      this.updateGraph();
    }, { allowSignalWrites: true });
  }

  ngAfterViewInit() {
    this.initializeCytoscape();
    this.setupGraphActionHandler();
    this.setupClickOutsideListener();
  }

  ngOnDestroy(): void {
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener);
    }
  }

  private setupClickOutsideListener(): void {
    this.clickOutsideListener = (event: Event) => {
      // Only dismiss if panel is open
      if (!this.selectedNode()) return;

      const target = event.target as Element;
      
      // Check if click is inside the node panel
      const nodePanel = document.querySelector('.node-panel');
      if (nodePanel && nodePanel.contains(target)) {
        return;
      }

      // Check if click is on a cytoscape node
      if (this.cy) {
        const containerElement = this.cy.container();
        if (containerElement && containerElement.contains(target)) {
          // Let node clicks be handled by cytoscape events
          return;
        }
      }

      // Click is outside panel and graph - close panel
      this.clearSelection();
    };

    document.addEventListener('click', this.clickOutsideListener);
  }

  private initializeCytoscape(): void {
    this.cy = cytoscape({
      container: this.cytoscapeContainer.nativeElement,
      
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#F5F5DC', // beige
            'label': 'data(title)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#000',
            'font-size': 10, // Will be overridden by adaptive sizing
            'font-family': 'system-ui, sans-serif',
            'text-wrap': 'wrap',
            'text-max-width': '80px', // Smaller than node width to ensure padding
            'width': '80px', // Increased node width
            'height': '80px', // Increased node height  
            'border-width': '2px',
            'border-color': '#94A3B8', // gray border by default
            'overlay-padding': '8px' // Increased padding
          }
        },
        {
          selector: 'node[expanded]',
          style: {
            'border-color': '#94A3B8', // gray border for expanded nodes too
            'border-width': '2px'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#FDE68A',
            'border-color': '#F59E0B',
            'border-width': '4px'
          }
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'straight',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#64748B',
            'line-color': '#64748B',
            'width': 2,
            'arrow-scale': 1.2
          }
        },
        {
          selector: 'edge[bidirectional]',
          style: {
            'source-arrow-shape': 'triangle',
            'source-arrow-color': '#64748B',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#64748B',
            'line-color': '#3B82F6',
            'arrow-scale': 1.2
          }
        }
      ],

      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 1000,
        animationEasing: 'ease-out',
        nodeRepulsion: 10000,
        nodeOverlap: 20,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      },

      // Enable panning and zooming
      zoomingEnabled: true,
      userZoomingEnabled: true,
      panningEnabled: true,
      userPanningEnabled: true,
      
      // Disable selection box
      boxSelectionEnabled: false,
      
      // Mobile-friendly settings
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.5
    });

    // Handle node clicks
    this.cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      this.handleNodeClick(nodeId);
    });

    // Handle double-click to open Wikipedia article
    this.cy.on('dbltap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      this.openWikipediaArticle(nodeId);
    });

    // Handle canvas clicks (deselect)
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.selectedNode.set(null);
      }
    });

    // Handle node selection
    this.cy.on('select', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      const graphNode = this.graphStore.getNode(nodeId);
      this.selectedNode.set(graphNode || null);
    });

    // Handle node deselection
    this.cy.on('unselect', 'node', () => {
      this.selectedNode.set(null);
    });

    // Handle node hover effects
    this.cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      
      // Green hover effect for all nodes
      node.style({
        'background-color': '#F0FDF4', // light green background
        'border-color': '#22C55E', // green border
        'border-width': '3px'
      });
    });

    this.cy.on('mouseout', 'node', (event) => {
      const node = event.target;
      
      // Reset to default gray style
      node.style({
        'background-color': '#F5F5DC', // beige background
        'border-color': '#94A3B8', // gray border
        'border-width': '2px'
      });
    });
  }

  private handleNodeClick(nodeId: string): void {
    // Just select the node to show info panel
    const node = this.graphStore.getNode(nodeId);
    this.selectedNode.set(node || null);
  }

  public handleNodeToggle(nodeId: string): void {
    const node = this.graphStore.getNode(nodeId);
    if (!node) return;

    const actionType = node.expanded ? 'collapse' : 'expand';
    const success = this.rateLimiter.enqueueGraphAction(actionType, nodeId);
    
    if (!success) {
      this.toastService.showQueueFullWarning();
    }
  }

  public clearSelection(): void {
    this.selectedNode.set(null);
  }

  private setupGraphActionHandler(): void {
    this.rateLimiter.graphActions$.subscribe(action => {
      this.rateLimiter.dequeueGraphAction();
      
      if (action.type === 'expand') {
        this.handleExpand(action.nodeId);
      } else {
        this.handleCollapse(action.nodeId);
      }
    });
  }

  private handleExpand(nodeId: string): void {
    // Check cache first
    if (this.graphStore.hasLinksCache(nodeId)) {
      const cachedResult = this.graphStore.getCachedLinks(nodeId);
      if (cachedResult) {
        this.graphStore.expandNode(nodeId, cachedResult);
        return;
      }
    }

    // Fetch from API
    this.isLoading.set(true);
    const node = this.graphStore.getNode(nodeId);
    if (!node) return;

    this.apiClient.getArticleLinks(node.title).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        this.graphStore.expandNode(nodeId, result);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.showNetworkError(error);
      }
    });
  }

  private handleCollapse(nodeId: string): void {
    this.graphStore.collapseNode(nodeId);
  }

  private updateGraph(): void {
    if (!this.cy) return;

    const nodes = this.nodes();
    const links = this.links();

    // Prepare cytoscape elements
    const cyElements = [
      // Nodes
      ...nodes.map(node => ({
        data: {
          id: node.id,
          title: node.title,
          expanded: node.expanded
        }
      })),
      // Links
      ...links.map(link => ({
        data: {
          id: `${link.source}-${link.target}`,
          source: link.source,
          target: link.target,
          bidirectional: link.bidirectional
        }
      }))
    ];

    // Update elements
    this.cy.elements().remove();
    this.cy.add(cyElements);

    // Apply adaptive font sizing after nodes are added
    this.cy.nodes().forEach(node => {
      const title = node.data('title') || '';
      const length = title.length;
      let fontSize = 12; // default
      
      if (length > 30) fontSize = 6;
      else if (length > 25) fontSize = 7;
      else if (length > 20) fontSize = 8;
      else if (length > 15) fontSize = 9;
      else if (length > 12) fontSize = 10;
      else if (length > 8) fontSize = 11;
      
      node.style('font-size', fontSize);
    });

    // Run layout
    const layout = this.cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 800,
      animationEasing: 'ease-out',
      nodeRepulsion: 8000,
      nodeOverlap: 20,
      idealEdgeLength: 80,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
      fit: true,
      padding: 20
    });

    layout.run();
  }

  private openWikipediaArticle(nodeId: string): void {
    const node = this.graphStore.getNode(nodeId);
    if (!node) return;

    // Convert spaces to underscores for Wikipedia URLs
    const articleTitle = encodeURIComponent(node.title.replace(/ /g, '_'));
    const wikipediaUrl = `https://en.wikipedia.org/wiki/${articleTitle}`;
    
    // Open in new tab
    window.open(wikipediaUrl, '_blank', 'noopener,noreferrer');
    
    // Show toast feedback
    this.toastService.showToast(`Opening "${node.title}" in Wikipedia`, 'info');
  }

  // Public method for parent component to trigger node actions
  public toggleNode(nodeId: string): void {
    this.handleNodeClick(nodeId);
  }

  // Public method to get selected node
  public getSelectedNode(): GraphNode | null {
    return this.selectedNode();
  }
}
