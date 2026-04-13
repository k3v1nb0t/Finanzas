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
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-black flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#5A5A40] dark:hover:text-[#8B8B6B] rounded-xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 transition-all"
          title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-xl border border-[#E4E3E0] dark:border-gray-800 text-center"
      >
        <div className="w-16 h-16 bg-[#5A5A40] dark:bg-[#8B8B6B] rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
          <Wallet size={32} />
        </div>
        
        <AnimatePresence mode="wait">
          {step === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-3xl font-bold mb-2 dark:text-white">Bienvenido a Finanza</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Toma el control de tu presupuesto personal y familiar de forma sencilla.</p>
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
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-[#E4E3E0] dark:border-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
              >
                {isActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#5A5A40] dark:text-[#8B8B6B]" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                )}
                {isActionLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
              </button>
            </motion.div>
          )}

          {step === 'choice' && (
            <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Casi listo</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">¿Cómo quieres empezar a gestionar tu presupuesto?</p>
              <div className="space-y-4">
                <button 
                  onClick={() => setStep('create')}
                  className="w-full bg-[#5A5A40] dark:bg-[#8B8B6B] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4A4A30] transition-colors"
                >
                  Crear nuevo grupo
                </button>
                <button 
                  onClick={() => setStep('join')}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E4E3E0] dark:border-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white"
                >
                  Unirse a un grupo existente
                </button>
              </div>
            </motion.div>
          )}

          {step === 'create' && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Crear Grupo</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Dale un nombre a tu presupuesto familiar o personal.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <input 
                  type="text" 
                  required
                  disabled={isActionLoading}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej. Familia Pérez o Mi Presupuesto"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50 dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full bg-[#5A5A40] dark:bg-[#8B8B6B] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isActionLoading ? 'Creando...' : 'Comenzar'}
                </button>
                <button type="button" onClick={() => setStep('choice')} disabled={isActionLoading} className="text-sm text-gray-400 font-medium disabled:opacity-50">Volver</button>
              </form>
            </motion.div>
          )}

          {step === 'join' && (
            <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Unirse a Grupo</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Ingresa el código que te compartieron.</p>
              <form onSubmit={handleJoin} className="space-y-4">
                <input 
                  type="text" 
                  required
                  disabled={isActionLoading}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 text-center text-2xl font-mono font-bold focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50 dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full bg-[#5A5A40] dark:bg-[#8B8B6B] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isActionLoading ? 'Uniéndose...' : 'Unirse ahora'}
                </button>
                <button type="button" onClick={() => setStep('choice')} disabled={isActionLoading} className="text-sm text-gray-400 font-medium disabled:opacity-50">Volver</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
