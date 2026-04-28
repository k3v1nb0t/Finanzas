import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoalId: string | null;
  goalName: string;
  setGoalName: (name: string) => void;
  goalTarget: string;
  setGoalTarget: (target: string) => void;
  goalCurrent: string;
  setGoalCurrent: (current: string) => void;
  goalDeadline: string;
  setGoalDeadline: (deadline: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function GoalModal({
  isOpen,
  onClose,
  editingGoalId,
  goalName,
  setGoalName,
  goalTarget,
  setGoalTarget,
  goalCurrent,
  setGoalCurrent,
  goalDeadline,
  setGoalDeadline,
  onSubmit
}: GoalModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight dark:text-text-dark">
                  {editingGoalId ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nombre de la Meta</label>
                  <input 
                    type="text" 
                    required
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-primary dark:text-white"
                    placeholder="Ej. Viaje a la playa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Monto Meta</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Q</span>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        required
                        value={goalTarget || '0.00'}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const cents = parseInt(value || '0', 10);
                          setGoalTarget((cents / 100).toFixed(2));
                        }}
                        className="w-full pl-8 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-primary font-bold dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Monto Actual</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Q</span>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        required
                        value={goalCurrent || '0.00'}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const cents = parseInt(value || '0', 10);
                          setGoalCurrent((cents / 100).toFixed(2));
                        }}
                        className="w-full pl-8 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-primary font-bold dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Fecha Límite (Opcional)</label>
                  <input 
                    type="date" 
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-primary dark:text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors"
                >
                  {editingGoalId ? 'Actualizar Meta' : 'Crear Meta'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
