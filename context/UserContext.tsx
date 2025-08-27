'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ContextProps = {
  // userId: string | null;
  // setUserId: (id: string | null) => void;
  // groupId: number | null;
  // setGroupId: (id: number | null) => void;
};

const UserContext = createContext<ContextProps | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // const [userId, setUserId] = useState<string | null>(null);
  // const [groupId, setGroupId] = useState<number | null>(null);

  return (
    <UserContext.Provider value={{}}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): ContextProps {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
