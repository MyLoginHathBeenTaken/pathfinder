const fs = require ('node:fs');
const path = require ('node:path');
const { EOL } = require("os");
const util = require('util');

module.exports = async function (confPath = './config.conf', autoflush = true) {
    return new Promise((resolve, reject) => {
        try {
            let conf = {}
            confToJson(confPath).then(a => {
                console.log(`conf path is: ${confPath}`);
                console.log(util.inspect(a, { depth: null }));
                let modExport = {
                    getKey: (key) => {
                        return a[key]
                    }, // Define functions inside the returned object
                    setKey: (key, value) => {
                        a[key] = value;
                        return a[key]
                    }
                }
                resolve(modExport)
            })
        } catch (err) {
            reject(err)
        }
    })
};

function confToJson(confPath) {
    return new Promise((resolve, reject) => {
        let ext = path.extname(confPath);
        if (ext == '.conf') {
            try {
                fs.accessSync(confPath, fs.constants.R_OK | fs.constants.W_OK)
                let confJson = {}
                readLines(confPath).then(a => {
                    console.log('test' + a)
                    for (i in a) {
                        let kvp = parser(a[i])
                        confJson = {
                            ...confJson,
                            ...kvp
                        }
                    }
                    resolve(confJson)
                })
            } catch (err) {
                reject(err)
            }
        }
    })
};

function readLines(confPath) {
    return new Promise((resolve, reject) => {
        let stringArray = [];
        const stream = fs.createReadStream(confPath, { encoding: 'utf8' });
        console.log(`reading ${confPath}`)
        stream.on('data', raw => {
            try {
                let strings = raw.split(EOL)
                for (i in strings)  {
                    stringArray.push(strings[i].trim())
                    console.log(`strings[i] in readline: ${strings[i]}`)
                }
            } catch (err) {
                reject(err)
            }
        });

        stream.on('close', () => {
            console.log('closed')
            resolve(stringArray);
        })
        stream.on('error', err => {
            reject(err);
        });

        stream.on('end', () => {
            resolve(stringArray);
        })

    })
};

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
};

function pushChanges(conf) {
    // find keys and update values and if there is a commet reattach coment to end
    // append all new keys to eof
};
