import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function PageShell({
  title,
  onBack,
  children,
  footer,
}: {
  title: string;
  onBack?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh flex flex-col">
      <header
        className="flex items-center gap-3 px-4 py-3 bg-brand-600 text-white sticky top-0 z-10 shadow-sm"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        {onBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="text-2xl leading-none px-2 -ml-2 py-1"
          >
            ‹
          </button>
        )}
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </header>
      <main className="flex-1 px-4 py-4 pb-28 max-w-xl w-full mx-auto">{children}</main>
      {footer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto">{footer}</div>
        </div>
      )}
    </div>
  );
}
