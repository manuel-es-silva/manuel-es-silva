import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { APP_NAME } from '../config/app';
import { UNLOCK_PRICE_LABEL } from '../config/payments';
import { WAITLIST_ENDPOINT } from '../config/waitlist';

const VALUE_PROPS = [
  'Guided photo checklist for every room',
  'Photos never leave your phone',
  'Dated, hash-verified PDF reports',
  'Before/after comparison at move-out',
];

export function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="min-h-dvh bg-brand-50 px-6 py-10">
      <div className="max-w-md mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">{APP_NAME}</h1>
          <p className="text-slate-600 mt-1">Get your security deposit back.</p>
        </div>

        <ul className="space-y-2">
          {VALUE_PROPS.map((v) => (
            <li key={v} className="flex gap-2 text-slate-700">
              <span className="text-brand-600">✓</span>
              {v}
            </li>
          ))}
        </ul>

        <Button onClick={() => navigate('/')}>Get started free</Button>
        <p className="text-center text-xs text-slate-400 -mt-4">
          Move-in photos are free · {UNLOCK_PRICE_LABEL} one-time unlock for reports
        </p>

        {status === 'sent' ? (
          <p className="text-green-700 text-sm text-center">You're on the list.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              required
              className="input flex-1"
              placeholder="Join the waitlist"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" variant="secondary" fullWidth={false} className="px-4">
              {status === 'sending' ? '…' : 'Join'}
            </Button>
          </form>
        )}
        {status === 'error' && (
          <p className="text-red-600 text-xs text-center">Couldn't submit — try again later.</p>
        )}
      </div>
    </div>
  );
}
