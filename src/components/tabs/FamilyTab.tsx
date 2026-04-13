import { Users, Plus, User, Trash2, ArrowUpRight, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Group, UserProfile } from '../../types';
import { cn } from '../../lib/utils';

interface FamilyTabProps {
  group: Group | null;
  groups: Group[];
  user: any;
  memberProfiles: Record<string, UserProfile>;
  setGroupAction: (action: 'create' | 'join') => void;
  setIsGroupModalOpen: (open: boolean) => void;
  handleRemoveMember: (memberId: string) => void;
  handleDeleteGroup: () => void;
  switchGroup: (groupId: string) => void;
  profile: UserProfile | null;
}

export function FamilyTab({
  group,
  groups,
  user,
  memberProfiles,
  setGroupAction,
  setIsGroupModalOpen,
  handleRemoveMember,
  handleDeleteGroup,
  switchGroup,
  profile
}: FamilyTabProps) {
  return (
    <motion.div 
      key="group"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">{group?.name}</h2>
            <p className="text-gray-500 dark:text-gray-400">Gestiona los miembros de tu familia o grupo.</p>
          </div>
          <div className="bg-[#5A5A40]/10 dark:bg-[#8B8B6B]/10 text-[#5A5A40] dark:text-[#8B8B6B] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {group?.ownerId === user?.uid ? 'Propietario' : 'Miembro'}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="w-full sm:w-auto flex items-center gap-3 p-4 bg-[#F5F5F0] dark:bg-gray-800 rounded-2xl border border-[#E4E3E0] dark:border-gray-700">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] dark:text-[#8B8B6B]">Código de Invitación</p>
              <p className="text-xl font-mono font-bold dark:text-white">{group?.inviteCode}</p>
            </div>
            <button 
              onClick={() => {
                const shareUrl = `${window.location.origin}${window.location.pathname}?join=${group?.inviteCode}`;
                const message = `¡Hola! Únete a mi grupo "${group?.name}" en Finanza para gestionar nuestros gastos juntos.\n\nCódigo: ${group?.inviteCode}\n\nÚnete aquí: ${shareUrl}`;
                navigator.clipboard.writeText(message);
                toast.success('Invitación copiada');
              }}
              className="ml-auto p-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
            >
              <Share2 size={18} />
            </button>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => {
                setGroupAction('create');
                setIsGroupModalOpen(true);
              }}
              className="flex-1 sm:flex-none bg-[#5A5A40] dark:bg-[#8B8B6B] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-[#4A4A30] dark:hover:bg-[#7A7A5B] transition-colors"
            >
              Nuevo Grupo
            </button>
            <button 
              onClick={() => {
                setGroupAction('join');
                setIsGroupModalOpen(true);
              }}
              className="flex-1 sm:flex-none bg-white dark:bg-gray-900 text-[#5A5A40] dark:text-[#8B8B6B] border border-[#E4E3E0] dark:border-gray-800 px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Unirse a Grupo
            </button>
          </div>
        </div>

        <h3 className="font-semibold mb-4 dark:text-white">Miembros ({group?.members.length})</h3>
        <div className="space-y-4">
          {group?.members.map((memberId) => {
            const memberProfile = memberProfiles[memberId];
            const displayName = memberProfile?.displayName || memberProfile?.email || 'Miembro';
            
            return (
              <div key={memberId} className="flex items-center gap-3">
                {memberProfile?.photoURL ? (
                  <img 
                    src={memberProfile.photoURL} 
                    alt={displayName} 
                    className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate dark:text-white">
                    {memberId === user?.uid ? `${displayName} (Tú)` : displayName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{memberId === group.ownerId ? 'Propietario' : 'Colaborador'}</p>
                </div>
                {group.ownerId === user?.uid && memberId !== user?.uid && (
                  <button 
                    onClick={() => handleRemoveMember(memberId)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    title="Eliminar miembro"
                  >
                    <User size={18} className="text-red-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {group?.ownerId === user?.uid && (
          <div className="mt-12 pt-8 border-t border-red-50 dark:border-red-900/20">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4">Zona de Peligro</h4>
            <button 
              onClick={handleDeleteGroup}
              className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={20} />
              Eliminar este Grupo Permanentemente
            </button>
          </div>
        )}
      </div>

      {groups.length > 1 && (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
          <h3 className="text-lg font-bold mb-4 dark:text-white">Mis Otros Presupuestos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.filter(g => g.id !== profile?.groupId).map(g => (
              <button
                key={g.id}
                onClick={() => switchGroup(g.id)}
                className="flex items-center justify-between p-4 rounded-2xl border border-[#E4E3E0] dark:border-gray-800 hover:border-[#5A5A40] dark:hover:border-[#8B8B6B] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-[#5A5A40] dark:text-[#8B8B6B]">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm dark:text-white">{g.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      {g.ownerId === user?.uid ? 'Propietario' : 'Miembro'}
                    </p>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-gray-300 dark:text-gray-600" />
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
