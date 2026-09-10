import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { db } from '../db/db';
import { addRoom, checklistForRoom, photosForRoom, removeRoom, renameRoom } from '../db/queries';
import { getActivePropertyId } from '../lib/activeProperty';

export function RoomSetup() {
  const navigate = useNavigate();
  const propertyId = getActivePropertyId();
  const [newRoomName, setNewRoomName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const rooms = useLiveQuery(
    () => (propertyId ? db.rooms.where('propertyId').equals(propertyId).sortBy('sortOrder') : []),
    [propertyId],
  );

  const roomProgress = useLiveQuery(async () => {
    if (!rooms) return {};
    const entries = await Promise.all(
      rooms.map(async (room) => {
        const total = checklistForRoom(room).length;
        const photos = await photosForRoom(room.id, 'move-in');
        const done = new Set(photos.map((p) => p.checklistKey)).size;
        return [room.id, { done: Math.min(done, total), total }] as const;
      }),
    );
    return Object.fromEntries(entries);
  }, [rooms]);

  if (!propertyId) {
    navigate('/');
    return null;
  }

  async function handleAddRoom() {
    const name = newRoomName.trim();
    if (!name) return;
    await addRoom(propertyId!, name);
    setNewRoomName('');
  }

  async function handleRemove(roomId: string) {
    if (!confirm('Remove this room and any photos already taken for it?')) return;
    await removeRoom(roomId);
  }

  async function commitRename() {
    if (editingId && editingName.trim()) {
      await renameRoom(editingId, editingName.trim());
    }
    setEditingId(null);
  }

  return (
    <PageShell
      title="Rooms"
      footer={
        <Button onClick={() => navigate('/progress')}>Continue to walkthrough</Button>
      }
    >
      <p className="text-slate-600 text-sm mb-4">
        Add, rename, or remove rooms so this matches your place, then tap a room to start
        photographing it.
      </p>

      <ul className="space-y-2 mb-4">
        {rooms?.map((room) => {
          const progress = roomProgress?.[room.id];
          return (
            <li key={room.id} className="bg-white rounded-xl px-3 py-3 flex items-center gap-2">
              {editingId === room.id ? (
                <input
                  autoFocus
                  className="input flex-1 py-1.5"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                />
              ) : (
                <button
                  className="flex-1 text-left"
                  onClick={() => navigate(`/checklist/${room.id}`)}
                >
                  <div className="font-medium text-slate-800">{room.name}</div>
                  {progress && (
                    <div className="text-xs text-slate-500">
                      {progress.done}/{progress.total} shots
                    </div>
                  )}
                </button>
              )}
              <button
                className="text-slate-400 px-2 py-1 text-sm"
                onClick={() => {
                  setEditingId(room.id);
                  setEditingName(room.name);
                }}
                aria-label={`Rename ${room.name}`}
              >
                Rename
              </button>
              <button
                className="text-red-400 px-2 py-1 text-sm"
                onClick={() => handleRemove(room.id)}
                aria-label={`Remove ${room.name}`}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="Add a room (e.g. Office)"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddRoom()}
        />
        <Button variant="secondary" className="w-auto px-4" onClick={handleAddRoom}>
          Add
        </Button>
      </div>
    </PageShell>
  );
}
