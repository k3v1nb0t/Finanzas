import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 text-center">
              <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
                type === 'danger' ? 'bg-red-50 text-red-500' : 
                type === 'warning' ? 'bg-amber-50 text-amber-500' : 
                'bg-blue-50 text-blue-500'
              }`}>
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 dark:text-white">{title}</h3>
              <p className="text-sm text-gray-500 mb-8">{message}</p>
              
              <div className="space-y-3">
                <button 
                  onClick={onConfirm}
                  className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${
                    type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 
                    type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 
                    'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {confirmText}
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
