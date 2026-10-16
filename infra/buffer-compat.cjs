// Preserve the existing next.config.js compatibility shim in standalone mode.
const buffer=require('node:buffer');if(!buffer.SlowBuffer)buffer.SlowBuffer=buffer.Buffer;
