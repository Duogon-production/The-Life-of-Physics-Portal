require('./windows-filesystem.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const file = path.join(__dirname, 'windows-filesystem.cjs');
const missing = path.join(__dirname, 'missing-filesystem-test-target');

test('regular file readlink reports EINVAL through synchronous, callback and promise APIs', async () => {
  assert.throws(() => fs.readlinkSync(file), { code: 'EINVAL' });
  await assert.rejects(promisify(fs.readlink)(file), { code: 'EINVAL' });
  await assert.rejects(fs.promises.readlink(file), { code: 'EINVAL' });
});
test('directory readlink reports EINVAL for a real non-link directory', async () => {
  assert.throws(() => fs.readlinkSync(__dirname), { code: 'EINVAL' });
  await assert.rejects(fs.promises.readlink(__dirname), { code: 'EINVAL' });
});
test('missing files preserve their real ENOENT error', async () => {
  assert.throws(() => fs.readlinkSync(missing), { code: 'ENOENT' });
  await assert.rejects(promisify(fs.readlink)(missing), { code: 'ENOENT' });
  await assert.rejects(fs.promises.readlink(missing), { code: 'ENOENT' });
});
