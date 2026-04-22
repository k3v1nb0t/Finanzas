import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { LogOut, Sun, Moon, X } from 'lucide-react';

export function BlockedScreen() {
  const { logout, isDarkMode, setIsDarkMode } = useAuth();
  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark flex flex-col items-center justify-center p-4 text-center relative transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary-light rounded-xl shadow-sm border border-border dark:border-border-dark transition-all"
          title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 p-6 sm:p-10 rounded-[40px] shadow-xl border border-border dark:border-border-dark"
      >
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-8">
          <X size={40} />
        </div>
        <h1 className="text-3xl font-bold mb-4 dark:text-text-dark">Cuenta Bloqueada</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Lo sentimos, tu acceso a Finanza ha sido restringido por incumplimiento de nuestras normas de uso.</p>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-800 dark:text-red-400 text-sm font-medium">
            Estado: Acceso denegado
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 font-medium transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </motion.div>
    </div>
  );
}
