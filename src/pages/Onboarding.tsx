import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { Disclaimer } from '../components/Disclaimer';
import { db, newId } from '../db/db';
import { createProperty } from '../db/queries';
import { getActivePropertyId, setActivePropertyId } from '../lib/activeProperty';
import { currentPhase } from '../lib/phase';
import type { Roommate } from '../types';
import { APP_NAME } from '../config/app';

export function Onboarding() {
  const navigate = useNavigate();
  const existingPropertyId = getActivePropertyId();
  const existingProperty = useLiveQuery(
    () => (existingPropertyId ? db.properties.get(existingPropertyId) : undefined),
    [existingPropertyId],
  );
  const [address, setAddress] = useState('');
  const [moveInDate, setMoveInDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [landlordName, setLandlordName] = useState('');
  const [landlordEmail, setLandlordEmail] = useState('');
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [roommateInput, setRoommateInput] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = address.trim().length > 0 && moveInDate.length > 0;
  const hasExisting = existingPropertyId !== null;

  function addRoommate() {
    const name = roommateInput.trim();
    if (!name) return;
    setRoommates((r) => [...r, { id: newId(), name }]);
    setRoommateInput('');
  }

  async function handleSubmit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    const property = await createProperty({
      address: address.trim(),
      moveInDate: new Date(moveInDate).toISOString(),
      landlordName: landlordName.trim(),
      landlordEmail: landlordEmail.trim(),
      roommates,
    });
    setActivePropertyId(property.id);
    navigate('/rooms');
  }

  return (
    <PageShell
      title={`Welcome to ${APP_NAME}`}
      footer={
        <Button disabled={!canSubmit || saving} onClick={handleSubmit}>
          {saving ? 'Setting up…' : 'Start move-in walkthrough'}
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="text-slate-600 text-sm">
          A few quick details, then we'll walk you through photographing every room.
          Everything stays on this device.
        </p>

        {hasExisting && existingProperty && (
          <button
            className="text-sm text-brand-700 font-medium underline"
            onClick={() => navigate(`/progress/${currentPhase(existingProperty)}`)}
          >
            Continue my existing walkthrough instead
          </button>
        )}

        <Field label="Property address">
          <textarea
            className="input"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Apt 4, Springfield"
          />
        </Field>

        <Field label="Move-in date">
          <input
            type="date"
            className="input"
            value={moveInDate}
            onChange={(e) => setMoveInDate(e.target.value)}
          />
        </Field>

        <Field label="Landlord name (optional)">
          <input
            type="text"
            className="input"
            value={landlordName}
            onChange={(e) => setLandlordName(e.target.value)}
            placeholder="Jane Landlord"
          />
        </Field>

        <Field label="Landlord email (optional)">
          <input
            type="email"
            className="input"
            value={landlordEmail}
            onChange={(e) => setLandlordEmail(e.target.value)}
            placeholder="landlord@example.com"
          />
        </Field>

        <Field label="Roommates (optional)">
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              value={roommateInput}
              onChange={(e) => setRoommateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRoommate();
                }
              }}
              placeholder="Add a name"
            />
            <Button variant="secondary" className="w-auto px-4" onClick={addRoommate}>
              Add
            </Button>
          </div>
          {roommates.length > 0 && (
            <ul className="mt-2 space-y-1">
              {roommates.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between items-center bg-white rounded-lg px-3 py-2 text-sm"
                >
                  {r.name}
                  <button
                    className="text-slate-400 px-2"
                    onClick={() => setRoommates((list) => list.filter((x) => x.id !== r.id))}
                    aria-label={`Remove ${r.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        <Disclaimer compact />
      </div>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
