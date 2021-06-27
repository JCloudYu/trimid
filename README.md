# TrimId #
TrimId is a libary that is designed to generate unique identifiers accroding to time and environment the system is working on.
TrimId is inspired by MongoDB's ObjectID system and is rewritten to work on both NodeJS and browser environment.

## Data struture ##
TrimId's data structure is defined as follows:
```
00 01 02 03 04 05 06 07 08 09 10 11 12 13
[  timestamp  ][machine_id][pid ][ seq   ]
```

Time timestamp is a 5-bytes long unsigned integer that guarantees id will be valid till 36812/02/20T00:36:16 UTC.
Machine id and pids are used to prevent collisions among generated data

## Usage ##
### NodeJS ###
#### Installation ####
1. Use the following command to install TrimId module.
	```bash
	npm install trimid
	```
2. Use ```require``` to obtain and use TrimId module.
	```javascript
	const TrimId = require('trimid');
	const new_id = TrimId.NEW;
	```

### Browser ###
#### Installation ####
1. Add thw following script tag to <head> section.
	```html
	<script src='https://cdn.jsdelivr.net/gh/jcloudyu/trimid@master/trimid.js'></script>
	```
2. TrimId object will be registered globally and can be used directly anywhere.
	```javascript
	const new_id = TrimId.NEW;
	```


### Usage ###
```javascript
// Generate a new id
const newId  = TrimId.NEW; // Generate a new unique id

// Init id from other TrimId
const prevId = TrimId.from(newId); // Copy exising id

// Init id from base32hex format
// Reference: https://en.wikipedia.org/wiki/Base32#base32hex
const base32Id = TrimId.fromHex("vvvvvvvv1b3toqg938k3ckg");
const b32 = base32Id.toString(32);

// Init id from base64sort format ( which uses following character map with no padding characters )
// Characters: 0123456789=ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz
const base64sort = TrimId.fromHex("zzzzzzw=lxle2GccC_8");
const b64 = base64sort.toString(64);

// Init id from hex format
const hexId = TrimId.fromHex("0102030405060708090a0b0c0d0e");
const hex = hexId.toString(16);

// Init id from arbitrary Unit8Array
const rawId = TrimId.from(new Unit8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e]));
const bytes = new_id.toBytes();



// Accessing the id object's meta attributes
newId.timestamp		// 5-bytes unsigned integer, the epoch time when the object is created
newId.machine_id	// 4-bytes unsigned integer, the machine's idenfier ( resolved from hostname )
newId.pid			// 2-bytes unsigned integer, the process current js engine is working on
newId.seq			// 3-bytes unsigned integer, the sequential number that prevents unexpected collisions
```



### Notice ###
This library uses 32bit unsigned integer timestamp