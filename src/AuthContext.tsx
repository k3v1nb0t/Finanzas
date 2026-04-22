import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
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
  addDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile, Group } from "./types";
import { generateInviteCode } from "./lib/utils";

import { handleFirestoreError, OperationType } from "./lib/firestore-errors";

const ADMIN_EMAIL = "kevinboteo@gmail.com";

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  group: Group | null;
  groups: Group[];
  isAdmin: boolean;
  viewMode: "admin" | "personal";
  setViewMode: (mode: "admin" | "personal") => void;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<void>;
  switchGroup: (groupId: string) => Promise<void>;
  isSwitching: boolean;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleAISharing: () => Promise<void>;
  updateAISettings: (months: number) => Promise<void>;
  updateGroupName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [viewMode, setViewMode] = useState<"admin" | "personal">("admin");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const isAdmin = user?.email === ADMIN_EMAIL && user?.emailVerified;

  // Dark Mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

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
    if (!user) {
      setGroups([]);
      setGroup(null);
      return;
    }

    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const groupsList = snapshot.docs.map((doc) => doc.data() as Group);
        setGroups(groupsList);

        // Update current group if it's in the list
        const currentGroup = groupsList.find((g) => g.id === profile?.groupId);
        if (currentGroup) {
          setGroup(currentGroup);
        } else if (groupsList.length > 0 && !profile?.groupId) {
          // If no current group but we have groups, pick the first one
          switchGroup(groupsList[0].id);
        }
      },
      (error) => {
        console.error("Error fetching groups:", error);
        // Don't throw here to avoid blocking the whole app
      },
    );

    return unsubscribe;
  }, [user?.uid, profile?.groupId]);

  const fetchProfile = (firebaseUser: FirebaseUser) => {
    let unsubscribe: (() => void) | undefined;
    let retryCount = 0;
    const maxRetries = 5;

    const startListener = () => {
      const userDocRef = doc(db, "users", firebaseUser.uid);

      unsubscribe = onSnapshot(
        userDocRef,
        (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          // Handle race condition where auth state is not yet propagated to Firestore
          if (
            error.message.includes("permissions") &&
            retryCount < maxRetries
          ) {
            retryCount++;
            console.warn(
              `Profile fetch permission denied, retrying (${retryCount}/${maxRetries})...`,
            );
            setTimeout(startListener, 500 * retryCount);
            return;
          }
          setLoading(false);
          handleFirestoreError(
            error,
            OperationType.GET,
            `users/${firebaseUser.uid}`,
          );
        },
      );
    };

    startListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
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
    const groupId = doc(collection(db, "groups")).id;

    const status = user.email === ADMIN_EMAIL ? "active" : "pending";

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
      await setDoc(doc(db, "groups", groupId), newGroup);

      const currentGroupIds =
        profile?.groupIds || (profile?.groupId ? [profile.groupId] : []);
      const newGroupIds = [...new Set([...currentGroupIds, groupId])];

      const updatedProfile: Partial<UserProfile> = {
        groupId: groupId,
        groupIds: newGroupIds,
        role: user.email === ADMIN_EMAIL ? "admin" : "user",
        status: "active",
        updatedAt: serverTimestamp() as any,
      };

      if (!profile) {
        // First time user
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName,
          photoURL: user.photoURL,
          ...updatedProfile,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, "users", user.uid), updatedProfile, {
          merge: true,
        });
      }

      if (isAdmin) setViewMode("personal");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}`);
    }
  };

  const joinGroup = async (inviteCode: string) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "groups"),
        where("inviteCode", "==", inviteCode.toUpperCase()),
        limit(1),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Código de invitación inválido");
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data() as Group;

      if (!groupData.members.includes(user.uid)) {
        const updatedMembers = [...groupData.members, user.uid];
        await setDoc(
          doc(db, "groups", groupData.id),
          { ...groupData, members: updatedMembers },
          { merge: true },
        );

        // Notify owner
        const ownerDoc = await getDoc(doc(db, "users", groupData.ownerId));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data() as UserProfile;
          await addDoc(collection(db, "notifications"), {
            to: ownerData.email,
            subject: "Nuevo miembro en tu grupo",
            message: `${user.displayName || user.email} se ha unido a tu grupo "${groupData.name}"`,
            type: "group_join",
            createdAt: serverTimestamp(),
          });
        }
      }

      const currentGroupIds =
        profile?.groupIds || (profile?.groupId ? [profile.groupId] : []);
      const newGroupIds = [...new Set([...currentGroupIds, groupData.id])];

      const updatedProfile: Partial<UserProfile> = {
        groupId: groupData.id,
        groupIds: newGroupIds,
        role: user.email === ADMIN_EMAIL ? "admin" : "user",
        status: "active",
        updatedAt: serverTimestamp() as any,
      };

      if (!profile) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName,
          photoURL: user.photoURL,
          ...updatedProfile,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, "users", user.uid), updatedProfile, {
          merge: true,
        });
      }

      if (isAdmin) setViewMode("personal");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "groups/join");
    }
  };

  const switchGroup = async (groupId: string) => {
    if (!user || !profile) return;
    setIsSwitching(true);
    try {
      await setDoc(doc(db, "users", user.uid), { groupId }, { merge: true });
      // The real-time listener will update the group state,
      // but we add a small delay to ensure the UI transition feels intentional
      setTimeout(() => setIsSwitching(false), 800);
    } catch (error) {
      setIsSwitching(false);
      handleFirestoreError(error, OperationType.WRITE, "users/switch-group");
    }
  };

  const toggleAISharing = async () => {
    if (!user || !profile) return;
    try {
      const newValue = !profile.aiSharingEnabled;
      await setDoc(
        doc(db, "users", user.uid),
        { aiSharingEnabled: newValue },
        { merge: true },
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "users/toggle-ai");
    }
  };

  const updateAISettings = async (months: number) => {
    if (!user || !profile) return;
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { aiMonthsLookback: months },
        { merge: true },
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        "users/update-ai-settings",
      );
    }
  };

  const updateGroupName = async (newName: string) => {
    if (!user || !group) return;
    if (group.ownerId !== user.uid) {
      throw new Error("Solo el dueño del grupo puede cambiar su nombre");
    }
    
    try {
      await setDoc(doc(db, "groups", group.id), { name: newName }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${group.id}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
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
        switchGroup,
        isSwitching,
        isDarkMode,
        setIsDarkMode,
        toggleAISharing,
        updateAISettings,
        updateGroupName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
