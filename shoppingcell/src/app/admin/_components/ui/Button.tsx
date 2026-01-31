import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition disabled:opacity-60';

  const styles: Record<string, string> = {
    primary: 'bg-yellow-400 text-slate-950 hover:bg-yellow-300',
    ghost: 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    success: 'bg-green-600 text-white hover:bg-green-500',
  };

  return <button className={[base, styles[variant], className].join(' ')} {...props} />;
}
