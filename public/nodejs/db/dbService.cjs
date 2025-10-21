const { getDatabase } = require('./sqlite.cjs');

const insert = (table, data) => {
  const db = getDatabase();
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');

  const stmt = db.prepare(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
  );

  return stmt.run(...values);
};

const insertMany = (table, records) => {
  if (records.length === 0) return;

  const db = getDatabase();
  const keys = Object.keys(records[0]);
  const placeholders = keys.map(() => '?').join(', ');

  const stmt = db.prepare(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
  );

  const insertManyFn = db.transaction((recordList) => {
    for (const record of recordList) {
      stmt.run(...Object.values(record));
    }
  });

  insertManyFn(records);
};

const getAll = (table) => {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM ${table}`);
  return stmt.all();
};

const getById = (table, id) => {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
  return stmt.get(id);
};

const update = (table, id, data) => {
  const db = getDatabase();
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map(k => `${k} = ?`).join(', ');

  const stmt = db.prepare(
    `UPDATE ${table} SET ${setClause} WHERE id = ?`
  );

  return stmt.run(...values, id);
};

const remove = (table, id) => {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
  return stmt.run(id);
};

const query = (sql, params = []) => {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.all(...params);
};

const queryOne = (sql, params = []) => {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.get(...params);
};

const execute = (sql, params = []) => {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.run(...params);
};

const count = (table, whereClause, params = []) => {
  const db = getDatabase();
  const sql = whereClause
    ? `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`
    : `SELECT COUNT(*) as count FROM ${table}`;

  const stmt = db.prepare(sql);
  const result = stmt.get(...params);
  return result.count;
};

const exists = (table, id) => {
  return count(table, 'id = ?', [id]) > 0;
};

const getSetting = (key, defaultValue = '') => {
  const result = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
  return result?.value || defaultValue;
};

const setSetting = (key, value) => {
  const db = getDatabase();
  const stmt = db.prepare(
    `INSERT INTO settings (key, value, updated_at) 
     VALUES (?, ?, CURRENT_TIMESTAMP) 
     ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`
  );
  stmt.run(key, value, value);
};

const transaction = (callback) => {
  const db = getDatabase();
  const fn = db.transaction(callback);
  return fn();
};

module.exports = {
  insert,
  insertMany,
  getAll,
  getById,
  update,
  remove,
  query,
  queryOne,
  execute,
  count,
  exists,
  getSetting,
  setSetting,
  transaction
};
