try{const time=Number(require('fs').readFileSync('/tmp/worker-heartbeat','utf8'));process.exitCode=Number.isFinite(time)&&Date.now()-time<180000?0:1;}catch{process.exitCode=1;}
