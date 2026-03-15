'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    if (!auth) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsUserLoading(false);
        setProfile(null);
      }
    }, (error) => {
      setUserError(error);
      setIsUserLoading(false);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (user && db) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
        setIsUserLoading(false);
      }, (error) => {
        console.error("Error cargando perfil:", error);
        setIsUserLoading(false);
      });
      return () => unsubscribeDoc();
    }
  }, [user, db]);

  return { 
    user, 
    profile, 
    loading: isUserLoading, 
    isUserLoading, 
    userError
  };
}
