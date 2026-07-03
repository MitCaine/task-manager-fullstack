import {
  CapacitorSQLiteDriver,
  type CapacitorSQLiteConnectionLike,
  type CapacitorSQLiteDBConnectionLike,
} from '../CapacitorSQLiteDriver';

function createNativeConnectionMock() {
  let open = false;

  const db: CapacitorSQLiteDBConnectionLike = {
    open: jest.fn(async () => {
      open = true;
    }),
    isDBOpen: jest.fn(async () => ({ result: open })),
    close: jest.fn(async () => {
      open = false;
    }),
    execute: jest.fn(async () => undefined),
    run: jest.fn(async () => undefined),
    query: jest.fn(async () => ({ values: [{ id: 'row-1' }] })),
    beginTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => undefined),
    rollbackTransaction: jest.fn(async () => undefined),
  };

  const manager: CapacitorSQLiteConnectionLike = {
    checkConnectionsConsistency: jest.fn(async () => ({ result: true })),
    retrieveConnection: jest.fn(async () => {
      throw new Error('missing connection');
    }),
    createConnection: jest.fn(async () => db),
    closeConnection: jest.fn(async () => undefined),
  };

  return { db, manager };
}

describe('CapacitorSQLiteDriver', () => {
  it('creates and opens the expected connection once across repeated opens', async () => {
    const { db, manager } = createNativeConnectionMock();
    const driver = new CapacitorSQLiteDriver({
      database: 'task_manager_sqlite_smoke',
      connection: manager,
    });

    await driver.open();
    await driver.open();

    expect(manager.checkConnectionsConsistency).toHaveBeenCalledTimes(2);
    expect(manager.createConnection).toHaveBeenCalledTimes(1);
    expect(manager.createConnection).toHaveBeenCalledWith(
      'task_manager_sqlite_smoke',
      false,
      'no-encryption',
      1,
      false,
    );
    expect(db.open).toHaveBeenCalledTimes(1);
  });

  it('reuses a retrieved connection when the plugin already has one', async () => {
    const { db, manager } = createNativeConnectionMock();
    jest.mocked(manager.retrieveConnection).mockResolvedValueOnce(db);
    const driver = new CapacitorSQLiteDriver({
      database: 'existing-db',
      readonly: true,
      connection: manager,
    });

    await driver.open();

    expect(manager.retrieveConnection).toHaveBeenCalledWith('existing-db', true);
    expect(manager.createConnection).not.toHaveBeenCalled();
    expect(db.open).toHaveBeenCalledTimes(1);
  });

  it('closes and releases the connection, then can reinitialize', async () => {
    const { db, manager } = createNativeConnectionMock();
    const driver = new CapacitorSQLiteDriver({
      database: 'reopen-db',
      connection: manager,
    });

    await driver.open();
    await driver.close();
    await driver.open();

    expect(db.close).toHaveBeenCalledTimes(1);
    expect(manager.closeConnection).toHaveBeenCalledWith('reopen-db', false);
    expect(manager.createConnection).toHaveBeenCalledTimes(2);
    expect(db.open).toHaveBeenCalledTimes(2);
  });

  it('delegates execute, run, query, and transaction calls through the open connection', async () => {
    const { db, manager } = createNativeConnectionMock();
    const driver = new CapacitorSQLiteDriver({
      database: 'delegate-db',
      connection: manager,
    });

    await driver.open();
    await driver.execute('CREATE TABLE test (id TEXT)');
    await driver.run('INSERT INTO test (id) VALUES (?)', ['row-1']);
    await expect(driver.query('SELECT id FROM test WHERE id = ?', ['row-1']))
      .resolves.toEqual([{ id: 'row-1' }]);
    await driver.beginTransaction();
    await driver.commitTransaction();
    await driver.rollbackTransaction();

    expect(db.execute).toHaveBeenCalledWith('CREATE TABLE test (id TEXT)');
    expect(db.run).toHaveBeenCalledWith('INSERT INTO test (id) VALUES (?)', ['row-1']);
    expect(db.query).toHaveBeenCalledWith('SELECT id FROM test WHERE id = ?', ['row-1']);
    expect(db.beginTransaction).toHaveBeenCalledTimes(1);
    expect(db.commitTransaction).toHaveBeenCalledTimes(1);
    expect(db.rollbackTransaction).toHaveBeenCalledTimes(1);
  });

  it('normalizes missing query values to an empty array', async () => {
    const { db, manager } = createNativeConnectionMock();
    jest.mocked(db.query).mockResolvedValueOnce({});
    const driver = new CapacitorSQLiteDriver({
      database: 'empty-query-db',
      connection: manager,
    });

    await driver.open();

    await expect(driver.query('SELECT id FROM test')).resolves.toEqual([]);
  });

  it('rejects operations before open', async () => {
    const { manager } = createNativeConnectionMock();
    const driver = new CapacitorSQLiteDriver({
      database: 'closed-db',
      connection: manager,
    });

    await expect(driver.query('SELECT 1')).rejects.toThrow('Capacitor SQLite database is not open.');
  });
});
