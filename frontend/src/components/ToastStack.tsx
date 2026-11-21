import type { ToastStackProps } from './types';

const marks = { success: '✓', info: 'i', error: '!' };

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => <div className={`toast-item ${toast.variant}`} role={toast.variant === 'error' ? 'alert' : 'status'} key={toast.id}>
        <span className="toast-mark" aria-hidden="true">{marks[toast.variant]}</span><span className="toast-message">{toast.message}</span>
        <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">×</button>
      </div>)}
    </div>
  );
}
