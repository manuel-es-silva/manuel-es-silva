import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { db } from '../db/db';
import { getActivePropertyId } from '../lib/activeProperty';

export function MoveOutStart() {
  const navigate = useNavigate();
  const propertyId = getActivePropertyId();
  const property = useLiveQuery(() => (propertyId ? db.properties.get(propertyId) : undefined), [propertyId]);
  const [moveOutDate, setMoveOutDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [starting, setStarting] = useState(false);

  if (!propertyId) {
    navigate('/');
    return null;
  }

  if (property?.moveOutDate) {
    navigate('/progress/move-out');
    return null;
  }

  async function handleStart() {
    if (!propertyId || starting) return;
    setStarting(true);
    await db.properties.update(propertyId, { moveOutDate: new Date(moveOutDate).toISOString() });
    navigate('/progress/move-out');
  }

  return (
    <PageShell
      title="Start move-out"
      onBack
      footer={
        <Button disabled={starting} onClick={handleStart}>
          {starting ? 'Starting…' : 'Start move-out walkthrough'}
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="text-slate-600 text-sm">
          We'll walk you through the same rooms and checklist as move-in, so you can
          re-photograph each spot for a before/after comparison. Your move-in photos and notes
          stay exactly as they are.
        </p>

        {property && (
          <div className="bg-white rounded-xl p-3 text-sm text-slate-700">
            <div className="font-medium">{property.address}</div>
            <div className="text-slate-500">
              Moved in {new Date(property.moveInDate).toLocaleDateString()}
            </div>
          </div>
        )}

        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Move-out date</span>
          <input
            type="date"
            className="input"
            value={moveOutDate}
            onChange={(e) => setMoveOutDate(e.target.value)}
          />
        </label>
      </div>
    </PageShell>
  );
}
