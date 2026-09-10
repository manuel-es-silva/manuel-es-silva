import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { db } from '../db/db';
import { checklistForRoom, photosForRoom } from '../db/queries';
import { getActivePropertyId } from '../lib/activeProperty';

export function Progress() {
  const navigate = useNavigate();
  const propertyId = getActivePropertyId();

  const rooms = useLiveQuery(
    () => (propertyId ? db.rooms.where('propertyId').equals(propertyId).sortBy('sortOrder') : []),
    [propertyId],
  );

  const roomStats = useLiveQuery(async () => {
    if (!rooms) return [];
    return Promise.all(
      rooms.map(async (room) => {
        const total = checklistForRoom(room).length;
        const photos = await photosForRoom(room.id, 'move-in');
        const done = new Set(photos.map((p) => p.checklistKey)).size;
        return { room, done: Math.min(done, total), total, photoCount: photos.length };
      }),
    );
  }, [rooms]);

  if (!propertyId) {
    navigate('/');
    return null;
  }

  const totalDone = roomStats?.reduce((s, r) => s + r.done, 0) ?? 0;
  const totalItems = roomStats?.reduce((s, r) => s + r.total, 0) ?? 0;
  const totalPhotos = roomStats?.reduce((s, r) => s + r.photoCount, 0) ?? 0;

  return (
    <PageShell
      title="Walkthrough progress"
      onBack
      footer={
        <Button disabled={totalPhotos === 0} onClick={() => navigate('/report')}>
          {totalPhotos === 0 ? 'Take some photos first' : 'Generate report'}
        </Button>
      }
    >
      <div className="mb-5">
        <ProgressBar value={totalDone} total={totalItems} />
      </div>

      <ul className="space-y-2">
        {roomStats?.map(({ room, done, total }) => (
          <li key={room.id}>
            <button
              className="w-full bg-white rounded-xl p-3 text-left flex items-center justify-between"
              onClick={() => navigate(`/checklist/${room.id}`)}
            >
              <div className="flex-1">
                <div className="font-medium text-slate-800">{room.name}</div>
                <div className="text-xs text-slate-500 mb-1">
                  {done}/{total} shots
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden w-40">
                  <div
                    className={`h-full ${done === total && total > 0 ? 'bg-green-500' : 'bg-brand-500'}`}
                    style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <span className="text-slate-300 text-xl">›</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        className="mt-4 text-brand-700 text-sm font-medium"
        onClick={() => navigate('/rooms')}
      >
        Edit rooms
      </button>
    </PageShell>
  );
}
