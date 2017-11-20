
/*********************
 * SPECS
 * 1. Modular, should be able to use in other modules, with no modification to this, or to their system
 * 2. log messages will have format of log.<type>(str, {user: req, obj: obj, tags: [<name>,<name>]}
 * 3. tags can be any valid_string.
 * 4. Tags will persist in a local file <tags.json, so the same tags are in place if the software restarts.
 *
 * Second parameter conditions include
 *      data: {}    //the object or string to print along with the text message.
 *      tags: [<name>, <name>, <name>]  //Conditional tags whether this message should print. If any are active, it will print.
 *      full_path: true             //prints the full path of the file, default is false, which only prints the file name.
*/

/**************************
 * Next steps
 * - Make it so the log.json file is wherever the server started and unrelated to where the module is sitting.
 * ? Should the 'debug' be automatic if any of the tags are enabled?
 *
 *************************/


/**************************
 * EXAMPLES
 *************************/
/* log.setLogLevel('info');

var tags = log.getLogTags();
console.log("tags", tags);
tags.app.enabled = 1;
tags.upload.enabled = 0;
log.setLogTags(tags);
var tags2 = log.getLogTags();
console.log("tags2", tags2);

log.setLogLevel('warn');
log.debug("debug message");
log.info("info message");
log.warn("warn message");
console.log("got log level of", log.getLogLevel());


log.setLogLevel('debug');
log.debug("debug message");
log.info("info message");
console.log("got log level of", log.getLogLevel());
*/


//KUDOS, This was a great help: https://gist.github.com/garth/2570757. Like I couldn't find anywhere else that talked about how to set the colors, and how to enable for the transports and the overall logger.
(function(){
    'use strict';
    var moment = require ('moment');
    //Set default error levels
    var winston = require ('winston');
    var fs = require('fs-extra');
    // const tsFormat = function() { return new moment().format('YYYY-MM-DD HH:mm:ss')};
    const config = {
        levels: {
            error: 0,
            warn: 1,
            info: 2
        },
        colors: {
            error: 'red',
            warn: 'yellow',
            info: 'black'
        }
    };

    const log = new (winston.Logger) ({
        level: 'info',
        levels: config.levels,
        transports: [
            new (winston.transports.Console)({
                //timestamp: tsFormat,
                colorize: process.env.NODE_ENV === 'local'? 'all': false,//true if only the name, 'all' if the whole line
                level: 'info', //this is the initial level the the library supports.
                levels: config.levels,
                handleExceptions: true,
                prettyPrint: true
            })

        ]
    });
    //This is the key to enabling the colors.
    winston.addColors(config.colors);

    /**************************
     * AVAILABLE TAGS
     * have an name, and enabled, loaded from log.json.
     * If a new one is specified, make sure to update it.

     *************************/
    var tags = {};



    function _info() {
        handleLogging(arguments, log.info, getCallerFunctionData());
    }
    function _warn() {
        handleLogging(arguments, log.warn, getCallerFunctionData());
    }
    function _error() {
        handleLogging(arguments, log.error, getCallerFunctionData());
    }

    function _setTags(new_tags) {
        return new Promise(function(fulfill, reject) {

            var old_tags = require(log.tag_file);

            for (var property in new_tags) {
                if (new_tags.hasOwnProperty(property) && old_tags.hasOwnProperty(property)) {
                    old_tags[property].enabled = new_tags[property].enabled;
                }
            }

            var filepath = 'server/utils/' + log.tag_file;
            //KUDOS https://stackoverflow.com/questions/5670752/how-can-i-pretty-print-json-using-node-js
            fs.writeFile(filepath, JSON.stringify(old_tags, null, 4), function (err) {
                if (err) {
                    reject(err);
                }
                _info('Saved log_tags file to ', {data:filepath, tags:['logging']});
                fulfill(old_tags);
            });
        });
    }
    function _getTags() {
        return tags;
    }

    function _init(params) {

        log.level = params.level || 'info';
        log.transports.console.level = log.level;
        log.tag_file = params.tag_file || './log.json';

        tags = require (log.tag_file);
        _info("Environment:", {data:process.env.NODE_ENV, tags:['logging']});
    }
    /**************************
     * exported log functions.
     *************************/
    module.exports.init = _init;

    module.exports.info = _info;
    module.exports.warn = _warn;
    module.exports.error = _error;

    module.exports.setTags = _setTags;
    module.exports.getTags= _getTags;

    /**************************
     * Helper functions
     *************************/
    function getCallerFunctionData() {
        //KUDOS, the original idea came from here. https://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function
        //WARNING. cannot use _info, _warn, or _error in here, it will cause an infinite loop
        var originalFunc = Error.prepareStackTrace;

        var caller_file;
        var prev_caller_file;
        try {
            var err = new Error();
            var current_file;

            Error.prepareStackTrace = function (err, stack) { return stack; };

            current_file = err.stack.shift();
            //console.log('current_file', current_file.getFileName());

            while (err.stack.length) {
                prev_caller_file = caller_file;
                caller_file = err.stack.shift();
                if(current_file.getFileName() !== caller_file.getFileName()) break;
            }
        } catch (e) {}

        Error.prepareStackTrace = originalFunc;

        //KEEP This hack is so that I can trace calls from inside of this log file.
        //Without it, a log message in this file, will point to graceful-fs.js
        if (caller_file.getFileName().split('/').pop() === 'graceful-fs.js') {
            caller_file = prev_caller_file;
        }

        return {
            path: caller_file.getFileName(),
            name: caller_file.getFileName().split('/').pop(),
            line: caller_file.getLineNumber()
        };
    }

    //Evaluate whether I should print the desired log message.
    function shouldPrint(args) {
        if (args.length === 1 || !args[1].tags) {
            return true;
        } else {
            var any_tags_enabled = false;
            args[1].tags.forEach(function(print_tag){
                if (tags[print_tag] && tags[print_tag].enabled === 1) {
                    any_tags_enabled = true;
                }

            });
            return any_tags_enabled;
        }

    }
    function getUserText(arg){
        var text = "";
        if (arg && arg.user && typeof(arg.user) === 'object') {

            if (arg.user.name && typeof(arg.user.name) === 'string') {
                if (arg.user.id) {
                    text ="[" + arg.user.name + "("+ arg.user.id +")] ";
                } else {
                    text = "[" + arg.user.name + "] "
                }
            } else {

                text = "[(" + arg.user.id + ")] ";
            }
        }

        return text;
    }

    function handleLogging(args, logFn, file){

        //If I am going to print, make header from args[1]; and include data from args[1]
        if (shouldPrint(args)) {

            var header = makeHeader(args[1], file);
            var str = args[0];
            var data = (args[1] && args[1].data) ? args[1].data : "";
            logFn(header + str, data);
        }
    }

    function makeHeader(arg, file) {

        var timestamp = new moment().format('YYYY-MM-DD HH:mm:ss');
        var user = getUserText(arg);
        //conditions to consider 'web' or 'app' or 'ss-api'
        //Also there was an ss?
        var file_description = (arg && arg.full_path) ? file.path : file.name;

        return timestamp + " " + file_description + ":" + file.line + ' ' + user + '- ';
    }

}).call(this);
