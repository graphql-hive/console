import { useCallback, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { Button } from '../button/button';
import { toastStyles } from './toast.css';

export type ToastVariant = 'default' | 'destructive' | 'success';

export type ToastOptions = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  /**
   * Milliseconds before the toast dismisses itself. Default and success toasts go after 5s;
   * destructive ones stay until closed, since they carry a message worth reading. `0` keeps
   * any toast up.
   */
  duration?: number;
};

const timeoutByVariant: Record<ToastVariant, number> = {
  default: 5000,
  success: 5000,
  destructive: 0,
};

export function useToast() {
  // The manager changes on every toast; add/close don't, which keeps `toast` safe in effect deps.
  const { add, close } = BaseToast.useToastManager();

  const toast = useCallback(
    ({ title, description, variant = 'default', duration }: ToastOptions) => {
      const id = add({
        title,
        description,
        type: variant,
        timeout: duration ?? timeoutByVariant[variant],
        priority: variant === 'destructive' ? 'high' : 'low',
      });
      return { id, dismiss: () => close(id) };
    },
    [add, close],
  );

  return { toast };
}

const iconByVariant: Record<ToastVariant, ReactNode> = {
  default: <Info aria-hidden className={toastStyles.icon.default} />,
  success: <CircleCheck aria-hidden className={toastStyles.icon.success} />,
  destructive: <CircleAlert aria-hidden className={toastStyles.icon.destructive} />,
};

function ToastList() {
  const { toasts } = BaseToast.useToastManager();

  return toasts.map(toast => (
    <BaseToast.Root key={toast.id} toast={toast} className={toastStyles.root}>
      <BaseToast.Content className={toastStyles.content}>
        {iconByVariant[(toast.type as ToastVariant | undefined) ?? 'default']}
        <div className={toastStyles.body}>
          <BaseToast.Title className={toastStyles.title} />
          <BaseToast.Description className={toastStyles.description} />
        </div>
      </BaseToast.Content>
      <span className={toastStyles.close}>
        <BaseToast.Close
          render={
            <Button layout="iconOnly" icon={X} aria-label="Close" variant="ghost" size="icon-sm" />
          }
        />
      </span>
    </BaseToast.Root>
  ));
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <BaseToast.Provider limit={3}>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className={toastStyles.viewport}>
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}
