(()=>{
	"use strict";

	const TrimId = require('./trimid.js');
	
	for(let count = 0; count < 10000; count++) {
		const now = Math.floor(Date.now()/1000);
		const ground_truth	= TrimId.NEW;
		const new_one		= TrimId.NEW;
		const bytes 		= TrimId.from(ground_truth.toBytes());
		const hex			= TrimId.fromHex(ground_truth.toString(16));
		const b32			= TrimId.fromBase32Hex(ground_truth.toString(32));
		const b64			= TrimId.fromBase64Sort(ground_truth.toString(64));

		if ( ground_truth.timestamp !== now || new_one.timestamp !== ground_truth.timestamp ) {
			console.error("TrimId::timestamp mismatched!");
			process.exit(1);
			return;
		}

		if ( ground_truth.machine_id !== new_one.machine_id ) {
			console.error("TrimId::matchine_id mismatched!");
			process.exit(1);
			return;
		}

		if ( ground_truth.pid !== new_one.pid ) {
			console.error("TrimId::pid mismatched!");
			process.exit(1);
			return;
		}
		
		if ( ground_truth.seq !== (new_one.seq-1) ) {
			console.error("TrimId::seq mismatched!");
			process.exit(1);
			return;
		}
		
		if ( Buffer.compare(ground_truth.bytes, bytes.bytes) !== 0 ) {
			console.error("TrimId::toBytes mismatched!");
			process.exit(1);
			return;
		}
		
		if ( Buffer.compare(ground_truth.bytes, hex.bytes) !== 0 ) {
			console.error("TrimId::toString(16) mismatched!");
			process.exit(1);
			return;
		}
		
		if ( Buffer.compare(ground_truth.bytes, b32.bytes) !== 0 ) {
			console.error("TrimId::toString(32) mismatched!");
			process.exit(1);
			return;
		}
		
		if ( Buffer.compare(ground_truth.bytes, b64.bytes) !== 0 ) {
			console.error("TrimId::toString(64) mismatched!");
			process.exit(1);
			return;
		}
	}

	{
		const MAX_U32_TIME = 0xFFFFFFFF;
		const CustomTime = TrimId.from(MAX_U32_TIME);
		if ( CustomTime.timestamp !== MAX_U32_TIME) {
			console.error("TrimId::from(MAX_U32_TIME) mismatched!");
			process.exit(1);
			return;
		}
	}

	{
		const MAX_TIME = 0xFFFFFFFFFF;
		const CustomTime = TrimId.from(MAX_TIME);
		if ( CustomTime.timestamp !== MAX_TIME) {
			console.error("TrimId::from(MAX_TIME) mismatched!");
			process.exit(1);
			return;
		}
		console.log(CustomTime.toString(16), CustomTime.toString(32), CustomTime.toString(64));
	}
	


	console.log("Pass!");
})();