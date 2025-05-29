// src/lib/db.ts
/**
 * SQLite Database Connection
 * Initializes and exports the better-sqlite3 database instance.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDirectory = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dbDirectory, 'prompt_builder.db');

// Ensure the data directory exists
// The init-db.mjs script should handle this, but it's good for robustness
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

let dbInstance: Database.Database;

try {
  dbInstance = new Database(dbPath);
  // Optional: Enable WAL mode for better concurrency
  dbInstance.pragma('journal_mode = WAL');
} catch (error) {
  console.error("Failed to connect to SQLite database:", error);
  // Handle error appropriately, perhaps by exiting or using a fallback
  // For now, we'll rethrow, but in a real app, you might have more sophisticated error handling
  throw error;
}

export const db = dbInstance;
