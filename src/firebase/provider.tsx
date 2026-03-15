
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

interface FirebaseContextProps {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const FirebaseContext = createContext<FirebaseContextProps | undefined>(undefined);

export const FirebaseProvider = ({
  children,
  app,
  auth,
  db,
}: FirebaseContextProps & { children: ReactNode }) => {
  return (
    <FirebaseContext.Provider value={{ app, auth, db }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().db;
export const useFirebaseApp = () => useFirebase().app;
