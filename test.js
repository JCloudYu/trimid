const trimid = require('./exported.js');

(async()=>{
	for(let i=0; i<10000; i++) {
		const sequence = [];
		for(let i=1; i<0xFFFF; i++) {
			sequence.push(trimid.shortid(16));
		}

		const compare = sequence.slice(0).sort();
		const match = compare.reduce((p, c, i)=>{
			return p && c === sequence[i];
		}, true);

		if ( !match ) {
			for(let i=0; i<compare.length; i++) {
				console.log(sequence[i], compare[i]);
			}
			break;
		}
		await new Promise(r=>setTimeout(r, 1000));
	}
})();