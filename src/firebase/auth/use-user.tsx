'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';

/**
 * Hook para gestionar el estado de autenticación y el perfil de usuario en tiempo real.
 * Optimizado para velocidad mediante perfiles optimistas para administradores.
 */
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
      
      if (currentUser) {
        // Optimismo: Si es el correo de admin, pre-configuramos el rol para evitar parpadeos
        if (currentUser.email === 'admin@zyra.com' || currentUser.email?.includes('admin')) {
          setProfile(prev => prev || { 
            nombre: 'Admin', 
            rol: 'admin', 
            email: currentUser.email 
          });
        }
      } else {
        setProfile(null);
        setIsUserLoading(false);
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
        } else if (user.email?.includes('admin')) {
          setProfile({ 
            nombre: 'Administrador Principal', 
            rol: 'admin', 
            email: user.email 
          });
        }
        setIsUserLoading(false);
      }, (error) => {
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
