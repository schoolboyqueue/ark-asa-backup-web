/**
 * @fileoverview Toast notification service for ARK ASA Backup Manager.
 * Provides centralized toast management using Hero UI's toast system.
 * Implements singleton pattern for consistent notification handling.
 */

import { addToast } from '@heroui/react';

/**
 * Toast notification types with visual styling.
 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Centralized toast notification service.
 * Wraps Hero UI's toast system with application-specific defaults.
 *
 * Design Patterns:
 * - Facade: Simplifies toast API
 * - Singleton: Single service instance
 *
 * @class ToastService
 */
class ToastService {
  /**
   * Shows a success toast notification.
   *
   * @param {string} message - Success message to display
   * @param {string} [title] - Optional title for the toast
   */
  success(message: string, title?: string): void {
    this.show('success', message, title);
  }

  /**
   * Shows an error toast notification.
   *
   * @param {string} message - Error message to display
   * @param {string} [title] - Optional title for the toast
   */
  error(message: string, title?: string): void {
    this.show('error', message, title);
  }

  /**
   * Shows a warning toast notification.
   *
   * @param {string} message - Warning message to display
   * @param {string} [title] - Optional title for the toast
   */
  warning(message: string, title?: string): void {
    this.show('warning', message, title);
  }

  /**
   * Shows an info toast notification.
   *
   * @param {string} message - Info message to display
   * @param {string} [title] - Optional title for the toast
   */
  info(message: string, title?: string): void {
    this.show('info', message, title);
  }

  /**
   * Internal method to show a toast with the specified type.
   *
   * @param {ToastType} type - Type of toast (success, error, warning, info)
   * @param {string} message - Message to display
   * @param {string} [title] - Optional title
   * @private
   */
  private show(type: ToastType, message: string, title?: string): void {
    addToast({
      title: title || this.getDefaultTitle(type),
      description: message,
      color: this.getColor(type),
      duration: type === 'error' ? 5000 : 3000, // Errors stay longer
    });
  }

  /**
   * Gets the default title for a toast type.
   *
   * @param {ToastType} type - Toast type
   * @returns {string} Default title
   * @private
   */
  private getDefaultTitle(type: ToastType): string {
    const titles: Record<ToastType, string> = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
    };
    return titles[type];
  }

  /**
   * Maps toast type to Hero UI color.
   *
   * @param {ToastType} type - Toast type
   * @returns {string} Hero UI color name
   * @private
   */
  private getColor(type: ToastType): 'success' | 'danger' | 'warning' | 'primary' {
    const colorMap: Record<ToastType, 'success' | 'danger' | 'warning' | 'primary'> = {
      success: 'success',
      error: 'danger',
      warning: 'warning',
      info: 'primary',
    };
    return colorMap[type];
  }
}

/**
 * Singleton toast service instance for application-wide use.
 * Import this constant to access all toast notification methods.
 *
 * @example
 * import { toast } from './services/toast';
 * toast.success('Backup created successfully!');
 * toast.error('Failed to delete backup');
 */
export const toast = new ToastService();
