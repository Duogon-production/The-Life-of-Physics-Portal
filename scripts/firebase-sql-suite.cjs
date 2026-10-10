// Render the existing rollback suites with Firebase string subjects. These test
// PostgreSQL policies; they do not stand in for real signed-token HTTP tests.
const fs = require('node:fs');
const path = require('node:path');
fs.mkdirSync('.local', { recursive: true });
for (const name of ['authorization', 'hardening']) {
  let sql = fs.readFileSync(`supabase/tests/${name}.sql`, 'utf8').replaceAll('auth.uid()', 'private.current_app_user_id()');
  sql = sql.replace('begin;', `begin;
insert into private.external_identities(profile_id,provider,issuer,subject,verified_at)
select id,'firebase','https://securetoken.google.com/diagonproduction','firebase-fixture-'||right(id::text,12),now() from public.profiles;`);
  sql = sql.replace(/\{"iss":"https:\/\/gmvouqgjbtbkbhrdruzu.supabase.co\/auth\/v1","aud":"authenticated","sub":"(10000000-0000-0000-0000-\d{12})","role":"authenticated"\}/g,
    (_, id) => JSON.stringify({ iss: 'https://securetoken.google.com/diagonproduction', aud: 'diagonproduction', sub: `firebase-fixture-${id.slice(-12)}`, role: 'authenticated', email_verified: true, auth_time: Math.floor(Date.now() / 1000) }));
  sql = sql.split('\n').map(line => /storage.objects/.test(line) && /owner_id/.test(line)
    ? line.replace(/'10000000-0000-0000-0000-(\d{12})'/g, "'firebase-fixture-$1'") : line).join('\n');
  fs.writeFileSync(path.join('.local', `firebase-sql-${name}.sql`), sql);
}
console.log('Rendered both rollback SQL suites into .local/. No database writes executed.');
