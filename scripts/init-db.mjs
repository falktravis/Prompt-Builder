// c:\Users\falkt\Documents\Prompt-Builder\scripts\init-db.mjs
/**
 * Database Initialization Script
 * This script creates the SQLite database file and defines the necessary tables
 * if they don't already exist. It should be run manually once or as part of a setup process.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDirectory = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dbDirectory, 'prompt_builder.db');

// Ensure the data directory exists
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
  console.log(`Created directory: ${dbDirectory}`);
} else {
  console.log(`Directory already exists: ${dbDirectory}`);
}

console.log(`Database path: ${dbPath}`);
const db = new Database(dbPath);

// Enable WAL mode for better concurrency (optional, but good practice)
db.pragma('journal_mode = WAL');
console.log('WAL mode enabled.');

// Define table creation queries
const createComponentLibraryTable = `
CREATE TABLE IF NOT EXISTS component_library (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK(item_type IN ('folder', 'component')),
    content TEXT,
    component_type TEXT,
    is_expanded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (parent_id) REFERENCES component_library(id) ON DELETE CASCADE,
    CONSTRAINT check_item_specific_fields CHECK (
        (item_type = 'folder' AND content IS NULL AND component_type IS NULL) OR
        (item_type = 'component' AND content IS NOT NULL AND component_type IS NOT NULL)
    )
);
`;

const createPromptsTable = `
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sections TEXT,
    num INTEGER,
    created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

const createAppConfigTable = `
CREATE TABLE IF NOT EXISTS app_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    settings_json TEXT,
    active_prompt_id TEXT,
    updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (active_prompt_id) REFERENCES prompts(id) ON DELETE SET NULL
);
`;

// Execute table creation
try {
  db.exec(createComponentLibraryTable);
  console.log(`'component_library' table created or already exists.`);

  db.exec(createPromptsTable);
  console.log(`'prompts' table created or already exists.`);

  db.exec(createAppConfigTable);
  console.log(`'app_config' table created or already exists.`);

  console.log('Database initialization complete.');
} catch (error) {
  console.error('Error initializing database:', error);
} finally {
  db.close();
  console.log('Database connection closed.');
}
