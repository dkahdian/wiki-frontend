import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { GraphCanvasComponent } from './components/graph-canvas/graph-canvas.component';
import { NodeInfoPanelComponent } from './components/node-info-panel/node-info-panel.component';
import { ToastDisplayComponent } from './components/toast-display/toast-display.component';
import { GraphStoreService } from './services/graph-store.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SearchBarComponent,
    GraphCanvasComponent,
    NodeInfoPanelComponent,
    ToastDisplayComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Wikipedia Graph Explorer';
  
  private graphStore = inject(GraphStoreService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    // Load initial demo data
    this.graphStore.loadInitialData();
  }

  clearGraph(graphCanvas: GraphCanvasComponent): void {
    // Clear the selected node first
    graphCanvas.clearSelection();
    
    // Clear all graph data
    this.graphStore.clear();
    
    // Show feedback
    this.toastService.showToast('Graph cleared', 'info');
  }
}
