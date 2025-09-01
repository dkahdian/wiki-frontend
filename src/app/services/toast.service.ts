import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  
  public readonly toasts$ = this.toasts.asReadonly();

  showToast(message: string, type: 'info' | 'warning' | 'error' = 'info', duration: number = 3000): void {
    const toast: Toast = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      duration
    };

    const currentToasts = this.toasts();
    this.toasts.set([...currentToasts, toast]);

    // Auto-remove after duration
    setTimeout(() => {
      this.removeToast(toast.id);
    }, duration);
  }

  removeToast(id: string): void {
    const currentToasts = this.toasts();
    this.toasts.set(currentToasts.filter(toast => toast.id !== id));
  }

  showQueueFullWarning(): void {
    this.showToast('Action queue is full. Please wait...', 'warning', 2000);
  }

  showNetworkError(error: any): void {
    this.showToast('Network error. Please check your connection.', 'error', 4000);
  }
}
