import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { db } from '../db/db';
import { addPhoto, checklistForRoom, deletePhoto, photosForRoom, updatePhoto } from '../db/queries';
import { getActivePropertyId } from '../lib/activeProperty';
import { parsePhase } from '../lib/phase';
import type { Photo } from '../types';

function groupByKey(photos: Photo[]): Map<string, Photo[]> {
  const map = new Map<string, Photo[]>();
  for (const p of photos) {
    const list = map.get(p.checklistKey) ?? [];
    list.push(p);
    map.set(p.checklistKey, list);
  }
  return map;
}

export function RoomChecklist() {
  const { phase: phaseParam, roomId } = useParams<{ phase: string; roomId: string }>();
  const phase = parsePhase(phaseParam);
  const navigate = useNavigate();
  const propertyId = getActivePropertyId();

  const room = useLiveQuery(() => (roomId ? db.rooms.get(roomId) : undefined), [roomId]);
  const photos = useLiveQuery(() => (roomId ? photosForRoom(roomId, phase) : []), [roomId, phase]) ?? [];
  const photosByKey = useMemo(() => groupByKey(photos), [photos]);
  const items = useMemo(() => (room ? checklistForRoom(room) : []), [room]);

  const referencePhotos =
    useLiveQuery(
      () => (phase === 'move-out' && roomId ? photosForRoom(roomId, 'move-in') : []),
      [roomId, phase],
    ) ?? [];
  const referenceByKey = useMemo(() => groupByKey(referencePhotos), [referencePhotos]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKeyRef = useRef<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  if (!propertyId || !roomId) {
    navigate('/');
    return null;
  }

  function triggerCapture(key: string) {
    pendingKeyRef.current = key;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const key = pendingKeyRef.current;
    pendingKeyRef.current = null;
    if (!file || !key) return;
    const pairedMoveInPhotoId =
      phase === 'move-out' ? referenceByKey.get(key)?.[0]?.id : undefined;
    const photo = await addPhoto({
      propertyId: propertyId!,
      roomId: roomId!,
      phase,
      checklistKey: key,
      blob: file,
      isDamage: false,
      pairedMoveInPhotoId,
    });
    setEditingPhoto(photo);
  }

  const doneCount = items.filter((i) => (photosByKey.get(i.key)?.length ?? 0) > 0).length;

  return (
    <PageShell
      title={room?.name ?? 'Room'}
      onBack
      footer={<Button onClick={() => navigate(`/progress/${phase}`)}>Done with this room</Button>}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-slate-600 text-sm mb-3">
        {doneCount}/{items.length} shots captured
      </p>

      <ul className="space-y-3">
        {items.map((item) => {
          const shots = photosByKey.get(item.key) ?? [];
          const reference = phase === 'move-out' ? referenceByKey.get(item.key)?.[0] : undefined;
          return (
            <li key={item.key} className="bg-white rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-800">{item.label}</span>
                <button
                  className="text-brand-700 text-sm font-medium"
                  onClick={() => triggerCapture(item.key)}
                >
                  {shots.length > 0 ? '+ Retake' : 'Take photo'}
                </button>
              </div>

              {phase === 'move-out' && (
                <div className="mb-2">
                  {reference ? (
                    <div className="flex items-center gap-2">
                      <ReferenceThumb photo={reference} />
                      <span className="text-xs text-slate-400">Move-in reference</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">No move-in photo</span>
                  )}
                </div>
              )}

              {shots.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {shots.map((photo) => (
                    <Thumb key={photo.id} photo={photo} onTap={() => setEditingPhoto(photo)} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => triggerCapture('extra')}>
          + Add another photo
        </Button>
      </div>

      {photosByKey.get('extra') && photosByKey.get('extra')!.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photosByKey.get('extra')!.map((photo) => (
            <Thumb key={photo.id} photo={photo} onTap={() => setEditingPhoto(photo)} />
          ))}
        </div>
      )}

      {editingPhoto && (
        <PhotoEditor photo={editingPhoto} phase={phase} onClose={() => setEditingPhoto(null)} />
      )}
    </PageShell>
  );
}

function Thumb({ photo, onTap }: { photo: Photo; onTap: () => void }) {
  const url = useMemo(() => URL.createObjectURL(photo.blob), [photo.blob]);
  return (
    <button
      onClick={onTap}
      className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
        photo.isDamage ? 'border-red-500' : 'border-transparent'
      }`}
    >
      <img src={url} alt="" className="w-full h-full object-cover" />
      {photo.isDamage && (
        <span className="absolute bottom-0 left-0 right-0 bg-red-600/80 text-white text-[9px] text-center py-0.5">
          DAMAGE
        </span>
      )}
    </button>
  );
}

function ReferenceThumb({ photo }: { photo: Photo }) {
  const url = useMemo(() => URL.createObjectURL(photo.blob), [photo.blob]);
  return (
    <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden opacity-70 ring-1 ring-slate-300">
      <img src={url} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

function PhotoEditor({
  photo,
  phase,
  onClose,
}: {
  photo: Photo;
  phase: 'move-in' | 'move-out';
  onClose: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(photo.blob), [photo.blob]);
  const [note, setNote] = useState(photo.note ?? '');
  const [isDamage, setIsDamage] = useState(photo.isDamage);

  async function save() {
    await updatePhoto(photo.id, { note: note.trim() || undefined, isDamage });
    onClose();
  }

  async function remove() {
    if (!confirm('Delete this photo?')) return;
    await deletePhoto(photo.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-20 flex items-end sm:items-center sm:justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-4 max-h-[90vh] overflow-y-auto">
        <img src={url} alt="" className="w-full rounded-lg mb-3 max-h-64 object-contain bg-slate-100" />
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={isDamage}
            onChange={(e) => setIsDamage(e.target.checked)}
            className="w-5 h-5"
          />
          <span className="text-slate-800">
            {phase === 'move-out' ? 'Flag as damage' : 'Flag as existing damage'}
          </span>
        </label>
        <textarea
          className="input mb-4"
          rows={2}
          placeholder="Note (e.g. scratch on lower left, ~10cm)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-2">
          <Button variant="danger" className="w-auto px-4" onClick={remove}>
            Delete
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
        <button className="w-full text-center text-slate-400 text-sm mt-3" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
