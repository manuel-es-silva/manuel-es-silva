import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Onboarding } from './pages/Onboarding';
import { RoomSetup } from './pages/RoomSetup';
import { RoomChecklist } from './pages/RoomChecklist';
import { Progress } from './pages/Progress';
import { Report } from './pages/Report';
import { MoveOutStart } from './pages/MoveOutStart';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/rooms" element={<RoomSetup />} />
        <Route path="/move-out/start" element={<MoveOutStart />} />
        <Route path="/checklist/:phase/:roomId" element={<RoomChecklist />} />
        <Route path="/progress/:phase" element={<Progress />} />
        <Route path="/report/:phase" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
