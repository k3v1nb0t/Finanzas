import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { 
  LogOut, 
  LayoutDashboard, 
  Sun, 
  Moon, 
  User, 
  Check, 
  X, 
  Trash2 
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Group, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function AdminPanel() {
  const { logout, setViewMode, isDarkMode, setIsDarkMode } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => doc.data() as Group));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10)), 
      (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );
    setLoading(false);
    return () => {
      unsubGroups();
      unsubUsers();
      unsubNotifs();
    };
  }, []);

  const authorizeGroup = async (groupId: string) => {
    try {
      await setDoc(doc(db, 'groups', groupId), { status: 'active' }, { merge: true });
      toast.success('Grupo autorizado correctamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    
    setConfirmModal({
      isOpen: true,
      title: newStatus === 'blocked' ? 'Bloquear Usuario' : 'Desbloquear Usuario',
      message: `¿Estás seguro de que deseas ${newStatus === 'blocked' ? 'bloquear' : 'desbloquear'} a este usuario?`,
      isDanger: newStatus === 'blocked',
      confirmText: newStatus === 'blocked' ? 'Bloquear' : 'Desbloquear',
      onConfirm: async () => {
        try {
          await setDoc(doc(db, 'users', userId), { status: newStatus }, { merge: true });
          toast.success(`Usuario ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'} correctamente`);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
        }
      }
    });
  };

  if (loading) return null;

  const pendingGroups = groups.filter(g => g.status === 'pending');
  const activeGroups = groups.filter(g => g.status === 'active');

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary dark:text-primary-light">Panel de Administración</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Gestión global de Finanza</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <button
              onClick={() => setViewMode('personal')}
              className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-border dark:border-border-dark px-3 sm:px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
            >
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Vista Personal</span>
              <span className="sm:hidden">Volver</span>
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary-light rounded-xl shadow-sm border border-border dark:border-border-dark transition-all"
              title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={logout} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              <LogOut size={20} />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-border dark:border-border-dark">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Usuarios</p>
            <p className="text-3xl font-bold dark:text-text-dark">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-border dark:border-border-dark">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Grupos Activos</p>
            <p className="text-3xl font-bold text-income dark:text-income-dark">{activeGroups.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-border dark:border-border-dark">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Pendientes</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingGroups.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl border border-border dark:border-border-dark overflow-hidden">
          <div className="p-4 sm:p-8 border-b border-inner-border dark:border-border-dark">
            <h2 className="text-lg sm:text-xl font-bold dark:text-text-dark">Solicitudes de Autorización</h2>
          </div>
          <div className="divide-y divide-inner-border dark:divide-border-dark">
            {pendingGroups.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                No hay solicitudes pendientes
              </div>
            ) : (
              pendingGroups.map(g => {
                const owner = users.find(u => u.uid === g.ownerId);
                return (
                  <div key={g.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg truncate dark:text-text-dark">{g.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Solicitado por: {owner?.displayName || owner?.email || 'Desconocido'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">ID: {g.id}</p>
                    </div>
                    <button 
                      onClick={() => authorizeGroup(g.id)}
                      className="bg-primary dark:bg-primary-light text-white px-4 sm:px-6 py-2 rounded-xl font-bold hover:bg-primary-hover transition-colors flex-shrink-0 text-sm"
                    >
                      Autorizar
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl border border-border dark:border-border-dark overflow-hidden">
            <div className="p-4 sm:p-8 border-b border-inner-border dark:border-border-dark">
              <h2 className="text-lg sm:text-xl font-bold dark:text-text-dark">Gestión de Usuarios</h2>
            </div>
            <div className="divide-y divide-inner-border dark:divide-border-dark">
              {users.map(u => (
                <div key={u.uid} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.displayName || ''} className="w-10 h-10 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex-shrink-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <User size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold truncate dark:text-text-dark">{u.displayName || 'Usuario'}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap ${u.status === 'blocked' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'}`}>
                      {u.status === 'blocked' ? 'Bloqueado' : 'Activo'}
                    </span>
                    {u.email !== 'kevinboteo@gmail.com' && (
                      <button 
                        onClick={() => toggleUserStatus(u.uid, u.status || 'active')}
                        className={`p-2 rounded-xl transition-colors flex-shrink-0 ${u.status === 'blocked' ? 'bg-green-50 dark:bg-green-900/20 text-income dark:text-income-dark hover:bg-green-100 dark:hover:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'}`}
                        title={u.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                      >
                        {u.status === 'blocked' ? <Check size={18} /> : <X size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl border border-border dark:border-border-dark overflow-hidden">
            <div className="p-4 sm:p-8 border-b border-inner-border dark:border-border-dark">
              <h2 className="text-lg sm:text-xl font-bold dark:text-text-dark">Registro de Notificaciones</h2>
            </div>
            <div className="divide-y divide-inner-border dark:divide-border-dark">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  Sin notificaciones recientes
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] sm:text-xs font-bold uppercase text-primary dark:text-primary-light bg-inner-border dark:bg-border-dark px-2 py-0.5 rounded whitespace-nowrap">
                        {n.type === 'group_join' ? 'Unión a Grupo' : 'Notificación'}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">{n.message}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">Enviado a: {n.to}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
                  confirmModal.isDanger ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                )}>
                  {confirmModal.isDanger ? <Trash2 size={32} /> : <X size={32} />}
                </div>
                <h3 className="text-xl font-bold mb-2 dark:text-text-dark">{confirmModal.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold transition-all shadow-lg",
                      confirmModal.isDanger ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary dark:bg-primary-light text-white hover:bg-primary-hover"
                    )}
                  >
                    {confirmModal.confirmText || 'Confirmar'}
                  </button>
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
