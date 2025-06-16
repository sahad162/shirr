import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidenav from './components/Sidenav';
import Dashboard from './Pages/Dashboard';
import Analytics from './Pages/Analytics';
import  Report from './Pages/ReportUploadPage'

export default function App() {
  return (
    <div className="flex h-screen">
      <Sidenav />

      <main className="  flex-1 ml-60 scrollbar-hide">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/report" element={<Report/>}/>

          <Route path="*" element={<h2>Page On Working</h2>} />
        </Routes>
      </main>
    </div>
  );
}
