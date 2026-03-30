import * as fs from 'fs';
import * as path from 'path';
import sax from 'sax';
import Database from 'better-sqlite3';
import {
  JMdictEntry,
  shouldIncludeEntry,
  filterEntryCharacters,
} from './dictionary-filters';

// --- XML Parsing ---

function parseJMdict(xmlPath: string): Promise<JMdictEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: JMdictEntry[] = [];
    const parser = sax.createStream(false, {lowercase: true});

    let currentEntry: JMdictEntry | null = null;
    let textBuffer = '';
    let inKEle = false;
    let inREle = false;
    let inSense = false;
    let inGloss = false;
    let glossLang = '';

    parser.on('opentag', (node: sax.Tag) => {
      textBuffer = '';

      switch (node.name) {
        case 'entry':
          currentEntry = {
            characters: [],
            readings: [],
            meanings: [],
            priorities: [],
          };
          break;
        case 'k_ele':
          inKEle = true;
          break;
        case 'r_ele':
          inREle = true;
          break;
        case 'sense':
          inSense = true;
          break;
        case 'gloss':
          inGloss = true;
          glossLang = (node.attributes['xml:lang'] as string) || 'eng';
          break;
      }
    });

    parser.on('text', (text: string) => {
      textBuffer += text;
    });

    parser.on('closetag', (tagName: string) => {
      if (!currentEntry) {
        return;
      }

      const text = textBuffer.trim();

      if (inKEle) {
        if (tagName === 'keb') {
          currentEntry.characters.push(text);
        } else if (tagName === 'ke_pri') {
          currentEntry.priorities.push(text);
        } else if (tagName === 'k_ele') {
          inKEle = false;
        }
      } else if (inREle) {
        if (tagName === 'reb') {
          currentEntry.readings.push(text);
        } else if (tagName === 're_pri') {
          currentEntry.priorities.push(text);
        } else if (tagName === 'r_ele') {
          inREle = false;
        }
      } else if (inSense) {
        if (inGloss && tagName === 'gloss') {
          if (glossLang === 'eng' && text) {
            currentEntry.meanings.push(text);
          }
          inGloss = false;
        } else if (tagName === 'sense') {
          inSense = false;
        }
      }

      if (tagName === 'entry') {
        entries.push(currentEntry);
        currentEntry = null;
      }
    });

    parser.on('error', (err: Error) => {
      reject(err);
    });

    parser.on('end', () => {
      resolve(entries);
    });

    fs.createReadStream(xmlPath).pipe(parser);
  });
}

// --- Database creation ---

export function createDatabase(
  dbPath: string,
  entries: JMdictEntry[],
): number {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE dictionary_vocab (
      id INTEGER PRIMARY KEY,
      characters TEXT UNIQUE NOT NULL,
      readings TEXT NOT NULL,
      meanings TEXT NOT NULL
    );
  `);

  db.prepare(
    "INSERT INTO metadata (key, value) VALUES ('source', 'JMdict by the Electronic Dictionary Research and Development Group (EDRDG)')",
  ).run();
  db.prepare(
    "INSERT INTO metadata (key, value) VALUES ('license', 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)')",
  ).run();
  db.prepare(
    "INSERT INTO metadata (key, value) VALUES ('url', 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project')",
  ).run();

  const insert = db.prepare(
    'INSERT OR IGNORE INTO dictionary_vocab (characters, readings, meanings) VALUES (?, ?, ?)',
  );

  const insertMany = db.transaction((items: JMdictEntry[]) => {
    let count = 0;
    for (const entry of items) {
      const validChars = filterEntryCharacters(entry.characters);
      for (const chars of validChars) {
        const result = insert.run(
          chars,
          JSON.stringify(entry.readings),
          JSON.stringify(entry.meanings),
        );
        if (result.changes > 0) {
          count++;
        }
      }
    }
    return count;
  });

  const filteredEntries = entries.filter(shouldIncludeEntry);
  const count = insertMany(filteredEntries);

  db.close();
  return count;
}

// --- Main ---

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: build-dictionary <path-to-JMdict.xml>');
    console.error(
      'Download JMdict_e.xml from: https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project',
    );
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`File not found: ${resolvedInput}`);
    process.exit(1);
  }

  const outputPath = path.resolve(__dirname, '..', 'assets', 'dictionary.db');

  console.log(`Parsing JMdict XML from: ${resolvedInput}`);
  const entries = await parseJMdict(resolvedInput);
  console.log(`Parsed ${entries.length} total entries`);

  const count = createDatabase(outputPath, entries);
  console.log(`Created dictionary database at: ${outputPath}`);
  console.log(`Inserted ${count} vocabulary entries`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}
