const Threads = require('node:worker_threads');
const trimid = require('./trimid.js');
trimid.setup(
	require('os').hostname(), 
	`${process.pid.toString().padStart(5, '0')}#${process.ppid.toString().padStart(5, '0')}.` + (Threads.isMainThread ? 1 : Threads.threadId).toString().padStart(5, '0')
);
module.exports = trimid;