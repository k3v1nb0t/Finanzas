import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Toaster } from 'sonner';
import { Wallet, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './components/Dashboard';
import { Landing } from './components/Landing';
import { AdminPanel } from './components/AdminPanel';
import { BlockedScreen } from './components/BlockedScreen';
import { PendingAuthorization } from './components/PendingAuthorization';

function AppContent() {
  const { user, profile, group, isAdmin, viewMode, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg dark:bg-bg-dark flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col items-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="w-20 h-20 bg-primary dark:bg-primary-light rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-primary/30 dark:shadow-black/30 mb-6"
          >
            <Wallet size={40} />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tighter text-text dark:text-text-dark mb-1">Finanza</h1>
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-primary dark:text-primary-light" />
            <p className="text-[10px] font-bold text-primary dark:text-primary-light uppercase tracking-[0.2em]">Cargando...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  if (isAdmin && viewMode === 'admin') {
    return <AdminPanel />;
  }

  if (!profile) {
    return <Landing />;
  }

  if (profile.status === 'blocked') {
    return <BlockedScreen />;
  }

  if (group?.status === 'pending') {
    return <PendingAuthorization />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </ErrorBoundary>
  );
}
