import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphNode } from '../../models/graph-node';

@Component({
  selector: 'app-node-info-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="selectedNode()" class="node-panel">
      <div class="panel-content">
        <h3 class="text-lg font-semibold mb-2 text-white">{{ selectedNode()!.title }}</h3>
        
        <div class="panel-actions mb-3">
          <a 
            [href]="getWikipediaUrl(selectedNode()!.title)"
            target="_blank"
            rel="noopener noreferrer"
            class="article-link"
            (click)="onLinkClick($event)">
            Open Article
          </a>
          
          <button 
            class="expand-button"
            (click)="onToggleClick()"
            [class.expanded]="selectedNode()!.expanded">
            <span *ngIf="!selectedNode()!.expanded">Expand</span>
            <span *ngIf="selectedNode()!.expanded">Collapse</span>
          </button>
        </div>
        
        <div class="node-stats text-sm text-gray-400">
          <div>Links: {{ selectedNode()!.degree }}</div>
          <div class="mt-1">
            <span *ngIf="selectedNode()!.expanded" class="text-green-400">• Expanded</span>
            <span *ngIf="!selectedNode()!.expanded" class="text-gray-500">• Collapsed</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .node-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid #4B5563;
      border-radius: 0.75rem;
      padding: 1.5rem;
      min-width: 280px;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      backdrop-filter: blur(10px);
      z-index: 1000;
    }

    .panel-content {
      position: relative;
    }

    .panel-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .article-link {
      color: #93C5FD;
      text-decoration: none;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border: 1px solid rgba(59, 130, 246, 0.5);
      border-radius: 0.5rem;
      background: rgba(37, 99, 235, 0.2);
      transition: all 0.2s;
      font-size: 0.875rem;
    }

    .article-link:hover {
      color: #DBEAFE;
      background: rgba(37, 99, 235, 0.3);
      border-color: rgba(59, 130, 246, 0.7);
    }

    .expand-button {
      background: rgba(16, 185, 129, 0.2);
      color: #86EFAC;
      border: 1px solid rgba(34, 197, 94, 0.5);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .expand-button:hover {
      background: rgba(16, 185, 129, 0.3);
      color: #BBF7D0;
      border-color: rgba(34, 197, 94, 0.7);
    }

    .expand-button.expanded {
      background: rgba(239, 68, 68, 0.2);
      color: #FCA5A5;
      border-color: rgba(248, 113, 113, 0.5);
    }

    .expand-button.expanded:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #FECACA;
      border-color: rgba(248, 113, 113, 0.7);
    }

    .node-stats {
      border-top: 1px solid rgba(75, 85, 99, 0.3);
      padding-top: 0.75rem;
    }
  `]
})
export class NodeInfoPanelComponent {
  selectedNode = input<GraphNode | null>(null);
  toggleNode = output<string>();
  closePanel = output<void>();

  onToggleClick(): void {
    const node = this.selectedNode();
    if (node) {
      this.toggleNode.emit(node.id);
      // Close the panel after toggling
      this.closePanel.emit();
    }
  }

  onLinkClick(event: MouseEvent): void {
    // Close panel when link is clicked and stop propagation
    event.stopPropagation();
    this.closePanel.emit();
  }

  getWikipediaUrl(title: string): string {
    const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
    return `https://en.wikipedia.org/wiki/${encodedTitle}`;
  }
}
