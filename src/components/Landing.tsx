import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Sun, Moon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Landing() {
  const { signIn, user, profile, loading, createGroup, joinGroup, isDarkMode, setIsDarkMode } = useAuth();
  const [step, setStep] = useState<'login' | 'choice' | 'create' | 'join'>('login');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (profile) {
        // User has a profile, AppContent will handle redirect to Dashboard
      } else {
        setStep('choice');
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const joinCode = urlParams.get('join');
      if (joinCode && user) {
        setStep('join');
        setInviteCode(joinCode);
      }
    }
  }, [loading, profile, user]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await createGroup(groupName);
    } catch (error) {
      toast.error('Error al crear grupo');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await joinGroup(inviteCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al unirse');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-10 h-10 flex items-center justify-center bg-surface dark:bg-surface-dark text-text-muted dark:text-text-muted-dark hover:text-primary dark:hover:text-primary-light rounded-xl shadow-sm border border-border dark:border-border-dark transition-all duration-200"
          title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md bg-surface dark:bg-surface-dark p-8 rounded-[40px] shadow-xl shadow-primary/5 dark:shadow-black/20 border border-border dark:border-border-dark text-center"
      >
        <div className="w-16 h-16 bg-primary dark:bg-primary-light rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-primary/20">
          <Wallet size={32} />
        </div>
        
        <AnimatePresence mode="wait">
          {step === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
              <h1 className="text-3xl font-bold mb-2 text-text dark:text-text-dark">Bienvenido a Finanza</h1>
              <p className="text-text-muted dark:text-text-muted-dark mb-8">Toma el control de tu presupuesto personal y familiar de forma sencilla.</p>
              <button 
                disabled={isActionLoading}
                onClick={async () => {
                  setIsActionLoading(true);
                  try {
                    await signIn();
                  } catch (error) {
                    toast.error('Error al iniciar sesión');
                  } finally {
                    setIsActionLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-text dark:text-text-dark"
              >
                {isActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary dark:text-primary-light" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                )}
                {isActionLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
              </button>
            </motion.div>
          )}

          {step === 'choice' && (
            <motion.div key="choice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
              <h2 className="text-2xl font-bold mb-2 dark:text-text-dark">Casi listo</h2>
              <p className="text-text-muted dark:text-text-muted-dark mb-8">¿Cómo quieres empezar a gestionar tu presupuesto?</p>
              <div className="space-y-4">
                <button
                  onClick={() => setStep('create')}
                  className="w-full bg-primary dark:bg-primary-light text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover dark:hover:bg-primary-light-hover transition-colors"
                >
                  Crear nuevo grupo
                </button>
                <button
                  onClick={() => setStep('join')}
                  className="w-full bg-white dark:bg-gray-800 border border-border dark:border-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-text dark:text-text-dark"
                >
                  Unirse a un grupo existente
                </button>
              </div>
            </motion.div>
          )}

          {step === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
              <h2 className="text-2xl font-bold mb-2 dark:text-text-dark">Crear Grupo</h2>
              <p className="text-text-muted dark:text-text-muted-dark mb-8">Dale un nombre a tu presupuesto familiar o personal.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <input 
                  type="text" 
                  required
                  disabled={isActionLoading}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej. Familia Pérez o Mi Presupuesto"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-primary disabled:opacity-50 text-text dark:text-text-dark"
                />
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full bg-primary dark:bg-primary-light text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isActionLoading ? 'Creando...' : 'Comenzar'}
                </button>
                <button type="button" onClick={() => setStep('choice')} disabled={isActionLoading} className="text-sm text-text-muted dark:text-text-muted-dark font-medium disabled:opacity-50">Volver</button>
              </form>
            </motion.div>
          )}

          {step === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
              <h2 className="text-2xl font-bold mb-2 dark:text-text-dark">Unirse a Grupo</h2>
              <p className="text-text-muted dark:text-text-muted-dark mb-8">Ingresa el código que te compartieron.</p>
              <form onSubmit={handleJoin} className="space-y-4">
                <input 
                  type="text" 
                  required
                  disabled={isActionLoading}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 text-center text-2xl font-mono font-bold focus:ring-2 focus:ring-primary disabled:opacity-50 dark:text-text-dark"
                />
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full bg-primary dark:bg-primary-light text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isActionLoading ? 'Uniéndose...' : 'Unirse ahora'}
                </button>
                <button type="button" onClick={() => setStep('choice')} disabled={isActionLoading} className="text-sm text-text-muted dark:text-text-muted-dark font-medium disabled:opacity-50">Volver</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
