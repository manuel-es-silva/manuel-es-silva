import { DISCLAIMER_TEXT } from '../config/app';

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`text-slate-500 ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>
      {DISCLAIMER_TEXT}
    </p>
  );
}
