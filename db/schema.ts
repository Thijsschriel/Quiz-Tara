// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const games = sqliteTable('games', {
 code: text('code').primaryKey(), host: text('host').notNull(), stage: text('stage').notNull(),
 idx: integer('idx').notNull(), started: integer('started').notNull(), duration: integer('duration').notNull(),
 created: integer('created').notNull(),
});
export const players = sqliteTable('players', {
 id: text('id').primaryKey(), code: text('code').notNull(), name: text('name').notNull(), created: integer('created').notNull(),
});
export const answers = sqliteTable('answers', {
 player: text('player').notNull(), code: text('code').notNull(), idx: integer('idx').notNull(),
 value: text('value').notNull(), elapsed: integer('elapsed').notNull(),
}, t => [primaryKey({columns:[t.player,t.code,t.idx]})]);
