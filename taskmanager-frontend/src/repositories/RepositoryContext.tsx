import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Repositories } from './contracts';
import {
  createDefaultRuntimeRepositoriesSyncIfReady,
  createRuntimeRepositories,
  type RepositoryRuntimeOptions,
  type RepositoryRuntimeSelection,
} from './runtimeRepositories';

const RepositoryContext = createContext<Repositories | null>(null);

export interface RepositoryProviderProps {
  children: React.ReactNode;
  repositories?: Repositories;
  runtimeOptions?: RepositoryRuntimeOptions;
}

type RuntimeState =
  | { status: 'pending' }
  | { status: 'ready'; selection: RepositoryRuntimeSelection }
  | { status: 'error'; error: unknown };

export function RepositoryProvider({ children, repositories, runtimeOptions }: RepositoryProviderProps) {
  const initialRuntimeStateRef = useRef<RuntimeState | null>(null);
  if (!initialRuntimeStateRef.current) {
    if (repositories || runtimeOptions) {
      initialRuntimeStateRef.current = { status: 'pending' };
    } else {
      const readySelection = createDefaultRuntimeRepositoriesSyncIfReady();
      initialRuntimeStateRef.current = readySelection
        ? { status: 'ready', selection: readySelection }
        : { status: 'pending' };
    }
  }

  const [runtimeState, setRuntimeState] = useState<RuntimeState>(initialRuntimeStateRef.current);
  const runtimePromiseRef = useRef<Promise<RepositoryRuntimeSelection> | null>(null);
  const ownedSelectionRef = useRef<RepositoryRuntimeSelection | null>(
    initialRuntimeStateRef.current.status === 'ready'
      ? initialRuntimeStateRef.current.selection
      : null,
  );
  const closedSelectionsRef = useRef(new Set<RepositoryRuntimeSelection>());

  const closeSelectionOnce = (selection: RepositoryRuntimeSelection) => {
    if (closedSelectionsRef.current.has(selection)) return;
    closedSelectionsRef.current.add(selection);
    void selection.close();
  };

  useEffect(() => {
    if (repositories) return;
    if (runtimeState.status === 'ready') return;

    let active = true;
    if (!runtimePromiseRef.current) {
      runtimePromiseRef.current = runtimeOptions
        ? createRuntimeRepositories(runtimeOptions)
        : createRuntimeRepositories();
    }

    runtimePromiseRef.current.then(
      selection => {
        if (!active) {
          closeSelectionOnce(selection);
          return;
        }

        ownedSelectionRef.current = selection;
        setRuntimeState({ status: 'ready', selection });
      },
      error => {
        if (active) setRuntimeState({ status: 'error', error });
      },
    );

    return () => {
      active = false;
    };
  }, [repositories, runtimeOptions, runtimeState.status]);

  useEffect(() => {
    return () => {
      const selection = ownedSelectionRef.current;
      if (selection) closeSelectionOnce(selection);
    };
  }, []);

  if (repositories) {
    return (
      <RepositoryContext.Provider value={repositories}>
        {children}
      </RepositoryContext.Provider>
    );
  }

  if (runtimeState.status === 'error') {
    throw runtimeState.error;
  }

  if (runtimeState.status !== 'ready') return null;

  return (
    <RepositoryContext.Provider value={runtimeState.selection.repositories}>
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
