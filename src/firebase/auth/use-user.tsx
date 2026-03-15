'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  
  // Perfil inicial cargado desde localStorage o default
  const [profile, setProfile] = useState<any | null>(null);

  // Efecto para inicializar el perfil de demo solo en el cliente
  useEffect(() => {
    const savedRole = localStorage.getItem('zyra-demo-role') || 'employee';
    const initialProfile = savedRole === 'admin' 
      ? {
          nombre: "Administrador Zyra",
          rol: "admin",
          puntos: 5000,
          nivel: 25,
          racha: 45
        }
      : {
          nombre: "Operador Zyra",
          rol: "employee",
          nivel: 5,
          puntos: 1250,
          racha: 7,
          logros: [
            { id: "1", nombre: "Pionero", completado: true },
            { id: "2", nombre: "Reporte Maestro", completado: true },
            { id: "3", nombre: "Racha 30 Días", completado: false },
            { id: "4", nombre: "Experto en Inversores", completado: false },
          ]
        };
    setProfile(initialProfile);
  }, []);

  const toggleRole = () => {
    const currentRole = profile?.rol || 'employee';
    const newRole = currentRole === 'admin' ? 'employee' : 'admin';
    
    // Guardar en localStorage para persistencia en demo
    localStorage.setItem('zyra-demo-role', newRole);
    
    // Si hay un usuario real, intentar sincronizar Firestore
    if (user && db) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { rol: newRole }).catch(err => {
        console.warn("No se pudo actualizar el rol en Firestore:", err);
      });
    }

    // Recarga necesaria para re-inicializar el estado de la app con el nuevo rol
    window.location.reload();
  };

  useEffect(() => {
    if (!auth) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsUserLoading(false);
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
      }, (error) => {
        console.error("Error cargando perfil:", error);
      });
      return () => unsubscribeDoc();
    }
  }, [user, db]);

  return { 
    user, 
    profile, 
    loading: isUserLoading, 
    isUserLoading, 
    userError, 
    toggleRole 
  };
}
