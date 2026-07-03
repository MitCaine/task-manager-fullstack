import { getUserVersion, runMigrations } from '../migrations';
import { SqlJsTestDriver } from '../testing/SqlJsTestDriver';
import type { SqliteExecuteOptions } from '../types';

describe('SQLite migrations', () => {
  it('executes migration SQL and user_version updates without plugin-managed nested transactions', async () => {
    const driver = new SqlJsTestDriver();
    await driver.open();
    const executeSpy = jest.spyOn(driver, 'execute');

    await runMigrations(driver, [
      {
        version: 1,
        name: 'create_test_table',
        up: 'CREATE TABLE test_migration (id TEXT PRIMARY KEY);',
      },
    ]);

    expect(executeSpy).toHaveBeenCalledWith(
      'CREATE TABLE test_migration (id TEXT PRIMARY KEY);',
      { transaction: false },
    );
    expect(executeSpy).toHaveBeenCalledWith('PRAGMA user_version = 1', { transaction: false });
    expect(await getUserVersion(driver)).toBe(1);

    await driver.close();
  });

  it('rolls back failed migration work inside the explicit migration transaction', async () => {
    const driver = new SqlJsTestDriver();
    await driver.open();
    const beginSpy = jest.spyOn(driver, 'beginTransaction');
    const commitSpy = jest.spyOn(driver, 'commitTransaction');
    const rollbackSpy = jest.spyOn(driver, 'rollbackTransaction');

    await expect(runMigrations(driver, [
      {
        version: 1,
        name: 'failing_migration',
        up: `
          CREATE TABLE failed_migration (id TEXT PRIMARY KEY);
          INSERT INTO missing_table (id) VALUES ('broken');
        `,
      },
    ])).rejects.toThrow();

    expect(beginSpy).toHaveBeenCalledTimes(1);
    expect(commitSpy).not.toHaveBeenCalled();
    expect(rollbackSpy).toHaveBeenCalledTimes(1);
    await expect(driver.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [
      'failed_migration',
    ])).resolves.toEqual([]);
    expect(await getUserVersion(driver)).toBe(0);

    await driver.close();
  });

  it('preserves SQL.js behavior while accepting execute options', async () => {
    const driver = new SqlJsTestDriver();
    await driver.open();

    await driver.execute('CREATE TABLE option_test (id TEXT PRIMARY KEY);', { transaction: false });
    await driver.run('INSERT INTO option_test (id) VALUES (?)', ['row-1']);

    await expect(driver.query('SELECT id FROM option_test')).resolves.toEqual([{ id: 'row-1' }]);

    await driver.close();
  });
});

type _CompileCheckExecuteOptions = SqliteExecuteOptions;
