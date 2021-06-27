/**
 *	Author: JCloudYu
 *	Create: 2020/06/28
**/
(()=>{
	"use strict";
	
	// See http://www.isthe.com/chongo/tech/comp/fnv/#FNV-param for the definition of these parameters;
	const FNV_PRIME_HIGH = 0x0100, FNV_PRIME_LOW = 0x0193;	// 16777619 0x01000193
	const OFFSET_BASIS = new Uint8Array([0xC5, 0x9D, 0x1C, 0x81]);	// 2166136261 [0x81, 0x1C, 0x9D, 0xC5]
	const IS_NODEJS = typeof Buffer !== "undefined";
	const TIME_SEPARATOR = 0xFFFFFFFF+1;
	
	
	
	const RUNTIME = {
		SEQ:Math.floor(Math.random() * 0xFFFFFF),
		PID:0, MACHINE_ID:null, PREV:Math.floor(Date.now()/1000)
	};
	
	if ( IS_NODEJS ) {
		RUNTIME.MACHINE_ID = fnv1a32(UTF8Encode(require('os').hostname()));
		RUNTIME.PID = process.pid;
	}
	else 
	{
		let hostname = '';
		if ( typeof location === "object" && typeof location.hostname === "string" ) { // Browser
			hostname = location.hostname;
		}
		else { // Randomly generates one
			const HOSTNAME_CANDIDATES = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWZYZ_-";
			let count = 30;
			while(count-- > 0) {
				hostname += HOSTNAME_CANDIDATES[(Math.random() * HOSTNAME_CANDIDATES.length)|0]
			}
		}
		RUNTIME.MACHINE_ID = fnv1a32(UTF8Encode(hostname));
		RUNTIME.PID = (Math.random() * 65535)|0;
	}
	
	
	
	const PRIVATE = new WeakMap();
	class TrimId {
		constructor(id=null) {
			let input_buffer = null;
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
			if ( input_buffer === null ) {
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
				const buff	= new Uint8Array(14);
				
				// 5-byte long timestamp
				buff[0]  = time_upper & 0xFF;
				buff[1]  = (time_lower>>>24) & 0xFF;
				buff[2]  = (time_lower>>>16) & 0xFF;
				buff[3]  = (time_lower>>>8) & 0xFF;
				buff[4]  = time_lower & 0xFF;
				
				// 4-byte long machine id
				buff[5]  = RUNTIME.MACHINE_ID[0];
				buff[6]  = RUNTIME.MACHINE_ID[1];
				buff[7]  = RUNTIME.MACHINE_ID[2];
				buff[8]  = RUNTIME.MACHINE_ID[3];

				// 2-byte long pid
				buff[9]	 = (RUNTIME.PID >> 8) & 0xFF;
				buff[10] = RUNTIME.PID & 0xFF;

				// 3-byte long sequence number
				buff[11] = (inc>>>16) & 0xFF;
				buff[12] = (inc>>>8) & 0xFF;
				buff[13] = inc & 0xFF;
				
				
				
				result_buffer = buff;
			}
			else {
				if ( input_buffer.length < 14 ) {
					throw new TypeError( "Given input buffer must be at least 14 bytes long!" );
				}
				
				// Prevent unexpected pre-allocated bytes from NodeJS Buffer
				result_buffer = new Uint8Array(input_buffer.slice(0, 14));
			}
			
			
			
			const _UniqueId = Object.create(null);
			_UniqueId.buffer = result_buffer;
			
			PRIVATE.set(this, _UniqueId);
		}
		toString(format=64) {
			const buffer = PRIVATE.get(this).buffer;
			
			switch(format) {
				case 64:
					return Base64SortEncode(buffer);
				
				case 32:
					return Base32HexEncode(buffer);
				
				case 16:
					return HexEncode(buffer);
				
				default:
					throw new SyntaxError(`Cannot cast unique-id as \`${format}\``);
			}
			
		}
		toJSON() {
			return this.toString();
		}
		toBytes() {
			return PRIVATE.get(this).buffer.slice(0);
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
		get pid() {
			const bytes = PRIVATE.get(this).buffer;
			return (((bytes[9] << 8)|bytes[10]) >>> 0);
		}
		get seq() {
			const bytes = PRIVATE.get(this).buffer;
			return (((bytes[11] << 16)|(bytes[12] << 8)|bytes[13]) >>> 0);
		}
		
		
		
		static get NEW() {
			return new TrimId();
		}
		static from(input) {
			try { return new TrimId(input); } catch(e) { return null; }
		}
		static fromHex(input) {
			try {
				const buffer = HexDecode(input);
				return new TrimId(buffer);
			} catch(e) { return null; }
		}
		static fromBase64Sort(input) {
			try {
				const buffer = Base64SortDecode(input);
				return new TrimId(buffer);
			} catch(e) { return null; }
		}
		static fromBase32Hex(input) {
			try {
				const buffer = Base32HexDecode(input);
				return new TrimId(buffer);
			} catch(e) { return null; }
		}
	}
	
	
	
	// HEX
	const HEX_ENCODE_CHAR = "0123456789abcdef";
	const HEX_DECODE_CHAR = {
		"0":0, "1":1, "2":2, "3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9,
		"A":10, "B":11, "C":12, "D":13, "E":14, "F":15,
		"a":10, "b":11, "c":12, "d":13, "e":14, "f":15
	};
	function HexEncode(bytes) {
		let result = '';
		for(let i=0; i<bytes.length; i++) {
			const value = bytes[i];
			result += HEX_ENCODE_CHAR[(value&0xF0)>>>4] + HEX_ENCODE_CHAR[value&0x0F];
		}
		
		return result;
	}
	function HexDecode(hex_string) {
		if ( hex_string.length % 2 === 1 ) { 
			hex_string = '0' + hex_string;
		}
		
		const buff = new Uint8Array((hex_string.length/2)|0);
		for ( let i=0; i<buff.length; i++ ) {
			const offset = i * 2, upper =  HEX_DECODE_CHAR[hex_string[offset]], lower = HEX_DECODE_CHAR[hex_string[offset+1]];
			if ( upper === undefined || lower === undefined ) {
				throw new RangeError("Given input string is not hex encoded!");
			}
			buff[i] = upper <<4 | (lower & 0x0F);
		}
		
		return buff;
	}
	
	// Base64Sort
	const BASE64SORT_ENCODE_CHAR = '0123456789=ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'.split('');
	const BASE64SORT_DECODE_CHAR = {
		'0':  0, '1':  1, '2':  2, '3':  3, '4':  4, '5':  5, '6':  6, '7':  7,
		'8':  8, '9':  9, '=': 10, 'A': 11, 'B': 12, 'C': 13, 'D': 14, 'E': 15,
		'F': 16, 'G': 17, 'H': 18, 'I': 19, 'J': 20, 'K': 21, 'L': 22, 'M': 23,
		'N': 24, 'O': 25, 'P': 26, 'Q': 27, 'R': 28, 'S': 29, 'T': 30, 'U': 31,
		'V': 32, 'W': 33, 'X': 34, 'Y': 35, 'Z': 36, '_': 37, 'a': 38, 'b': 39,
		'c': 40, 'd': 41, 'e': 42, 'f': 43, 'g': 44, 'h': 45, 'i': 46, 'j': 47,
		'k': 48, 'l': 49, 'm': 50, 'n': 51, 'o': 52, 'p': 53, 'q': 54, 'r': 55,
		's': 56, 't': 57, 'u': 58, 'v': 59, 'w': 60, 'x': 61, 'y': 62, 'z': 63,
	};
	function Base64SortEncode(bytes) {
		var v1, v2, v3, base64Str = '', length = bytes.length;
		for( var i = 0, count = ((length/3)>>>0) * 3; i < count; ){
			v1 = bytes[i++];
			v2 = bytes[i++];
			v3 = bytes[i++];
			base64Str += BASE64SORT_ENCODE_CHAR[v1 >>> 2] +
				BASE64SORT_ENCODE_CHAR[(v1 << 4 | v2 >>> 4) & 63] +
				BASE64SORT_ENCODE_CHAR[(v2 << 2 | v3 >>> 6) & 63] +
				BASE64SORT_ENCODE_CHAR[v3 & 63];
		}
		
		// remain char
		var remain = length - count;
		if( remain === 1 ){
			v1 = bytes[i];
			base64Str += BASE64SORT_ENCODE_CHAR[v1 >>> 2] + BASE64SORT_ENCODE_CHAR[(v1 << 4) & 63] + '';
		}
		else if( remain === 2 ){
			v1 = bytes[i++];
			v2 = bytes[i];
			base64Str += BASE64SORT_ENCODE_CHAR[v1 >>> 2] + BASE64SORT_ENCODE_CHAR[(v1 << 4 | v2 >>> 4) & 63] + BASE64SORT_ENCODE_CHAR[(v2 << 2) & 63] + '';
		}
		return base64Str;
	}
	function Base64SortDecode(base64Str) {
		let _tmp;
		base64Str = '' + base64Str;
		
		
		
		const length = base64Str.length;
		const remain = length % 4;
		switch( remain ) {
			case 0:
				_tmp = (length/4|0)*3;
				break;
				
			case 2:
				_tmp = (length/4|0)*3 + 1;
				break;
				
			case 3:
				_tmp = (length/4|0)*3 + 2;
				break;
				
			default:
				throw new Error( "Given input string is not base64sort encoded!" );
		}
		
		
		
		const bytes = new Uint8Array(_tmp);
		
		let v1, v2, v3, v4, i=0, j=0, end=(length/4|0)*4;
		while ( i<end ) {
			v1 = BASE64SORT_DECODE_CHAR[base64Str[i++]];
			v2 = BASE64SORT_DECODE_CHAR[base64Str[i++]];
			v3 = BASE64SORT_DECODE_CHAR[base64Str[i++]];
			v4 = BASE64SORT_DECODE_CHAR[base64Str[i++]];
			if ( v1 === undefined || v2 === undefined || v3 === undefined || v4 === undefined ) {
				throw new Error( "Given input string is not base64sort encoded!" );
			}

			bytes[j++] = (v1 << 2 | v2 >>> 4);
			bytes[j++] = (v2 << 4 | v3 >>> 2);
			bytes[j++] = (v3 << 6 | v4);
		}
		
		
		
		// Decode remaining bytes
		switch( remain ) {
			case 2:
				v1 = BASE64SORT_DECODE_CHAR[base64Str.charAt(i++)];
				v2 = BASE64SORT_DECODE_CHAR[base64Str.charAt(i)];
				if ( v1 === undefined || v2 === undefined ) {
					throw new Error( "Given input string is not base64sort encoded!" );
				}

				bytes[j] = (v1 << 2 | v2 >>> 4);
				break;
			
			case 3:
				v1 = BASE64SORT_DECODE_CHAR[base64Str.charAt(i++)];
				v2 = BASE64SORT_DECODE_CHAR[base64Str.charAt(i++)];
				v3 = BASE64SORT_DECODE_CHAR[base64Str.charAt(i)];
				if ( v1 === undefined || v2 === undefined || v3 === undefined ) {
					throw new Error( "Given input string is not base64sort encoded!" );
				}

				bytes[j] = (v1 << 2 | v2 >>> 4);
				bytes[j+1] = (v2 << 4 | v3 >>> 2);
				break;
		}
		
		return bytes;
	}
	
	// Base32
	const BASE32_ENCODE_CHAR = "0123456789abcdefghijklmnopqrstuv".split('');
	const BASE32_DECODE_CHAR = {
		'0':  0, '1':  1, '2':  2, '3':  3, '4':  4, '5':  5, '6':  6, '7':  7, '8':  8, '9':  9, 
		'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17, 'I': 18, 'J': 19, 'K': 20, 'L': 21, 'M': 22,
		'N': 23, 'O': 24, 'P': 25, 'Q': 26, 'R': 27, 'S': 28, 'T': 29, 'U': 30, 'V': 31, 
		'a': 10, 'b': 11, 'c': 12, 'd': 13, 'e': 14, 'f': 15, 'g': 16, 'h': 17, 'i': 18, 'j': 19, 'k': 20, 'l': 21, 'm': 22,
		'n': 23, 'o': 24, 'p': 25, 'q': 26, 'r': 27, 's': 28, 't': 29, 'u': 30, 'v': 31,
	}
	
	function Base32HexEncode(bytes) {
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
	function Base32HexDecode(input) {
		let remain = input.length % 8;
		if ( [0, 2, 4, 5, 7].indexOf(remain) < 0 ) {
			return null;
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
			if ( v1 === undefined || v2 === undefined || v3 === undefined || v4 === undefined || v5 === undefined || v6 === undefined || v7 === undefined ) {
				throw new RangeError("Given input string is not base32hex encoded!");
			}

			if ( remain >= 2 ) {
				decoded[dest] =  v1 << 3 | v2 >> 2;						// 0
			}
			
			if ( remain >= 4 ) {
				decoded[dest+1] = (v2 & 0x03) << 6 | v3 << 1 | v4 >> 4;	// 1
			}
			
			if ( remain >= 5 ) {
				decoded[dest+2] = (v4 & 0x0F) << 4 | v5 >> 1;			// 2
			}
			
			if ( remain === 7 ) {
				decoded[dest+3] = (v5 & 0x01) << 7 | v6 << 2 | v7 >> 3;	// 3
			}
		}
		
		return decoded;
	}
	
	// Helper
	function UTF8Encode(str) {
		if ( typeof str !== "string" ) {
			throw new TypeError( "Given input argument must be a js string!" );
		}
	
		let codePoints = [];
		let i=0;
		while( i < str.length ) {
			let codePoint = str.codePointAt(i);
			
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
	function fnv1a32(octets) {
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
	
	
	
	
	
	
	// Export interface
	if ( typeof module !== "undefined" && Object(module) === module ) {
		module.exports = TrimId;
		return;
	}
	
	if ( typeof global !== "undefined" ) {
		global.TrimId = TrimId;
		return;
	}
	
	if ( typeof window !== "undefined" ) {
		window.TrimId = TrimId;
		return;
	}
})();
