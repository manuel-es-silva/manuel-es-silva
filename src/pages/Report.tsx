import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { Disclaimer } from '../components/Disclaimer';
import { db } from '../db/db';
import {
  buildRoomComparisons,
  confirmReportSent,
  getReportShare,
  photosForRoom,
  recordReportShared,
} from '../db/queries';
import { getActivePropertyId } from '../lib/activeProperty';
import { parsePhase } from '../lib/phase';
import { downloadBlob, sharePdf } from '../lib/share';
import type { Photo, Room } from '../types';

export function Report() {
  const navigate = useNavigate();
  const { phase: phaseParam } = useParams<{ phase: string }>();
  const phase = parsePhase(phaseParam);
  const propertyId = getActivePropertyId();

  const property = useLiveQuery(() => (propertyId ? db.properties.get(propertyId) : undefined), [propertyId]);
  const rooms = useLiveQuery(
    () => (propertyId ? db.rooms.where('propertyId').equals(propertyId).sortBy('sortOrder') : []),
    [propertyId],
  );
  const share = useLiveQuery(() => (propertyId ? getReportShare(propertyId, phase) : undefined), [propertyId, phase]);

  const [status, setStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!property || !rooms || !propertyId) return;
    let cancelled = false;
    setStatus('generating');
    (async () => {
      try {
        let blob: Blob;
        if (phase === 'move-out') {
          const { generateMoveOutReport } = await import('../lib/pdf/moveOutReport');
          const roomComparisons = await buildRoomComparisons(propertyId);
          blob = await generateMoveOutReport(property, roomComparisons.filter((r) => r.pairs.length > 0));
        } else {
          const roomsWithPhotos: { room: Room; photos: Photo[] }[] = await Promise.all(
            rooms.map(async (room) => ({ room, photos: await photosForRoom(room.id, 'move-in') })),
          );
          const { generateMoveInReport } = await import('../lib/pdf/moveInReport');
          blob = await generateMoveInReport(property, roomsWithPhotos.filter((r) => r.photos.length > 0));
        }
        if (cancelled) return;
        setPdfBlob(blob);
        setPdfUrl(URL.createObjectURL(blob));
        setStatus('ready');
      } catch (err) {
        console.error('Failed to generate report', err);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [property, rooms, propertyId, phase]);

  if (!propertyId) {
    navigate('/');
    return null;
  }

  const reportName = phase === 'move-out' ? 'move-out-comparison-report' : 'move-in-report';
  const shareTitle = phase === 'move-out' ? 'Move-out comparison report' : 'Move-in report';

  async function handleShare() {
    if (!pdfBlob || !property) return;
    const filename = `${property.address.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}-${reportName}.pdf`;
    await sharePdf(pdfBlob, filename, shareTitle);
    await recordReportShared(property.id, phase);
  }

  function handleDownload() {
    if (!pdfBlob || !property) return;
    const filename = `${property.address.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}-${reportName}.pdf`;
    downloadBlob(pdfBlob, filename);
    recordReportShared(property.id, phase);
  }

  async function handleConfirmSent(sent: boolean) {
    if (!property) return;
    if (sent) {
      await confirmReportSent(property.id, phase);
    }
  }

  return (
    <PageShell title={shareTitle} onBack>
      {status === 'generating' && <p className="text-slate-600">Building your report…</p>}
      {status === 'error' && (
        <p className="text-red-600">Something went wrong generating the PDF. Try again.</p>
      )}

      {status === 'ready' && pdfUrl && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white" style={{ height: '55vh' }}>
            <iframe title="Report preview" src={pdfUrl} className="w-full h-full" />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleShare}>Share / email to landlord</Button>
            <Button variant="secondary" className="w-auto px-4" onClick={handleDownload}>
              Download
            </Button>
          </div>

          {share?.sharedAt && !share?.confirmedSentAt && (
            <div className="bg-white rounded-xl p-4 border border-brand-200">
              <p className="text-slate-800 mb-3">Did you send this report to your landlord?</p>
              <div className="flex gap-2">
                <Button variant="secondary" className="w-auto px-4" onClick={() => handleConfirmSent(false)}>
                  Not yet
                </Button>
                <Button className="w-auto px-4" onClick={() => handleConfirmSent(true)}>
                  Yes, sent it
                </Button>
              </div>
            </div>
          )}

          {share?.confirmedSentAt && (
            <p className="text-green-700 text-sm">
              Sent to your landlord on {new Date(share.confirmedSentAt).toLocaleString()}.
            </p>
          )}

          <Disclaimer compact />
        </div>
      )}
    </PageShell>
  );
}
