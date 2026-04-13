import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupAction: 'create' | 'join';
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  joinInviteCode: string;
  setJoinInviteCode: (code: string) => void;
  isGroupActionLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function GroupModal({
  isOpen,
  onClose,
  groupAction,
  newGroupName,
  setNewGroupName,
  joinInviteCode,
  setJoinInviteCode,
  isGroupActionLoading,
  onSubmit
}: GroupModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold dark:text-white">
                  {groupAction === 'create' ? 'Crear Nuevo Grupo' : 'Unirse a un Grupo'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-6">
                {groupAction === 'create' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre del Grupo</label>
                    <input 
                      type="text" 
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Ej. Familia Pérez"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Código de Invitación</label>
                    <input 
                      type="text" 
                      required
                      value={joinInviteCode}
                      onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC-123"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isGroupActionLoading}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
                >
                  {isGroupActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {groupAction === 'create' ? 'Crear Grupo' : 'Unirse'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
