import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Group } from './types';
import { generateInviteCode } from './lib/utils';

import { handleFirestoreError, OperationType } from './lib/firestore-errors';

const ADMIN_EMAIL = 'kevinboteo@gmail.com';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  group: Group | null;
  isAdmin: boolean;
  viewMode: 'admin' | 'personal';
  setViewMode: (mode: 'admin' | 'personal') => void;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'personal'>('admin');

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setProfile(null);
        setGroup(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Real-time group listener
  useEffect(() => {
    if (!profile?.groupId) {
      setGroup(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'groups', profile.groupId), (doc) => {
      if (doc.exists()) {
        setGroup(doc.data() as Group);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `groups/${profile.groupId}`);
    });

    return unsubscribe;
  }, [profile?.groupId]);

  const fetchProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        setProfile(profileData);
      } else if (firebaseUser.email === ADMIN_EMAIL) {
        setProfile(null);
      } else {
        setProfile(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    }
    setLoading(false);
  };

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      await fetchProfile(firebaseUser);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const createGroup = async (name: string) => {
    if (!user) return;
    const groupId = doc(collection(db, 'groups')).id;
    
    // Admin creates active groups, others create pending
    const status = user.email === ADMIN_EMAIL ? 'active' : 'pending';

    const newGroup: Group = {
      id: groupId,
      name,
      ownerId: user.uid,
      members: [user.uid],
      inviteCode: generateInviteCode(),
      status,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'groups', groupId), newGroup);
      
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName,
        photoURL: user.photoURL,
        groupId: groupId,
        role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
      if (isAdmin) setViewMode('personal');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}`);
    }
  };

  const joinGroup = async (inviteCode: string) => {
    if (!user) return;
    try {
      const q = query(collection(db, 'groups'), where('inviteCode', '==', inviteCode.toUpperCase()), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error("Código de invitación inválido");
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data() as Group;
      
      if (!groupData.members.includes(user.uid)) {
        const updatedMembers = [...groupData.members, user.uid];
        await setDoc(doc(db, 'groups', groupData.id), { ...groupData, members: updatedMembers }, { merge: true });
        
        // Notify owner
        const ownerDoc = await getDoc(doc(db, 'users', groupData.ownerId));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data() as UserProfile;
          await addDoc(collection(db, 'notifications'), {
            to: ownerData.email,
            subject: 'Nuevo miembro en tu grupo',
            message: `${user.displayName || user.email} se ha unido a tu grupo "${groupData.name}"`,
            type: 'group_join',
            createdAt: serverTimestamp(),
          });
        }
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName,
        photoURL: user.photoURL,
        groupId: groupData.id,
        role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
      if (isAdmin) setViewMode('personal');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'groups/join');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      group, 
      isAdmin, 
      viewMode, 
      setViewMode, 
      loading, 
      signIn, 
      logout, 
      createGroup, 
      joinGroup 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
