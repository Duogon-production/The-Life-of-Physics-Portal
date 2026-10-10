// Windows exFAT returns EISDIR for readlink(non-symlink), where Next.js expects
// EINVAL. Normalize only that confirmed case; preserve real links/other errors.
// Loaded with --require so Next's worker processes inherit the same behavior.
if (process.platform === 'win32') {
  const fs = require('node:fs');
  const normalize = (error, filename) => {
    if (error?.code !== 'EISDIR') return error;
    try {
      if (fs.lstatSync(filename).isSymbolicLink()) return error;
    } catch {
      return error;
    }
    error.code = 'EINVAL';
    error.errno = -4071;
    error.message = error.message.replace('EISDIR', 'EINVAL')
      .replace('illegal operation on a directory', 'invalid argument');
    return error;
  };
  const readlink = fs.readlink;
  fs.readlink = function (filename, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    // Preserve Node's argument validation rather than hiding caller mistakes.
    if (typeof callback !== 'function') return readlink.call(this, filename, options, callback);
    return readlink.call(this, filename, options, (error, value) => callback(normalize(error, filename), value));
  };
  const readlinkSync = fs.readlinkSync;
  fs.readlinkSync = function (filename, options) {
    try { return readlinkSync.call(this, filename, options); }
    catch (error) { throw normalize(error, filename); }
  };
  const readlinkPromise = fs.promises.readlink;
  fs.promises.readlink = async function (filename, options) {
    try { return await readlinkPromise.call(this, filename, options); }
    catch (error) { throw normalize(error, filename); }
  };
}
