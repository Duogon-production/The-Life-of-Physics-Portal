require('./buffer-compat.cjs');
const fs = require('fs'), path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../deployment-public.json'), 'utf8'));
for (const [key, value] of Object.entries(config)) {
  if (process.env[key] && process.env[key] !== value) throw Error('Runtime public setting differs from build: ' + key);
  process.env[key] = value;
}
if (process.env.NEXT_PUBLIC_AUTH_BACKEND !== 'firebase-staging' || process.env.LMS_DATA_BACKEND !== 'supabase-staging') {
  throw Error('This deployment image supports only Firebase/Supabase staging');
}
const origin = new URL(process.env.APP_ORIGIN || '');
if (origin.origin !== process.env.APP_ORIGIN || origin.protocol !== 'https:' || origin.username || origin.password) {
  throw Error('APP_ORIGIN must be an exact HTTPS origin');
}
let credential;
try { credential = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || '', 'utf8')); }
catch { throw Error('Runtime Firebase Admin credential is unreadable or invalid'); }
if (credential.type !== 'service_account' || credential.project_id !== config.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !credential.private_key || !credential.client_email) {
  throw Error('Runtime Firebase Admin credential is missing or mismatched');
}
delete process.env.EDULABS_STANDALONE;
require('../server.js');
