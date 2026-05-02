import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider, appleProvider, handleFirestoreError, OperationType } from '../lib/firebase';

export type UserRole = 'PLAYER' | 'OWNER' | 'ADMIN' | 'STAFF';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  facilityId?: string;
  businessName?: string;
  businessAddress?: string;
  verificationDocUrl?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  createdAt: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role: UserRole, extra?: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        let retries = 3;
        while (retries > 0) {
          try {
            console.log("AuthProvider: Attempting to fetch profile for UID:", user.uid);
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              console.log("AuthProvider: Profile found in Firestore");
              setProfile(docSnap.data() as UserProfile);
            } else {
              console.log("AuthProvider: Profile NOT found. Checking for pre-invites via email:", user.email);
              if (user.email) {
                // Check if user was pre-invited by email (e.g. Staff)
                const emailQ = query(collection(db, 'users'), where('email', '==', user.email));
                const emailSnap = await getDocs(emailQ);
                
                if (!emailSnap.empty) {
                  console.log("AuthProvider: Pre-invite found. Upgrading to full profile.");
                  const existingData = emailSnap.docs[0].data();
                  const updatedProfile = {
                    ...existingData,
                    uid: user.uid,
                    name: user.displayName || existingData.name || 'Staff Member'
                  } as UserProfile;
                  
                  await setDoc(docRef, updatedProfile);
                  setProfile(updatedProfile);
                } else {
                  console.log("AuthProvider: No pre-invite. Creating default PLAYER profile.");
                  // New user - default to PLAYER
                  const newProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email || '',
                    name: user.displayName || 'Guest User',
                    role: 'PLAYER',
                    createdAt: serverTimestamp(),
                  };
                  await setDoc(docRef, newProfile);
                  setProfile(newProfile);
                }
              } else {
                console.log("AuthProvider: No user email available. Creating default PLAYER profile.");
                const newProfile: UserProfile = {
                  uid: user.uid,
                  email: '',
                  name: user.displayName || 'Guest User',
                  role: 'PLAYER',
                  createdAt: serverTimestamp(),
                };
                await setDoc(docRef, newProfile);
                setProfile(newProfile);
              }
            }

            // Sync dummy user if needed (Only for admin)
            if (user.email === 'miguel@builtbymiguel.net') {
              const dummyDoc = doc(db, 'users', 'dummy-user-1');
              const dummySnap = await getDoc(dummyDoc);
              if (!dummySnap.exists()) {
                await setDoc(dummyDoc, {
                  uid: 'dummy-user-1',
                  email: 'umbacmi@gmail.com',
                  name: 'UMBAC MI',
                  role: 'PLAYER',
                  createdAt: serverTimestamp()
                });
              }
            }

            break; // Success, exit retry loop
          } catch (error) {
            console.error(`Error fetching/creating profile (attempts left: ${retries - 1}):`, error);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            }
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.warn("Login popup was closed before completion.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Login request cancelled due to a newer request.");
      } else {
        console.error("Login Error:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithApple = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithPopup(auth, appleProvider);
    } catch (error: any) {
      console.error("Apple Login Error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role: UserRole, extra?: Partial<UserProfile>) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    
    // Explicitly create profile
    const docRef = doc(db, 'users', cred.user.uid);
    const newProfile: any = {
      uid: cred.user.uid,
      email: email,
      name: name,
      role: role,
      createdAt: serverTimestamp(),
      ...extra
    };

    if (role === 'OWNER') {
      newProfile.verificationStatus = 'pending';
    }

    await setDoc(docRef, newProfile);
    setProfile(newProfile as UserProfile);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithApple, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
