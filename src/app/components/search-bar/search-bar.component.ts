import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClientService } from '../../services/api-client.service';
import { RateLimiterService } from '../../services/rate-limiter.service';
import { GraphStoreService } from '../../services/graph-store.service';
import { ToastService } from '../../services/toast.service';
import { SearchResult } from '../../models/api-models';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <div class="search-header">
        <h1 class="text-2xl font-bold mb-4 text-white">Wikipedia Graph Explorer</h1>
      </div>

      <div class="search-form">
        <div class="relative">
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (input)="onSearchInput()"
            (keydown.enter)="onEnterPress()"
            placeholder="Search Wikipedia articles..." 
            class="search-input w-full"
            [disabled]="isLoading()"
            #searchInput>
          
          <div class="absolute inset-y-0 right-0 flex items-center pr-3">
            <div *ngIf="isLoading()" class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        </div>

        <div *ngIf="searchResults().length > 0" class="results-dropdown mt-2 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <button 
            *ngFor="let result of searchResults()" 
            (click)="selectResult(result)"
            class="w-full text-left px-4 py-2 hover:bg-gray-700 text-white border-b border-gray-700 last:border-b-0">
            {{ result }}
          </button>
        </div>

        <div *ngIf="showNoResults()" class="mt-2 text-gray-400 text-sm">
          No results found for "{{ searchQuery }}"
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.8);
    }

    .search-header {
      margin-bottom: 0.75rem;
    }

    .search-header h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .results-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 50;
    }

    .search-form {
      position: relative;
    }
  `]
})
export class SearchBarComponent {
  private apiClient = inject(ApiClientService);
  private rateLimiter = inject(RateLimiterService);
  private graphStore = inject(GraphStoreService);
  private toastService = inject(ToastService);

  public searchQuery = '';
  public isLoading = signal(false);
  public searchResults = signal<string[]>([]);
  public showNoResults = signal(false);

  ngOnInit() {
    // Subscribe to debounced search queries
    this.rateLimiter.searchQueries$.subscribe(query => {
      if (query.trim()) {
        this.performSearch(query);
      } else {
        this.searchResults.set([]);
        this.showNoResults.set(false);
      }
    });
  }

  onSearchInput(): void {
    this.showNoResults.set(false);
    this.rateLimiter.submitSearchQuery(this.searchQuery);
  }

  onEnterPress(): void {
    const results = this.searchResults();
    if (results.length > 0) {
      this.selectResult(results[0]);
    }
  }

  selectResult(title: string): void {
    this.graphStore.addRootNode(title);
    this.resetSearch();
  }

  private resetSearch(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
    this.showNoResults.set(false);
    this.isLoading.set(false);
  }

  private performSearch(query: string): void {
    this.isLoading.set(true);
    
    this.apiClient.searchArticles(query).subscribe({
      next: (result: SearchResult) => {
        this.isLoading.set(false);
        this.searchResults.set(result.search);
        this.showNoResults.set(result.search.length === 0);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.searchResults.set([]);
        this.showNoResults.set(true);
        this.toastService.showNetworkError(error);
      }
    });
  }
}
