import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AlabForm } from "./AlabForm";
import { AdminPanel } from "./AdminPanel";
import { AdminLogin } from "./AdminLogin";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AlabForm />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/panel" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}
