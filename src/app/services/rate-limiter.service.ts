import { Injectable } from '@angular/core';
import { Subject, Observable, timer, concatMap, map, distinctUntilChanged, debounceTime } from 'rxjs';
import { GraphAction } from '../models/api-models';

@Injectable({
  providedIn: 'root'
})
export class RateLimiterService {
  private graphActionQueue: GraphAction[] = [];
  private readonly maxQueueLength = 3;
  private readonly actionRateMs = 1000; // 1 second

  // Subject for queued actions
  private actionQueueSubject = new Subject<GraphAction>();
  
  // Subject for search queries (separate pipeline)
  private searchQuerySubject = new Subject<string>();

  // Observable for rate-limited graph actions (1/sec)
  public readonly graphActions$ = this.actionQueueSubject.pipe(
    concatMap(action => timer(this.actionRateMs).pipe(map(() => action)))
  );

  // Observable for debounced search queries (1000ms debounce)
  public readonly searchQueries$ = this.searchQuerySubject.pipe(
    debounceTime(1000),
    distinctUntilChanged()
  );

  /**
   * Queue a graph action (expand/collapse)
   * Returns false if queue is full, true if queued successfully
   */
  enqueueGraphAction(type: 'expand' | 'collapse', nodeId: string): boolean {
    if (this.graphActionQueue.length >= this.maxQueueLength) {
      return false; // Queue full
    }

    const action: GraphAction = {
      type,
      nodeId,
      timestamp: Date.now()
    };

    this.graphActionQueue.push(action);
    this.actionQueueSubject.next(action);
    return true;
  }

  /**
   * Submit a search query (will be debounced)
   */
  submitSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);
  }

  /**
   * Get current queue length for UI feedback
   */
  getQueueLength(): number {
    return this.graphActionQueue.length;
  }

  /**
   * Process an action from the queue (called when action is processed)
   */
  dequeueGraphAction(): void {
    this.graphActionQueue.shift();
  }
}
