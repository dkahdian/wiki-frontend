import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SearchResult, LinksResult } from '../models/api-models';

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  searchArticles(query: string, limit: number = environment.defaultSearchLimit): Observable<SearchResult> {
  const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;

  // Note: Do not set Content-Type on GET; it triggers a CORS preflight unnecessarily
  return this.http.get<SearchResult>(url).pipe(
      catchError(error => {
        console.error('Search API Error:', error);
        return throwError(() => new Error(`Search failed: ${error.message || 'Unknown error'}`));
      })
    );
  }

  getArticleLinks(title: string): Observable<LinksResult> {
    // Convert spaces to underscores for API call
    const normalizedTitle = title.replace(/\s+/g, '_');
  const url = `${this.baseUrl}/links/${encodeURIComponent(normalizedTitle)}`;

  return this.http.get<LinksResult>(url).pipe(
      catchError(error => {
        console.error('Links API Error:', error);
        return throwError(() => new Error(`Links fetch failed: ${error.message || 'Unknown error'}`));
      })
    );
  }

  /**
   * Normalize a title for use as a node ID
   * Converts spaces to underscores, maintains ASCII-only format
   */
  normalizeTitle(title: string): string {
    return title.replace(/\s+/g, '_');
  }

  /**
   * Denormalize a title for display
   * Converts underscores to spaces
   */
  denormalizeTitle(normalizedTitle: string): string {
    return normalizedTitle.replace(/_/g, ' ');
  }
}
