import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { LogOut, Sun, Moon, Loader2 } from 'lucide-react';

export function PendingAuthorization() {
  const { logout, group, isDarkMode, setIsDarkMode } = useAuth();
  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark flex flex-col items-center justify-center p-4 text-center transition-colors duration-300 relative">
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
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-8">
          <Loader2 size={40} className="animate-spin" />
        </div>
        <h1 className="text-3xl font-bold mb-4 dark:text-text-dark">Esperando Autorización</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2">Tu grupo <span className="font-bold text-primary dark:text-primary-light">"{group?.name}"</span> ha sido creado con éxito.</p>
        <p className="text-gray-500 dark:text-gray-400 mb-8">El administrador debe autorizar tu solicitud antes de que puedas comenzar a registrar transacciones. Se te notificará automáticamente.</p>
        
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-800 dark:text-amber-400 text-sm font-medium">
            Estado: Pendiente de revisión
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </motion.div>
    </div>
  );
}
