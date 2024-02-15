const fs = require ('node:fs');
const path = require ('node:path');
const { escape } = require('node:querystring');
const { parseArgs } = require('node:util');
const { EOL } = require("os");
const util = require('util');

module.exports = async function (confPath = './config.conf', autoflush = true) {
    try {
        const conf = await confToJson(confPath); // Await for confToJson to resolve
        console.log(`conf path is: ${confPath}`);
        console.log(util.inspect(conf, {depth: null}));
        return {
            getKey: (key) => {
                return conf[key]
            }, // Define functions inside the returned object
            setKey: (key, value) => { 
                conf[key] = value;
                return conf[key]
            }
        };
    } catch (err) {
        console.error('Error loading configuration:', err);
        throw err; // Re-throw to allow handling by the caller
    }
};

function confToJson(confPath) {
    try {
        let ext = path.extname(confPath);
        if (ext == '.conf') {
            fs.accessSync(confPath, fs.constants.R_OK | fs.constants.W_OK)
            try {
                let confJson = readLines(confPath)
                return confJson
            } catch (err) {
                throw err;
            }
        } else {
            throw 'invalidExt'
        }
    } catch (err) {
        return err
    }
}

function readLines(confPath) {
    return new Promise((resolve, reject) => {
        let kvpObj = {};
        const stream = fs.createReadStream(confPath, { encoding: 'utf8' });
        console.log(`reading ${confPath}`)
        stream.on('data', raw => {
            try {
                
                let strings = raw.split(EOL)
                // for (i in strings)  {
                //     strings[i] = strings[i].trim()
                //     if (strings[i] === '') {
                //         strings.pop()
                //         i--
                //     }
                //     console.log(`line ${i} of strings: ${strings[i]}`)
                // } 
                for (i in strings)  {
                    let kvp = parser(strings[i])
                    kvpObj = {
                        ...kvpObj,
                        ...kvp
                    }
                }
            } catch (err) {
                reject(err)
            }
        });

        stream.on('close', () => {
            console.log('closed')
            console.log(util.inspect(kvpObj, { depth: null }))
            resolve(kvpObj);
        })
        stream.on('error', err => {
            reject(err);
        });

        stream.on('end', () => {
            console.log('end: ' + util.inspect(kvpObj, { depth: null }))
            console.log('read done')
        });

    });
}

function escaper(string) {
    let inString = false; // Track being inside single or double quotes
    let inStringD = false;
    for (let i = 0; i < string.length; i++) {
        const char = string[i];
        switch (true) {
            case char === '\'' && inStringD === !inStringD:
                inString = !inString;
                break;
            case char === '\"' && inString === !inString:
                inString = !inString;
                inStringD = !inStringD;
                break;
            case char === '\#' && i === 0:
                return '';
                break;
            case !inString && char === '\#':
                return string.slice(0,i).trim();
            default:
                break;
        }
    }
    return string.trim()
}

function parser(line) {
    let obj = {}
    let eLine = escaper(line)
    console.log(eLine)
    if (eLine !== '') {
        let key = eLine.slice(0, eLine.indexOf('=')).trim()
        let value = eLine.slice(eLine.indexOf('=') + 1, eLine.length + 1).trim()
        switch (true) {
            case value === 'true':
                obj[key] = true
                break;
            case value === 'false':
                obj[key] = false
                return obj
                break;
            case value[0] === '\'' || value[0] === '\"':
                obj[key] = value.slice(1, -1)
                return obj
                break;
            case !value.isNaN:
                obj[key] = Number(value)
                return obj
                break;
            default:
                try {
                    let json = JSON.parse(value)
                    if (json && typeof json === "object") {
                        obj = json
                    }
                } catch (err) {
                    throw 'invalid data type'
                }
                break;
        }
    }
    return obj
}