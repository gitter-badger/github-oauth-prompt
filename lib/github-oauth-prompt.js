/*
 * github-oauth-prompt
 * github.com/henrahmagix/github-oauth-prompt
 *
 * Copyright (c) 2014 Henry Blyth
 * Licensed under the MIT license.
 */

'use strict';

// Packages
var _ = require('lodash');
var async = require('async');
var inquirer = require('inquirer');
var github = new (require('github'))({version: '3.0.0'});



function promptValue (name, promptMessage, callback) {
    if (!callback && _.isFunction(promptMessage)) {
        callback = promptMessage;
    }
    if (!_.isString(promptMessage)) {
        promptMessage = name;
    }
    var prompt = inquirer.prompt([{
        type: name === 'password' ? 'password' : 'input',
        name: name,
        message: promptMessage,
        validate: function (answer) {
            return (answer.length > 0) ? true : name + ' is required';
        }
    }], function (answers) {
        callback(null, answers[name]);
    });
    return prompt;
}

function promptUsername (promptMessage, callback) {
    return promptValue('username', promptMessage, callback);
}

function promptPassword (promptMessage, callback) {
    return promptValue('password', promptMessage, callback);
}

function prompt2FACode (promptMessage, callback) {
    return promptValue('code', promptMessage, callback);
}

function saveBasicAuth (username, password) {
    // Setup basic authentication.
    github.authenticate({
        type: 'basic',
        username: username,
        password: password
    });
}

// Check if the user has two-factor authentication enabled.
function userRequires2FA (callback) {
    github.authorization.getAll({}, function (err, res) {
        var has2FA = false;
        if (err) {
            // Can't check the response headers on error, so do a string
            // match on the message.
            if (err.code === 401 && JSON.parse(err.message).message === 'Must specify two-factor authentication OTP code.') {
                has2FA = true;
                callback(null, has2FA);
            } else {
                callback(err);
            }
        } else {
            callback(null, has2FA);
        }
    });
}

// Set token request headers for the possibility of a 2FA code.
function createRequestHeaders (has2FA, code) {
    var headers = {};
    if (has2FA) {
        if (!code) {
            throw new Error('Code required but not given');
        }
        headers['X-GitHub-OTP'] = code;
    }
    return headers;
}

function getExistingToken (name, headers, callback) {
    // `note` is unique but is not the uid so we must get and search through
    // all tokens.
    github.authorization.getAll({
        headers: headers
    }, function (err, res) {
        if (err) {
            callback(err);
        } else {
            var existingAuthItem = _.find(res, function (authItem) {
                return authItem.note === name;
            });
            if (existingAuthItem) {
                console.log('Existing token found!');
                callback(null, existingAuthItem.token);
            } else {
                callback(new Error('No existing token found'));
            }
        }
    });
}

// Create an authorization token.
function createAuth (headers, options, callback) {
    var authOptions = {
        scopes: options.scopes,
        note: options.name,
        note_url: options.url,
        headers: headers
    };
    github.authorization.create(authOptions, function (err, res) {
        if (err) {
            if (err.code === 422) {
                // Token for this name already exists so fetch it.
                getExistingToken(authOptions.note, authOptions.headers, callback);
            } else {
                callback(err);
            }
        } else {
            // Token get! ACHIEVEMENT
            console.log('Token created!');
            callback(null, res.token);
        }
    });
}



function getOptions (userOptions) {

    // Deep clone to avoid mutating the users' object.
    var options = _.clone(userOptions, true);

    function optionIsNonEmptyString (key) {
        return _.isString(options[key]) && options[key].length > 0;
    }

    // Option: name -> note.
    if (_.isUndefined(options.name)) {
        throw new Error('Option name is required');
    }
    if (!optionIsNonEmptyString('name')) {
        throw new Error('Option name must be a non-empty string');
    }

    // Option: scopes.
    if (_.isUndefined(options.scopes)) {
        options.scopes = [];
    }
    if (!_.isArray(options.scopes)) {
        throw new Error('Option scopes must be an array');
    }

    // Option: url -> note_url.
    if (_.isUndefined(options.url)) {
        options.url = '';
    }
    if (!_.isString(options.url)) {
        throw new Error('Option url must be a string');
    }

    // Option: prompt messages.
    if (_.isUndefined(options.prompt)) {
        options.prompt = {};
    }
    if (!_.isObject(options.prompt) || _.isArray(options.prompt)) {
        throw new Error('Option prompt must be an object');
    }

    // Option: username.
    if (!_.isUndefined(options.username) && !_.isString(options.username)) {
        throw new Error('Option username must be a string');
    }

    // Option: password.
    if (!_.isUndefined(options.password) && !_.isString(options.password)) {
        throw new Error('Option password must be a string');
    }

    // Option: code.
    if (!_.isUndefined(options.code) && !_.isString(options.code)) {
        throw new Error('Option code must be a string');
    }

    return options;
}



// Main.
module.exports = function main (options, mainCallback) {

    if (!_.isObject(options) || _.isArray(options)) {
        throw new Error('Options object is required as the first parameter');
    }

    if (!_.isFunction(mainCallback)) {
        throw new Error('Callback is required as the second parameter');
    }

    options = getOptions(options);



    // Run.
    async.series([
        function authenticate (callback) {
            async.series([
                function getUsername (callback) {
                    if (options.username) {
                        callback(null, options.username);
                    } else {
                        promptUsername(options.prompt.username, callback);
                    }
                },
                function getPassword (callback) {
                    if (options.password) {
                        callback(null, options.password);
                    } else {
                        promptPassword(options.prompt.password, callback);
                    }
                }
            ], function saveResults (err, res) {
                if (res) {
                    saveBasicAuth(res[0], res[1]);
                }
                callback(err, res);
            });
        },
        function token (callback) {
            async.waterfall([
                function checkFor2FA (callback) {
                    userRequires2FA(callback);
                },
                function getRequestHeaders (has2FA, callback) {
                    var headers = createRequestHeaders();
                    if (has2FA) {
                        if (options.code) {
                            headers = createRequestHeaders(has2FA, options.code);
                            callback(null, headers);
                        } else {
                            prompt2FACode(options.prompt.code, function (err, code) {
                                if (err) {
                                    callback(err);
                                } else {
                                    headers = createRequestHeaders(has2FA, code);
                                    callback(null, headers);
                                }
                            });
                        }
                    } else {
                        callback(null, headers);
                    }
                },
                function getToken (headers, callback) {
                    createAuth(headers, options, callback);
                }
            ], function returnToken (err, res) {
                callback(err, res);
            });
        }
    ], function end (err, res) {
        // Clear basic authentication.
        github.authenticate();
        if (err) {
            throw err;
        }
        // res[0] is user credentials, res[1] is the token.
        mainCallback(err, res[1]);
    });
};

module.exports.promptValue = promptValue;
module.exports.promptUsername = promptUsername;
module.exports.promptPassword = promptPassword;
module.exports.prompt2FACode = prompt2FACode;
module.exports.saveBasicAuth = saveBasicAuth;
module.exports.userRequires2FA = userRequires2FA;
module.exports.createRequestHeaders = createRequestHeaders;
module.exports.getExistingToken = getExistingToken;
module.exports.createAuth = createAuth;
module.exports.getOptions = getOptions;

module.exports.requiresCode = function (auth, callback) {
    if (!_.isObject(auth) || !_.isString(auth.username) || !_.isString(auth.username)) {
        throw new Error('Username and password required to user requiresCode');
    }
    saveBasicAuth(auth.username, auth.password);
    userRequires2FA(callback);
};

