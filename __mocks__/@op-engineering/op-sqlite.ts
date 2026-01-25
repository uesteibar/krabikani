// Mock op-sqlite for testing
// Simulates SQLite database operations in memory

interface MockRow {
  [key: string]: string | number | boolean | null;
}

interface MockTable {
  columns: string[];
  rows: MockRow[];
  autoIncrement: { [key: string]: number };
}

interface MockDatabase {
  tables: { [tableName: string]: MockTable };
  executedStatements: string[];
}

// Mock database state
let mockDatabase: MockDatabase = {
  tables: {},
  executedStatements: [],
};

// Track if database is open
let isOpen = false;

// Helper to parse CREATE TABLE statement and extract table name and columns
function parseCreateTable(sql: string): { tableName: string; columns: string[] } | null {
  const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*)\)/i);
  if (!match) return null;

  const tableName = match[1];
  const columnDefs = match[2];

  // Extract column names (simplified parsing)
  const columns: string[] = [];
  const lines = columnDefs.split(',');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip constraints like FOREIGN KEY, CHECK, etc.
    if (trimmed.match(/^(FOREIGN KEY|CHECK|PRIMARY KEY\s*\(|UNIQUE\s*\()/i)) {
      continue;
    }
    const colMatch = trimmed.match(/^(\w+)\s+/);
    if (colMatch) {
      columns.push(colMatch[1]);
    }
  }

  return { tableName, columns };
}

// Helper to parse INSERT statement
function parseInsert(sql: string, params: (string | number | boolean | null)[]): {
  tableName: string;
  columns: string[];
  values: (string | number | boolean | null)[];
  isReplace: boolean;
  isIgnore: boolean;
} | null {
  // Match: INSERT [OR REPLACE/IGNORE] INTO tableName (columns) VALUES (?)
  const matchWithCols = sql.match(/INSERT\s+(?:OR\s+(\w+)\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (matchWithCols) {
    const modifier = matchWithCols[1]?.toUpperCase();
    const tableName = matchWithCols[2];
    const columns = matchWithCols[3].split(',').map(c => c.trim());
    return {
      tableName,
      columns,
      values: params,
      isReplace: modifier === 'REPLACE',
      isIgnore: modifier === 'IGNORE',
    };
  }

  // Match: INSERT [OR IGNORE] INTO tableName (column) VALUES (value) - single static value
  const matchStatic = sql.match(/INSERT\s+(?:OR\s+(\w+)\s+)?INTO\s+(\w+)\s*\((\w+)\)\s*VALUES\s*\((\d+)\)/i);
  if (matchStatic) {
    const modifier = matchStatic[1]?.toUpperCase();
    return {
      tableName: matchStatic[2],
      columns: [matchStatic[3]],
      values: [parseInt(matchStatic[4], 10)],
      isReplace: modifier === 'REPLACE',
      isIgnore: modifier === 'IGNORE',
    };
  }

  return null;
}

// Helper to parse WHERE clause and extract conditions
function parseWhereClause(sql: string, params: (string | number | boolean | null)[]): {
  column: string;
  value: string | number | boolean | null;
  operator: string;
} | null {
  // Try matching with placeholder first
  const whereMatchPlaceholder = sql.match(/WHERE\s+(\w+)\s*(=|<=|>=|<|>)\s*\?/i);
  if (whereMatchPlaceholder) {
    const column = whereMatchPlaceholder[1];
    const operator = whereMatchPlaceholder[2].toUpperCase();

    // Find the parameter index for this WHERE clause
    const beforeWhere = sql.substring(0, sql.toUpperCase().indexOf('WHERE'));
    const paramCount = (beforeWhere.match(/\?/g) || []).length;
    const value = params[paramCount] ?? null;

    return { column, value, operator };
  }

  // Try matching with literal value (e.g., WHERE id = 1)
  const whereMatchLiteral = sql.match(/WHERE\s+(\w+)\s*(=|<=|>=|<|>)\s*(\d+)/i);
  if (whereMatchLiteral) {
    return {
      column: whereMatchLiteral[1],
      operator: whereMatchLiteral[2].toUpperCase(),
      value: parseInt(whereMatchLiteral[3], 10),
    };
  }

  // Try matching IS NULL / IS NOT NULL
  const whereMatchNull = sql.match(/WHERE\s+(\w+)\s+(IS NULL|IS NOT NULL)/i);
  if (whereMatchNull) {
    return {
      column: whereMatchNull[1],
      operator: whereMatchNull[2].toUpperCase(),
      value: null,
    };
  }

  return null;
}

// Mock QueryResult matching op-sqlite's interface
interface MockQueryResult {
  rows: MockRow[];
  rowsAffected: number;
  insertId?: number;
}

function createQueryResult(rows: MockRow[] = [], rowsAffected = 0, insertId?: number): MockQueryResult {
  return {
    rows,
    rowsAffected,
    insertId,
  };
}

// Execute SQL implementation
function executeSqlImpl(sql: string, params: (string | number | boolean | null)[] = []): MockQueryResult {
  mockDatabase.executedStatements.push(sql);

  // Handle CREATE TABLE
  if (sql.match(/CREATE TABLE/i)) {
    const parsed = parseCreateTable(sql);
    if (parsed && !mockDatabase.tables[parsed.tableName]) {
      mockDatabase.tables[parsed.tableName] = {
        columns: parsed.columns,
        rows: [],
        autoIncrement: {},
      };
    }
    return createQueryResult();
  }

  // Handle CREATE INDEX
  if (sql.match(/CREATE INDEX/i)) {
    return createQueryResult();
  }

  // Handle INSERT
  if (sql.match(/INSERT/i)) {
    const parsed = parseInsert(sql, params);
    if (parsed) {
      const table = mockDatabase.tables[parsed.tableName];
      if (table) {
        const row: MockRow = {};
        let insertId: number | undefined = undefined;

        // Initialize all table columns with null first
        for (const col of table.columns) {
          row[col] = null;
        }

        // Then set the provided values
        parsed.columns.forEach((col, i) => {
          // Handle COALESCE subquery pattern - skip the extra id param
          row[col] = parsed.values[i] ?? null;
        });

        // Handle AUTOINCREMENT for id if not provided
        if (row.id === null || row.id === undefined) {
          if (table.columns.includes('id')) {
            const autoInc = (table.autoIncrement.id || 0) + 1;
            table.autoIncrement.id = autoInc;
            row.id = autoInc;
            insertId = autoInc;
          }
        } else {
          insertId = row.id as number;
        }

        // Add created_at timestamp if column exists and not provided
        if (table.columns.includes('created_at') && !row.created_at) {
          row.created_at = new Date().toISOString();
        }

        // Check for existing row with same ID
        const existingIndex = table.rows.findIndex(r => r.id === row.id);

        if (parsed.isReplace && existingIndex >= 0) {
          // Replace existing row
          table.rows[existingIndex] = row;
        } else if (parsed.isIgnore && existingIndex >= 0) {
          // Ignore - do nothing
        } else if (existingIndex < 0) {
          // Insert new row
          table.rows.push(row);
        }

        return createQueryResult([], 1, insertId);
      }
    }
    return createQueryResult();
  }

  // Handle SELECT
  if (sql.match(/SELECT/i)) {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (tableMatch) {
      const tableName = tableMatch[1];
      const table = mockDatabase.tables[tableName];
      if (table) {
        let rows = [...table.rows];

        // Handle WHERE clause
        const whereCondition = parseWhereClause(sql, params);
        if (whereCondition) {
          rows = rows.filter(r => {
            const rowValue = r[whereCondition.column];
            switch (whereCondition.operator) {
              case '=':
                return rowValue === whereCondition.value;
              case '<=':
                if (rowValue === null || whereCondition.value === null) return false;
                return rowValue <= whereCondition.value;
              case '>=':
                if (rowValue === null || whereCondition.value === null) return false;
                return rowValue >= whereCondition.value;
              case '<':
                if (rowValue === null || whereCondition.value === null) return false;
                return rowValue < whereCondition.value;
              case '>':
                if (rowValue === null || whereCondition.value === null) return false;
                return rowValue > whereCondition.value;
              case 'IS NULL':
                return rowValue === null;
              case 'IS NOT NULL':
                return rowValue !== null;
              default:
                return true;
            }
          });
        }

        // Handle IN clause
        const inMatch = sql.match(/WHERE\s+(\w+)\s+IN\s*\(/i);
        if (inMatch) {
          const column = inMatch[1];
          rows = rows.filter(r => params.includes(r[column] as string | number | boolean | null));
        }

        // Handle COUNT(*)
        if (sql.match(/COUNT\s*\(\s*\*\s*\)/i)) {
          return createQueryResult([{ count: rows.length }]);
        }

        // Handle MIN(column)
        if (sql.match(/MIN\s*\(\s*(\w+)\s*\)/i)) {
          const minMatch = sql.match(/MIN\s*\(\s*(\w+)\s*\)\s+as\s+(\w+)/i);
          if (minMatch) {
            const column = minMatch[1];
            const alias = minMatch[2];
            const values = rows.map(r => r[column]).filter(v => v !== null) as (string | number)[];
            const minValue = values.length > 0 ? values.reduce((a, b) => a < b ? a : b) : null;
            return createQueryResult([{ [alias]: minValue }]);
          }
        }

        // Handle MAX(version)
        if (sql.match(/MAX\s*\(\s*(\w+)\s*\)/i)) {
          const maxMatch = sql.match(/MAX\s*\(\s*(\w+)\s*\)/i);
          if (maxMatch) {
            const column = maxMatch[1];
            const values = rows.map(r => r[column]).filter(v => v !== null) as number[];
            const maxValue = values.length > 0 ? Math.max(...values) : null;
            return createQueryResult([{ [column]: maxValue }]);
          }
        }

        return createQueryResult(rows);
      }
    }
    return createQueryResult();
  }

  // Handle UPDATE
  if (sql.match(/UPDATE/i)) {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (tableMatch) {
      const tableName = tableMatch[1];
      const table = mockDatabase.tables[tableName];
      if (table) {
        const whereCondition = parseWhereClause(sql, params);
        let rowsAffected = 0;

        // Parse SET clause
        const setMatch = sql.match(/SET\s+([\s\S]+?)(?:\s+WHERE|$)/i);
        if (setMatch) {
          const setClause = setMatch[1];
          const assignments = setClause.split(',').map(s => s.trim());

          table.rows.forEach((row, index) => {
            // Check WHERE condition
            if (whereCondition) {
              const rowValue = row[whereCondition.column];
              if (whereCondition.operator === '=' && rowValue !== whereCondition.value) {
                return;
              }
            }

            // Apply updates
            let paramIndex = 0;
            assignments.forEach(assignment => {
              const match = assignment.match(/(\w+)\s*=\s*(\?|CURRENT_TIMESTAMP|NULL)/i);
              if (match) {
                const column = match[1];
                const valueType = match[2].toUpperCase();

                if (valueType === '?') {
                  table.rows[index][column] = params[paramIndex];
                  paramIndex++;
                } else if (valueType === 'CURRENT_TIMESTAMP') {
                  table.rows[index][column] = new Date().toISOString();
                } else if (valueType === 'NULL') {
                  table.rows[index][column] = null;
                }
              }
            });

            rowsAffected++;
          });
        }

        return createQueryResult([], rowsAffected);
      }
    }
    return createQueryResult([], 1);
  }

  // Handle DELETE
  if (sql.match(/DELETE/i)) {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (tableMatch) {
      const tableName = tableMatch[1];
      const table = mockDatabase.tables[tableName];
      if (table) {
        const whereCondition = parseWhereClause(sql, params);

        if (whereCondition) {
          const initialCount = table.rows.length;
          table.rows = table.rows.filter(r => {
            const rowValue = r[whereCondition.column];
            if (whereCondition.operator === '=') {
              return rowValue !== whereCondition.value;
            }
            return true;
          });
          return createQueryResult([], initialCount - table.rows.length);
        } else {
          // DELETE all
          const count = table.rows.length;
          table.rows = [];
          return createQueryResult([], count);
        }
      }
    }
    return createQueryResult([], 1);
  }

  return createQueryResult();
}

// Mock Transaction interface
interface MockTransaction {
  execute: (sql: string, params?: (string | number | boolean | null)[]) => Promise<MockQueryResult>;
  commit: () => Promise<MockQueryResult>;
  rollback: () => MockQueryResult;
}

// Mock DB interface matching op-sqlite
interface MockDB {
  execute: jest.Mock<Promise<MockQueryResult>, [string, (string | number | boolean | null)?[]]>;
  executeSync: jest.Mock<MockQueryResult, [string, (string | number | boolean | null)?[]]>;
  transaction: jest.Mock<Promise<void>, [(tx: MockTransaction) => Promise<void>]>;
  close: jest.Mock<void, []>;
  delete: jest.Mock<void, [string?]>;
  getDbPath: jest.Mock<string, [string?]>;
}

// Create mock database instance
function createMockDbInstance(): MockDB {
  return {
    execute: jest.fn(async (sql: string, params: (string | number | boolean | null)[] = []): Promise<MockQueryResult> => {
      return executeSqlImpl(sql, params);
    }),

    executeSync: jest.fn((sql: string, params: (string | number | boolean | null)[] = []): MockQueryResult => {
      return executeSqlImpl(sql, params);
    }),

    transaction: jest.fn(async (callback: (tx: MockTransaction) => Promise<void>): Promise<void> => {
      const tx: MockTransaction = {
        execute: async (sql: string, params: (string | number | boolean | null)[] = []): Promise<MockQueryResult> => {
          return executeSqlImpl(sql, params);
        },
        commit: async (): Promise<MockQueryResult> => {
          return createQueryResult();
        },
        rollback: (): MockQueryResult => {
          return createQueryResult();
        },
      };
      await callback(tx);
    }),

    close: jest.fn((): void => {
      isOpen = false;
    }),

    delete: jest.fn((_location?: string): void => {
      mockDatabase = {
        tables: {},
        executedStatements: [],
      };
    }),

    getDbPath: jest.fn((_location?: string): string => {
      return '/mock/path/to/database.db';
    }),
  };
}

let mockDbInstance: MockDB = createMockDbInstance();

// Open database - matching op-sqlite's open function
export const open = jest.fn((_config: { name: string; location?: string; encryptionKey?: string }): MockDB => {
  isOpen = true;
  return mockDbInstance;
});

// Test helpers
export const __resetMockDatabase = (): void => {
  mockDatabase = {
    tables: {},
    executedStatements: [],
  };
  isOpen = false;
  mockDbInstance = createMockDbInstance();
  open.mockClear();
  open.mockImplementation((_config: { name: string; location?: string; encryptionKey?: string }): MockDB => {
    isOpen = true;
    return mockDbInstance;
  });
};

export const __getMockDatabase = (): MockDatabase => mockDatabase;

export const __getExecutedStatements = (): string[] => mockDatabase.executedStatements;

export const __isOpen = (): boolean => isOpen;

// Helper to directly insert a row for testing (bypasses SQL parsing)
export const __insertRow = (tableName: string, row: MockRow): void => {
  if (!mockDatabase.tables[tableName]) {
    mockDatabase.tables[tableName] = {
      columns: Object.keys(row),
      rows: [],
      autoIncrement: {},
    };
  }
  mockDatabase.tables[tableName].rows.push(row);
};

// Helper to get rows from a table
export const __getTableRows = (tableName: string): MockRow[] => {
  return mockDatabase.tables[tableName]?.rows || [];
};

// Export type for QueryResult
export type { MockQueryResult as QueryResult };

// Export type for DB
export type { MockDB as DB };
