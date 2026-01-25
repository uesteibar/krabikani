// Mock SQLite storage for testing
// Simulates SQLite database operations in memory

interface MockRow {
  [key: string]: string | number | null;
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
function parseInsert(sql: string, params: (string | number | null)[]): {
  tableName: string;
  columns: string[];
  values: (string | number | null)[];
} | null {
  // Match: INSERT [OR IGNORE] INTO tableName (columns) VALUES (?)
  const matchWithCols = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (matchWithCols) {
    const tableName = matchWithCols[1];
    const columns = matchWithCols[2].split(',').map(c => c.trim());
    return { tableName, columns, values: params };
  }

  // Match: INSERT [OR IGNORE] INTO tableName (column) VALUES (value) - single static value
  const matchStatic = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)\s*\((\w+)\)\s*VALUES\s*\((\d+)\)/i);
  if (matchStatic) {
    return {
      tableName: matchStatic[1],
      columns: [matchStatic[2]],
      values: [parseInt(matchStatic[3], 10)],
    };
  }

  return null;
}

// Mock result set
interface MockResultSet {
  rows: {
    raw: () => MockRow[];
    length: number;
    item: (index: number) => MockRow;
  };
  rowsAffected: number;
  insertId: number | null;
}

function createResultSet(rows: MockRow[] = [], rowsAffected = 0, insertId: number | null = null): MockResultSet {
  return {
    rows: {
      raw: () => rows,
      length: rows.length,
      item: (index: number) => rows[index],
    },
    rowsAffected,
    insertId,
  };
}

// Mock database instance
const mockDbInstance = {
  executeSql: jest.fn(async (sql: string, params: (string | number | null)[] = []): Promise<[MockResultSet]> => {
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
      return [createResultSet()];
    }

    // Handle CREATE INDEX
    if (sql.match(/CREATE INDEX/i)) {
      return [createResultSet()];
    }

    // Handle INSERT
    if (sql.match(/INSERT/i)) {
      const parsed = parseInsert(sql, params);
      if (parsed) {
        const table = mockDatabase.tables[parsed.tableName];
        if (table) {
          const row: MockRow = {};
          let insertId: number | null = null;

          parsed.columns.forEach((col, i) => {
            row[col] = parsed.values[i] ?? null;
          });

          // Handle AUTOINCREMENT for id
          if (!row.id && table.columns.includes('id')) {
            const autoInc = (table.autoIncrement.id || 0) + 1;
            table.autoIncrement.id = autoInc;
            row.id = autoInc;
            insertId = autoInc;
          }

          // Check for OR IGNORE with existing id
          const isIgnore = sql.match(/OR\s+IGNORE/i);
          const existingRow = table.rows.find(r => r.id === row.id);
          if (!existingRow || !isIgnore) {
            if (!existingRow) {
              table.rows.push(row);
            }
          }

          return [createResultSet([], 1, insertId)];
        }
      }
      return [createResultSet()];
    }

    // Handle SELECT
    if (sql.match(/SELECT/i)) {
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const table = mockDatabase.tables[tableName];
        if (table) {
          return [createResultSet(table.rows)];
        }
      }
      return [createResultSet()];
    }

    // Handle UPDATE
    if (sql.match(/UPDATE/i)) {
      return [createResultSet([], 1)];
    }

    // Handle DELETE
    if (sql.match(/DELETE/i)) {
      return [createResultSet([], 1)];
    }

    return [createResultSet()];
  }),

  close: jest.fn(async (): Promise<void> => {
    isOpen = false;
  }),
};

// Enable promise mode
export const enablePromise = jest.fn((_enable: boolean): void => {
  // No-op in mock, promises are always enabled
});

// Open database
export const openDatabase = jest.fn(async (_config: { name: string; location: string }) => {
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
  mockDbInstance.executeSql.mockClear();
  mockDbInstance.close.mockClear();
  openDatabase.mockClear();
  enablePromise.mockClear();
};

export const __getMockDatabase = (): MockDatabase => mockDatabase;

export const __getExecutedStatements = (): string[] => mockDatabase.executedStatements;

export const __isOpen = (): boolean => isOpen;

export default {
  enablePromise,
  openDatabase,
};
