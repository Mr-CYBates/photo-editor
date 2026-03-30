import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Editor from './pages/Editor';
import Pricing from './pages/Pricing';
import AuthCallback from './pages/AuthCallback';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  );
}
