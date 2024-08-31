const Database = require('better-sqlite3');
const fs = require('fs');

if (!fs.existsSync(process.cwd() + '/MetaCore_Database')) {
    fs.mkdirSync(process.cwd() + '/MetaCore_Database');
    fs.writeFileSync(process.cwd() + '/MetaCore_Database/Do not delete this folder or any of the files in it', '', 'utf8');
}
var db = new Database(process.cwd() + "/MetaCore_Database/Database.sqlite");


db.exec("CREATE TABLE IF NOT EXISTS MetaCore (key TEXT, value TEXT)");

function setKeyValue(key, value) {
  const insertStatement = db.prepare("INSERT INTO MetaCore (key, value) VALUES (?, ?)");
  insertStatement.run(key, value);
}

function getKeyValue(key) {
  const selectStatement = db.prepare("SELECT value FROM MetaCore WHERE key = ?");
  const data = selectStatement.get(key);
  return data ? data.value : null;
}


module.exports = {
  setKeyValue,
  getKeyValue
};
