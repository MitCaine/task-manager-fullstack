import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import {
  RepositoryInitializationErrorBoundary,
  RepositoryProvider,
  resetLegacyIdMappingsForTests,
} from './repositories';
import {
  createSQLiteRepositories,
  SQLiteDatabaseService,
} from './repositories/sqlite';
import { SqlJsTestDriver } from './repositories/sqlite/testing/SqlJsTestDriver';

jest.mock('./components/Calendar', () => () => (
  <div className="cal-card">
    <button type="button" className="cal-today-btn">Today</button>
    <div data-testid="calendar-background">Calendar background</div>
  </div>
));

function createSqliteService(): SQLiteDatabaseService {
  return new SQLiteDatabaseService({ driver: new SqlJsTestDriver() });
}

function renderAppWithService(service: SQLiteDatabaseService) {
  return render(
    <RepositoryInitializationErrorBoundary>
      <RepositoryProvider runtimeOptions={{
        env: { REACT_APP_ENABLE_SQLITE_PERSISTENCE: 'true' },
        getPlatform: () => 'ios',
        isNativePlatform: () => true,
        createSQLiteService: () => service,
        createSQLiteRepositories,
      }}>
        <App />
      </RepositoryProvider>
    </RepositoryInitializationErrorBoundary>
  );
}

describe('App SQLite runtime activation', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = jest.fn();
    resetLegacyIdMappingsForTests();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('starts through RepositoryProvider against an empty SQL.js SQLite database', async () => {
    const service = createSqliteService();
    const view = renderAppWithService(service);

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert', { name: /persistence initialization failed/i })).not.toBeInTheDocument();

    view.unmount();
  });

  it('loads UUID-backed SQLite project, tag, and task data through the App boundary', async () => {
    const service = createSqliteService();
    await service.initialize();
    const repositories = createSQLiteRepositories(service);

    const project = await repositories.projects.create({ title: 'Native Project' });
    const tag = await repositories.tags.create({ title: 'Native Tag', color: '#22c55e' });
    const task = await repositories.tasks.create({
      title: 'Native SQLite Task',
      description: 'Loaded from SQLite',
      projectId: project.id,
    });
    await repositories.tasks.addTag(task.id, tag.id);
    await repositories.tasks.updateStatus(task.id, 'in_progress');

    const { rerender, unmount } = render(
      <RepositoryInitializationErrorBoundary>
        <RepositoryProvider runtimeOptions={{
          env: { REACT_APP_ENABLE_SQLITE_PERSISTENCE: 'true' },
          getPlatform: () => 'ios',
          isNativePlatform: () => true,
          createSQLiteService: () => service,
          createSQLiteRepositories,
        }}>
          <App key="first-mount" />
        </RepositoryProvider>
      </RepositoryInitializationErrorBoundary>
    );

    expect(await screen.findByText('Native SQLite Task')).toBeInTheDocument();
    expect(screen.getByText('Native Project')).toBeInTheDocument();
    expect(screen.getByText('Native Tag')).toBeInTheDocument();

    rerender(
      <RepositoryInitializationErrorBoundary>
        <RepositoryProvider runtimeOptions={{
          env: { REACT_APP_ENABLE_SQLITE_PERSISTENCE: 'true' },
          getPlatform: () => 'ios',
          isNativePlatform: () => true,
          createSQLiteService: () => service,
          createSQLiteRepositories,
        }}>
          <App key="second-mount" />
        </RepositoryProvider>
      </RepositoryInitializationErrorBoundary>
    );

    await waitFor(() => expect(screen.getByText('Native SQLite Task')).toBeInTheDocument());
    expect(screen.getByText('Native Project')).toBeInTheDocument();
    expect(screen.getByText('Native Tag')).toBeInTheDocument();

    unmount();
  });

  it('shows an explicit initialization error instead of exposing repositories', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RepositoryInitializationErrorBoundary>
        <RepositoryProvider runtimeOptions={{
          env: { REACT_APP_ENABLE_SQLITE_PERSISTENCE: 'true' },
          getPlatform: () => 'ios',
          isNativePlatform: () => true,
          createSQLiteService: () => ({
            initialize: jest.fn(async () => {
              throw new Error('native sqlite failed');
            }),
            close: jest.fn(async () => undefined),
          }) as never,
          createSQLiteRepositories,
        }}>
          <App />
        </RepositoryProvider>
      </RepositoryInitializationErrorBoundary>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Persistence initialization failed.');
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
