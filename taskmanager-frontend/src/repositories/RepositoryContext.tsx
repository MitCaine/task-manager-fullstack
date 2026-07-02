import React, { createContext, useContext, useRef } from 'react';
import type { Repositories } from './contracts';
import { createRestRepositories } from './api';

const RepositoryContext = createContext<Repositories | null>(null);

export interface RepositoryProviderProps {
  children: React.ReactNode;
  repositories?: Repositories;
}

export function RepositoryProvider({ children, repositories }: RepositoryProviderProps) {
  const defaultRepositoriesRef = useRef<Repositories | null>(null);

  if (!repositories && !defaultRepositoriesRef.current) {
    defaultRepositoriesRef.current = createRestRepositories();
  }

  const value = repositories ?? defaultRepositoriesRef.current;

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoryContext);

  if (!repositories) {
    throw new Error('useRepositories must be used within a RepositoryProvider.');
  }

  return repositories;
}
