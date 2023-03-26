# TrimId #
## Introduction ##
The trimid is an identifier generation system which provide mongodb's ObjectId system with following modifications.
1. 5 bytes to store timestamp value (which will result in the date of 36812-02-20 UTC)
2. 4 bytes to store machine id (which is a fnv1a32 hash of hostname by default)
3. 4 bytes to store process / subprocess / thread identifier (which is a fnv1a32 hash of the process/thread ids)
4. 3 bytes to store incrementing counter, which is randomly initialized

## Installation ##
Use the following command to install the module:
```bash
npm install trimid
```

## Usages ##
```js
// Grab trimid module
const TrimId = require('trimid');

// Generate new trimid
const new_id = TrimId.NEW;

// Convert id to a comparable string (base32hex format)
const string_id = new_id.toString(); //01i20mgo1b3toqjm7oa21erbis

// Restore an trimid instance from base32hex string
const restore_id = TrimId.from('01i20mgo1b3toqjm7oa21erbis');



// Use the following statment if you want to change machine id and session id
TrimId._base('some hostname', `new_session_id,${process.pid}.${process.ppid}`);

// The generated id's machine id and session id will be changed
const id_with_new_machine_id = Trim.NEW;
```

## Cli Usage ##
This module also provides a command that allow user generates a new uniqid string via CLI.
To use the command, install the module globally first.
```bash
npm install -g trimid
```

The use the following command to generate base32hex uniqid string
```bash
uniqid
```

Or if you want to generate binanry stream and perform custom encoding yourself.
```bash
uniqid --binary | base64
```