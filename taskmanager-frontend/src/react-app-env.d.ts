/// <reference types="react-scripts" />

import type { NativeSQLiteSmokeResult } from './repositories/sqlite';

declare global {
  interface Window {
    runTaskManagerSQLiteSmokeTest?: () => Promise<NativeSQLiteSmokeResult>;
  }
}
