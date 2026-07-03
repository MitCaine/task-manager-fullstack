/// <reference types="react-scripts" />

import type { NativeSQLiteSmokeResult } from './repositories/sqlite/nativeSmokeTest';

declare global {
  interface Window {
    runTaskManagerSQLiteSmokeTest?: () => Promise<NativeSQLiteSmokeResult>;
  }
}
