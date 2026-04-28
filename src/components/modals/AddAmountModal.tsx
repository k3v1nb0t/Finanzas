import { X, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavingsGoal } from '../../types';

interface AddAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGoal: SavingsGoal | null;
  amountToAddInput: string;
  setAmountToAddInput: (val: string) => void;
  shouldRecordAsTransaction: boolean;
  setShouldRecordAsTransaction: (val: boolean) => void;
  handleAddToGoal: (goalId: string, amount: number, record: boolean) => void;
}

export function AddAmountModal({
  isOpen,
  onClose,
  selectedGoal,
  amountToAddInput,
  setAmountToAddInput,
  shouldRecordAsTransaction,
  setShouldRecordAsTransaction,
  handleAddToGoal
}: AddAmountModalProps) {
  return (
    <AnimatePresence>
      {isOpen && selectedGoal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold dark:text-text-dark">Agregar Ahorro</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Meta: <span className="font-bold text-gray-900 dark:text-white">{selectedGoal.name}</span></p>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Monto a agregar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Q</span>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={amountToAddInput || '0.00'}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const cents = parseInt(value || '0', 10);
                        setAmountToAddInput((cents / 100).toFixed(2));
                      }}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xl font-black focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
                        <History size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold dark:text-text-dark">¿Registrar en historial?</p>
                        <p className="text-[10px] text-gray-500">Afectará tu presupuesto mensual disponible.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShouldRecordAsTransaction(!shouldRecordAsTransaction)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${shouldRecordAsTransaction ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${shouldRecordAsTransaction ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={onClose}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    No
                  </button>
                  <button 
                    onClick={() => handleAddToGoal(selectedGoal.id, parseFloat(amountToAddInput), shouldRecordAsTransaction)}
                    disabled={!amountToAddInput || parseFloat(amountToAddInput) <= 0}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    Sí, Agregar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
