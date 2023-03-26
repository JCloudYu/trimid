#!/usr/bin/env node
(()=>{
	"use strict";

	// #region [ Types ]
	type TypedArray = Uint8Array|Uint8ClampedArray|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|Float64Array;
	type RuntimeState = {SEQ:number, SID:Uint8Array|null, MACHINE_ID:Uint8Array|null };
	// #endergion


	// See http://www.isthe.com/chongo/tech/comp/fnv/#FNV-param for the definition of these parameters;
	const FNV_PRIME_HIGH = 0x0100, FNV_PRIME_LOW = 0x0193;	// 16777619 0x01000193
	const OFFSET_BASIS = new Uint8Array([0xC5, 0x9D, 0x1C, 0x81]);	// 2166136261 [0x81, 0x1C, 0x9D, 0xC5]
	const IS_NODEJS = typeof Buffer !== "undefined";
	const TIME_SEPARATOR = 0xFFFFFFFF+1;



	const RUNTIME:RuntimeState = {
		SEQ: Math.floor(Math.random() * 0xFFFFFF),
		SID:null, MACHINE_ID:null
	};

	if ( IS_NODEJS ) {
		const Threads = require('worker_threads');
		RUNTIME.MACHINE_ID = fnv1a32(UTF8Encode(require('os').hostname()));

		const SID_KEY = `${process.pid.toString().padStart(5, '0')}#${process.ppid.toString().padStart(5, '0')}.` + (Threads.isMainThread ? 1 : Threads.threadId).toString().padStart(5, '0');
		RUNTIME.SID = fnv1a32(UTF8Encode(SID_KEY));
	}
	else  {
		const STR_CANDIDATE = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWZYZ_-";


		let hostname = '';
		if ( typeof location === "object" && typeof location.hostname === "string" ) { // Browser
			hostname = location.hostname;
		}
		else { // Randomly generates one	
			let count = Math.random() * 30 + 30;
			while(count-- > 0) {
				hostname += STR_CANDIDATE[(Math.random() * STR_CANDIDATE.length)|0]
			}
		}


		let sid_key = '';
		{
			let count = Math.random() * 30 + 30;
			while(count-- > 0) {
				sid_key += STR_CANDIDATE[(Math.random() * STR_CANDIDATE.length)|0]
			}
		}

		RUNTIME.MACHINE_ID = fnv1a32(UTF8Encode(hostname));
		RUNTIME.SID = fnv1a32(UTF8Encode(sid_key));
	}



	const PRIVATE = new WeakMap();
	class TrimId {
		static _base(machine_id:string, session_id:string) {
			if ( typeof machine_id === "string" ) {
				RUNTIME.MACHINE_ID = fnv1a32(UTF8Encode(machine_id));
			}

			if ( typeof session_id === "string" ) {
				RUNTIME.SID = fnv1a32(UTF8Encode(session_id));
			}
		}

		constructor(id?:TrimId|ArrayBuffer|TypedArray) {
			let input_buffer:Uint8Array|null = null;

			if ( id instanceof TrimId ) {
				input_buffer = PRIVATE.get(id).buffer;
			}
			else
			// Uint8Array & NodeJS Buffer
			if ( id instanceof Uint8Array ) {
				input_buffer = id;
			}
			else
			if ( ArrayBuffer.isView(id) ) {
				input_buffer = new Uint8Array(id.buffer);
			}
			else
			if ( id instanceof ArrayBuffer ) {
				input_buffer = new Uint8Array(id);
			}
			
			
			
			let result_buffer = null;
			if ( !input_buffer ) {
				// Prepare required values
				let time;
				if ( typeof id === "number") {
					if ( id < 0 ) {
						throw new RangeError("Input number must be greater or equal to 0");
					}

					time = Math.floor(id);
				}
				else {
					time = Math.floor(Date.now()/1000);
				}



				const time_upper = Math.floor(time/TIME_SEPARATOR);
				const time_lower = time%TIME_SEPARATOR;
				const inc = RUNTIME.SEQ	= (RUNTIME.SEQ + 1) & 0xFFFFFF;


				// Build up TrimId
				const buff	= new Uint8Array(16);
				
				// 5-byte long timestamp
				buff[ 0]  = time_upper & 0xFF;
				buff[ 1]  = (time_lower>>>24) & 0xFF;
				buff[ 2]  = (time_lower>>>16) & 0xFF;
				buff[ 3]  = (time_lower>>>8) & 0xFF;
				buff[ 4]  = time_lower & 0xFF;
				
				// 4-byte long machine id
				buff[ 5]  = RUNTIME.MACHINE_ID![0];
				buff[ 6]  = RUNTIME.MACHINE_ID![1];
				buff[ 7]  = RUNTIME.MACHINE_ID![2];
				buff[ 8]  = RUNTIME.MACHINE_ID![3];

				// 4-byte long session id
				buff[ 9]  = RUNTIME.SID![0];
				buff[10]  = RUNTIME.SID![1];
				buff[11]  = RUNTIME.SID![2];
				buff[12]  = RUNTIME.SID![3];

				// 3-byte long sequence number
				buff[13] = (inc>>>16) & 0xFF;
				buff[14] = (inc>>>8) & 0xFF;
				buff[15] = inc & 0xFF;
				
				
				
				
				result_buffer = buff;
			}
			else {
				if ( input_buffer.length < 16 ) {
					throw new TypeError( "Given input buffer must be at least 14 bytes long!" );
				}
				
				// Prevent unexpected pre-allocated bytes from NodeJS Buffer
				result_buffer = new Uint8Array(input_buffer.slice(0, 16));
			}
			
			
			
			const _UniqueId = Object.create(null);
			_UniqueId.buffer = result_buffer;
			
			PRIVATE.set(this, _UniqueId);
		}
		toString() {
			return Base32HexEncode(PRIVATE.get(this).buffer);
		}
		
		get bytes() {
			return PRIVATE.get(this).buffer;
		}
		get timestamp() {
			const bytes = PRIVATE.get(this).buffer;
			const upper = bytes[0] * TIME_SEPARATOR;
			const lower = (((bytes[1] << 24)|(bytes[2] << 16)|(bytes[3] << 8)|bytes[4]) >>> 0);
			return upper + lower;
		}
		get machine_id() {
			const bytes = PRIVATE.get(this).buffer;
			return (((bytes[5] << 24)|(bytes[6] << 16)|(bytes[7] << 8)|bytes[8]) >>> 0);
		}
		get session_id() {
			const bytes = PRIVATE.get(this).buffer;
			return (((bytes[9] << 24)|(bytes[10] << 16)|(bytes[11] << 8)|bytes[12]) >>> 0);
		}
		get seq() {
			const bytes = PRIVATE.get(this).buffer;
			return (((bytes[13] << 16)|(bytes[14] << 8)|bytes[15]) >>> 0);
		}
		
		
		
		static get NEW() {
			return new TrimId();
		}
		static from(input?:string|TrimId|ArrayBuffer|TypedArray):TrimId|null {
			try {
				if ( typeof input === "string" ) {
					input = Base32HexDecode(input);
				}
				return new TrimId(input);
			} catch(e) { return null; }
		}
	}



	// Base32
	const BASE32_ENCODE_CHAR = "0123456789abcdefghijklmnopqrstuv".split('');
	const BASE32_DECODE_CHAR:{[char:string]:number} = {
		'0':  0, '1':  1, '2':  2, '3':  3, '4':  4, '5':  5, '6':  6, '7':  7, '8':  8, '9':  9, 
		'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17, 'I': 18, 'J': 19, 'K': 20, 'L': 21, 'M': 22,
		'N': 23, 'O': 24, 'P': 25, 'Q': 26, 'R': 27, 'S': 28, 'T': 29, 'U': 30, 'V': 31, 
		'a': 10, 'b': 11, 'c': 12, 'd': 13, 'e': 14, 'f': 15, 'g': 16, 'h': 17, 'i': 18, 'j': 19, 'k': 20, 'l': 21, 'm': 22,
		'n': 23, 'o': 24, 'p': 25, 'q': 26, 'r': 27, 's': 28, 't': 29, 'u': 30, 'v': 31,
	};

	function Base32HexEncode(bytes:Uint8Array):string {
		if ( bytes.length < 1 ) return '';
		
		
		// Run complete bundles
		let encoded = '';
		let begin, loop = Math.floor(bytes.length/5);
		for (let run=0; run<loop; run++) {
			begin = run * 5;
			encoded += BASE32_ENCODE_CHAR[  bytes[begin]           >> 3];								// 0
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin  ] & 0x07) << 2 | (bytes[begin+1] >> 6)];	// 1
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+1] & 0x3E) >> 1];								// 2
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+1] & 0x01) << 4 | (bytes[begin+2] >> 4)];	// 3
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+2] & 0x0F) << 1 | (bytes[begin+3] >> 7)];	// 4
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+3] & 0x7C) >> 2];								// 5
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+3] & 0x03) << 3 | (bytes[begin+4] >> 5)];	// 6
			encoded += BASE32_ENCODE_CHAR[  bytes[begin+4] & 0x1F];										// 7
		}
		
		// Run remains
		let remain = bytes.length % 5;
		if ( remain === 0 ) { return encoded; }
		
		
		begin = loop*5;
		if ( remain === 1 ) {
			encoded += BASE32_ENCODE_CHAR[  bytes[begin]           >> 3];								// 0
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin  ] & 0x07) << 2];								// 1
		}
		else
		if ( remain === 2 ) {
			encoded += BASE32_ENCODE_CHAR[  bytes[begin]           >> 3];								// 0
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin  ] & 0x07) << 2 | (bytes[begin+1] >> 6)];	// 1
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+1] & 0x3E) >> 1];								// 2
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+1] & 0x01) << 4];								// 3
		}
		else
		if ( remain === 3 ) {
			encoded += BASE32_ENCODE_CHAR[  bytes[begin]           >> 3];								// 0
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin  ] & 0x07) << 2 | (bytes[begin+1] >> 6)];	// 1
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+1] & 0x3E) >> 1];								// 2
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+1] & 0x01) << 4 | (bytes[begin+2] >> 4)];	// 3
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+2] & 0x0F) << 1];								// 4
		}
		else
		if ( remain === 4 ) {
			encoded += BASE32_ENCODE_CHAR[  bytes[begin]           >> 3];								// 0
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin  ] & 0x07) << 2 | (bytes[begin+1] >> 6)];	// 1
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+1] & 0x3E) >> 1];								// 2
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+1] & 0x01) << 4 | (bytes[begin+2] >> 4)];	// 3
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+2] & 0x0F) << 1 | (bytes[begin+3] >> 7)];	// 4
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+3] & 0x7C) >> 2];								// 5
			encoded += BASE32_ENCODE_CHAR[ (bytes[begin+3] & 0x03) << 3];								// 6
		}
		
		return encoded;
	}
	function Base32HexDecode(input:string):Uint8Array {
		let remain = input.length % 8;
		if ( [0, 2, 4, 5, 7].indexOf(remain) < 0 ) {
			throw new Error( "Given input string is not base32hex encoded!" );
		}
		
		let decoded = new Uint8Array(Math.floor(input.length * 5 / 8));
		
		
		
		
		// Run complete bundles
		let dest, begin, loop = Math.floor(input.length/8);
		for (let run=0; run<loop; run++) {
			begin = run * 8;
			dest  = run * 5;

			const v1 = BASE32_DECODE_CHAR[input[begin]];
			const v2 = BASE32_DECODE_CHAR[input[begin+1]];
			const v3 = BASE32_DECODE_CHAR[input[begin+2]];
			const v4 = BASE32_DECODE_CHAR[input[begin+3]];
			const v5 = BASE32_DECODE_CHAR[input[begin+4]];
			const v6 = BASE32_DECODE_CHAR[input[begin+5]];
			const v7 = BASE32_DECODE_CHAR[input[begin+6]];
			const v8 = BASE32_DECODE_CHAR[input[begin+7]];
			if ( v1 === undefined || v2 === undefined || v3 === undefined || v4 === undefined || v5 === undefined || v6 === undefined || v7 === undefined || v8 === undefined ) {
				throw new RangeError("Given input string is not base32hex encoded!");
			}


			decoded[dest] 	=  v1 << 3 | v2 >> 2;					// 0
			decoded[dest+1] = (v2 & 0x03) << 6 | v3 << 1 | v4 >> 4;	// 1
			decoded[dest+2] = (v4 & 0x0F) << 4 | v5 >> 1;			// 2
			decoded[dest+3] = (v5 & 0x01) << 7 | v6 << 2 | v7 >> 3;	// 3
			decoded[dest+4] = (v7 & 0x07) << 5 | v8;				// 4
		}
		
		if ( remain === 0 ) { return decoded; }
		
		
		
		{
			begin = loop*8;
			dest  = loop*5;

			const v1 = BASE32_DECODE_CHAR[input[begin]];
			const v2 = BASE32_DECODE_CHAR[input[begin+1]];
			const v3 = BASE32_DECODE_CHAR[input[begin+2]];
			const v4 = BASE32_DECODE_CHAR[input[begin+3]];
			const v5 = BASE32_DECODE_CHAR[input[begin+4]];
			const v6 = BASE32_DECODE_CHAR[input[begin+5]];
			const v7 = BASE32_DECODE_CHAR[input[begin+6]];
			if ( remain >= 2 ) {
				if ( v1 === undefined || v2 === undefined ) {
					throw new RangeError("Given input string is not base32hex encoded!");
				}
				decoded[dest] =  v1 << 3 | v2 >> 2;						// 0
			}
			
			if ( remain >= 4 ) {
				if ( v3 === undefined || v4 === undefined ) {
					throw new RangeError("Given input string is not base32hex encoded!");
				}
				decoded[dest+1] = (v2 & 0x03) << 6 | v3 << 1 | v4 >> 4;	// 1
			}
			
			if ( remain >= 5 ) {
				if ( v5 === undefined ) {
					throw new RangeError("Given input string is not base32hex encoded!");
				}
				decoded[dest+2] = (v4 & 0x0F) << 4 | v5 >> 1;			// 2
			}
			
			if ( remain === 7 ) {
				if ( v6 === undefined || v7 === undefined ) {
					throw new RangeError("Given input string is not base32hex encoded!");
				}
				decoded[dest+3] = (v5 & 0x01) << 7 | v6 << 2 | v7 >> 3;	// 3
			}
		}
		
		return decoded;
	}

	// Helper
	function UTF8Encode(str:string):Uint8Array {
		if ( typeof str !== "string" ) {
			throw new TypeError( "Given input argument must be a js string!" );
		}

		let codePoints = [];
		let i=0;
		while( i < str.length ) {
			let codePoint = str.codePointAt(i);
			if ( codePoint === undefined ) {
				throw new Error( `Invalid codepoint at index#${i}!` );
			}
			
			// 1-byte sequence
			if( (codePoint & 0xffffff80) === 0 ) {
				codePoints.push(codePoint);
			}
			// 2-byte sequence
			else if( (codePoint & 0xfffff800) === 0 ) {
				codePoints.push(
					0xc0 | (0x1f & (codePoint >> 6)),
					0x80 | (0x3f & codePoint)
				);
			}
			// 3-byte sequence
			else if( (codePoint & 0xffff0000) === 0 ) {
				codePoints.push(
					0xe0 | (0x0f & (codePoint >> 12)),
					0x80 | (0x3f & (codePoint >> 6)),
					0x80 | (0x3f & codePoint)
				);
			}
			// 4-byte sequence
			else if( (codePoint & 0xffe00000) === 0 ) {
				codePoints.push(
					0xf0 | (0x07 & (codePoint >> 18)),
					0x80 | (0x3f & (codePoint >> 12)),
					0x80 | (0x3f & (codePoint >> 6)),
					0x80 | (0x3f & codePoint)
				);
			}
			
			i += (codePoint>0xFFFF) ? 2 : 1;
		}
		return new Uint8Array(codePoints);
	}
	function fnv1a32(octets:Uint8Array):Uint8Array {
		const U8RESULT		= OFFSET_BASIS.slice(0);
		const U32RESULT		= new Uint32Array(U8RESULT.buffer);
		const RESULT_PROC	= new Uint16Array(U8RESULT.buffer);
		for( let i = 0; i < octets.length; i += 1 ) {
			U32RESULT[0] = U32RESULT[0] ^ octets[i];
			
			let hash_low = RESULT_PROC[0], hash_high = RESULT_PROC[1];
			
			RESULT_PROC[0] = hash_low * FNV_PRIME_LOW;
			RESULT_PROC[1] = hash_low * FNV_PRIME_HIGH + hash_high * FNV_PRIME_LOW + (RESULT_PROC[0]>>>16);
		}
		return U8RESULT;
	}






	// If the module 
	if ( typeof require !== "undefined" && require.main === module ) {
		const args = process.argv.slice(2).reverse();
		const options = { help:false, binary:false };
		while(args.length > 0) {
			const arg = args.pop();
			switch(arg) {
				case "--help":
					options.help = true;
					break;
				
				case "--binary":
					options.binary = true;
					break;
			}
		}


		if ( options.help ) {
			console.log(`trimid [--binary]`);
			process.exit(1);
			return;
		}



		const new_id = TrimId.NEW;
		if ( options.binary ) {
			process.stdout.write(new_id.bytes);
		}
		else {
			process.stdout.write(new_id.toString() + "\n");
		}


		process.exit(0);
		return;
	}


	
	// Export interface
	if ( typeof module !== "undefined" && Object(module) === module ) {
		module.exports = TrimId;
		return;
	}

	if ( typeof global !== "undefined" ) {
		// @ts-ignore
		global.TrimId = TrimId;
		return;
	}

	if ( typeof window !== "undefined" ) {
		// @ts-ignore
		window.TrimId = TrimId;
		return;
	}
})();