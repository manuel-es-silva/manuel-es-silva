import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const styles: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white active:bg-brand-700 disabled:opacity-40',
  secondary: 'bg-white text-brand-700 border border-brand-600 active:bg-brand-50',
  danger: 'bg-red-600 text-white active:bg-red-700',
  ghost: 'bg-transparent text-slate-600 active:bg-slate-100',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`w-full py-3.5 rounded-xl font-medium text-base transition-colors ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
