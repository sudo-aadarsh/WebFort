import fs from 'fs';
import path from 'path';

const filesToMigrate = [
  'api/auth/routes.js',
  'api/users/routes.js',
  'api/alerts/routes.js',
  'api/integrations/routes.js',
  'api/reports/routes.js',
  'api/scans/routes.js',
  'middleware/auth.js',
  'core/engine.js',
  'config/seed.js'
];

const basePath = '/home/aadarsh/Documents/WebSecure/backend/src';

for (const file of filesToMigrate) {
  const fullPath = path.join(basePath, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // Multi-line replace for non-awaited db.prepare
    content = content.replace(/(?<!await\s)(db\.prepare\([\s\S]*?\)\.(?:get|run|all)\([^)]*\))/g, 'await $1');

    // Fix `.count` issues: await db.prepare(...).get(...).count -> (await db.prepare(...).get(...))?.count
    content = content.replace(/(await db\.prepare\([\s\S]*?\)\.get\([^)]*\))\.count/g, '($1)?.count');

    fs.writeFileSync(fullPath, content);
    console.log(`Migrated ${file}`);
  }
}
