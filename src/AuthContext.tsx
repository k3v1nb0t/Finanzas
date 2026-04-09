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
  groups: Group[];
  isAdmin: boolean;
  viewMode: 'admin' | 'personal';
  setViewMode: (mode: 'admin' | 'personal') => void;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<void>;
  switchGroup: (groupId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'personal'>('admin');

  const isAdmin = user?.email === ADMIN_EMAIL && user?.emailVerified;

  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        profileUnsubscribe = await fetchProfile(firebaseUser);
      } else {
        setProfile(null);
        setGroup(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  // Real-time groups listener
  useEffect(() => {
    if (!profile?.groupIds || profile.groupIds.length === 0) {
      setGroups([]);
      return;
    }

    const q = query(collection(db, 'groups'), where('id', 'in', profile.groupIds));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsList = snapshot.docs.map(doc => doc.data() as Group);
      setGroups(groupsList);
      
      // Update current group if it's in the list
      const currentGroup = groupsList.find(g => g.id === profile.groupId);
      if (currentGroup) {
        setGroup(currentGroup);
      } else if (groupsList.length > 0 && !profile.groupId) {
        // If no current group but we have groups, pick the first one
        switchGroup(groupsList[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'groups');
    });

    return unsubscribe;
  }, [profile?.groupIds, profile?.groupId]);

  const fetchProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      
      // Listen for real-time profile changes to catch blocking immediately
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setProfile(doc.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
      setLoading(false);
    }
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
      
      const currentGroupIds = profile?.groupIds || [];
      const newGroupIds = [...new Set([...currentGroupIds, groupId])];

      const updatedProfile: Partial<UserProfile> = {
        groupId: groupId,
        groupIds: newGroupIds,
        role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
        status: 'active',
        updatedAt: serverTimestamp() as any,
      };

      if (!profile) {
        // First time user
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName,
          photoURL: user.photoURL,
          ...updatedProfile,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      }
      
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

      const currentGroupIds = profile?.groupIds || [];
      const newGroupIds = [...new Set([...currentGroupIds, groupData.id])];

      const updatedProfile: Partial<UserProfile> = {
        groupId: groupData.id,
        groupIds: newGroupIds,
        role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
        status: 'active',
        updatedAt: serverTimestamp() as any,
      };

      if (!profile) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName,
          photoURL: user.photoURL,
          ...updatedProfile,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      }
      
      if (isAdmin) setViewMode('personal');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'groups/join');
    }
  };

  const switchGroup = async (groupId: string) => {
    if (!user || !profile) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { groupId }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users/switch-group');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      group, 
      groups,
      isAdmin, 
      viewMode, 
      setViewMode, 
      loading, 
      signIn, 
      logout, 
      createGroup, 
      joinGroup,
      switchGroup
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
