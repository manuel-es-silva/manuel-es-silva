import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { db, newId } from '../db/db';
import { setRoommates, updateProperty } from '../db/queries';
import { getActivePropertyId } from '../lib/activeProperty';
import type { Roommate } from '../types';

const SELF_ID = 'self';

export function Split() {
  const navigate = useNavigate();
  const propertyId = getActivePropertyId();
  const property = useLiveQuery(() => (propertyId ? db.properties.get(propertyId) : undefined), [propertyId]);

  const [nameInput, setNameInput] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [returnedAmount, setReturnedAmount] = useState('');

  useEffect(() => {
    if (!property) return;
    if (!property.roommates.some((r) => r.id === SELF_ID)) {
      setRoommates(property.id, [{ id: SELF_ID, name: 'You' }, ...property.roommates]);
    }
    if (depositAmount === '' && property.depositAmount != null) {
      setDepositAmount(String(property.depositAmount));
    }
    if (returnedAmount === '' && property.depositReturnedAmount != null) {
      setReturnedAmount(String(property.depositReturnedAmount));
    }
  }, [property?.id]);

  if (!propertyId) {
    navigate('/');
    return null;
  }

  const roommates = property?.roommates ?? [];
  const deposit = parseFloat(depositAmount) || 0;
  const returned = returnedAmount === '' ? deposit : parseFloat(returnedAmount) || 0;
  const deduction = Math.max(0, deposit - returned);
  const totalPaid = roommates.reduce((s, r) => s + (r.depositPaid ?? 0), 0);

  function shareOf(r: Roommate): number {
    if (totalPaid > 0) return (r.depositPaid ?? 0) / totalPaid;
    return roommates.length > 0 ? 1 / roommates.length : 0;
  }

  async function saveDepositAmount(value: string) {
    setDepositAmount(value);
    await updateProperty(propertyId!, { depositAmount: parseFloat(value) || undefined });
  }

  async function saveReturnedAmount(value: string) {
    setReturnedAmount(value);
    await updateProperty(propertyId!, { depositReturnedAmount: parseFloat(value) || undefined });
  }

  async function updatePaid(id: string, value: string) {
    if (!property) return;
    const next = property.roommates.map((r) =>
      r.id === id ? { ...r, depositPaid: parseFloat(value) || undefined } : r,
    );
    await setRoommates(property.id, next);
  }

  async function addRoommate() {
    if (!property) return;
    const name = nameInput.trim();
    if (!name) return;
    await setRoommates(property.id, [...property.roommates, { id: newId(), name }]);
    setNameInput('');
  }

  async function removeRoommate(id: string) {
    if (!property || id === SELF_ID) return;
    await setRoommates(property.id, property.roommates.filter((r) => r.id !== id));
  }

  return (
    <PageShell title="Split deposit" onBack>
      <div className="space-y-4">
        <div className="flex gap-3">
          <label className="flex-1 block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Total deposit</span>
            <input
              type="number"
              inputMode="decimal"
              className="input"
              value={depositAmount}
              onChange={(e) => saveDepositAmount(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="flex-1 block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Returned</span>
            <input
              type="number"
              inputMode="decimal"
              className="input"
              value={returnedAmount}
              onChange={(e) => saveReturnedAmount(e.target.value)}
              placeholder={depositAmount || '0'}
            />
          </label>
        </div>

        <ul className="space-y-2">
          {roommates.map((r) => (
            <li key={r.id} className="bg-white rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex-1 font-medium text-slate-800">{r.name}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="input w-24 py-1.5"
                  value={r.depositPaid ?? ''}
                  onChange={(e) => updatePaid(r.id, e.target.value)}
                  placeholder="Paid"
                />
                {r.id !== SELF_ID && (
                  <button
                    className="text-slate-400 px-1"
                    onClick={() => removeRoommate(r.id)}
                    aria-label={`Remove ${r.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>{Math.round(shareOf(r) * 100)}% share</span>
                <span className="text-green-700">+${(shareOf(r) * returned).toFixed(2)}</span>
                {deduction > 0 && (
                  <span className="text-red-600">-${(shareOf(r) * deduction).toFixed(2)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Add roommate"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRoommate()}
          />
          <Button variant="secondary" className="w-auto px-4" onClick={addRoommate}>
            Add
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
