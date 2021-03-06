'use strict';

var oauth = require('../lib/github-oauth-prompt.js');
var _ = require('lodash');

// Mock the GitHub API.
var nock = require('nock');
var apiResponse = require('./api-response')(nock);

function getOptions (options) {
    return _.extend({name: 'test'}, options);
}

// Dry the calling of oauth().
function run (options, callback) {
    if (_.isUndefined(options)) {
        options = {};
    }
    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }
    options = getOptions(options);
    if (_.isUndefined(callback)) {
        callback = function () {};
    }
    oauth(options, callback);
}

function writeNewline (prompt) {
    prompt.rl.write('\n');
}

function writeToPrompt (prompt, str) {
    prompt.rl.write(str + '\n');
}

function writeUsername (prompt) {
    writeToPrompt(prompt, 'username');
}

function writePassword (prompt) {
    writeToPrompt(prompt, 'password');
}

function writeUserPass (prompt) {
    writeToPrompt(prompt, 'username');
    writeToPrompt(prompt, 'password');
}

function write2FACode (prompt) {
    writeToPrompt(prompt, '123456');
}

function reduceListeners (prompt) {
    if (prompt && prompt.rl) {
        prompt.rl.setMaxListeners(0);
        prompt.rl.input.setMaxListeners(0);
        prompt.rl.output.setMaxListeners(0);
    }
}


var assert = require('assert');
/*
    ======== A Handy Little Mocha Reference ========
    https://github.com/visionmedia/mocha/

    Test assertions:
        assert.fail(actual, expected, message, operator)
        assert(value, message), assert.ok(value, [message])
        assert.equal(actual, expected, [message])
        assert.notEqual(actual, expected, [message])
        assert.deepEqual(actual, expected, [message])
        assert.notDeepEqual(actual, expected, [message])
        assert.strictEqual(actual, expected, [message])
        assert.notStrictEqual(actual, expected, [message])
        assert.throws(block, [error], [message])
        assert.doesNotThrow(block, [message])
        assert.ifError(value)

        Apart from assert, Mocha allows you to use any of the following assertion libraries:
        - should.js
        - chai
        - expect.js
        - better-assert
*/

describe('Oauth', function () {

    var prompt;
    var cb = function () {};

    beforeEach(function () {
        if (prompt && prompt.rl) {
            prompt.close();
            prompt = null;
        }
        nock.cleanAll();
    });

    afterEach(function () {
        reduceListeners(prompt);
    });



    describe('main', function () {

        it('should error if nothing is passed', function () {
            assert.throws(
                function () {
                    oauth();
                },
                /Options object is required as the first parameter/
            );
        });

        it('should not error if a correct options object and callback function are passed', function () {
            assert.doesNotThrow(function () {
                oauth({name: 'test'}, cb);
            });
        });

        // Options.

        it('should error if an options object is not given', function () {
            assert.throws(
                function () {
                    oauth(null, cb);
                },
                /Options object is required as the first parameter/
            );
        });

        it('should not error that options object is required if an empty options object is given', function () {
            assert.throws(
                function () {
                    oauth({}, cb);
                },
                function (error) {
                    // This is the error we don't want to match.
                    var messageTest = /Options object is required as the first parameter/;
                    return !messageTest.test(error.message);
                }
            );
        });

        it('should not error that options object is required if a non-empty but incorrect options object is given', function () {
            assert.throws(
                function () {
                    oauth({key: 'value'}, cb);
                },
                function (error) {
                    // This is the error we don't want to match.
                    var messageTest = /Options object is required as the first parameter/;
                    return !messageTest.test(error.message);
                }
            );
        });

        // Callback.

        it('should error if a callback is not given', function () {
            assert.throws(
                function () {
                    oauth({name: 'test'});
                },
                /Callback is required as the second parameter/
            );
        });

        it('should not error that callback is required if callback is a function but options object is incorrect', function () {
            assert.throws(
                function () {
                    oauth({key: 'value'}, cb);
                },
                function (error) {
                    // This is the error we don't want to match.
                    var messageTest = /Callback is required as the second parameter/;
                    return !messageTest.test(error.message);
                }
            );
        });

    });

    // Options

    describe('getOptions', function () {

        it('should dereference a shallow object');
        it('should completely dereference a deep object');

        var wrongOptionTypes = {
            'null': null, 'false': false, 'true': true,
            '0': 0, '1': 1,'NaN': NaN, 'Infinity': Infinity, '-Infinity': -Infinity,
            'array': [], 'array of length': ['index'],
            'empty string': '', 'string of length': 'string'
        };
        _.each(wrongOptionTypes, function (wrongType, identifier) {
            it('should error if the first parameter is ' + identifier, function () {
                assert.throws(
                    function () {
                        oauth(wrongType, cb);
                    },
                    /Options object is required as the first parameter/
                );
            });
        });

        // Option: name

        it('should error if first parameter is an object without required option "name"', function () {
            assert.throws(
                function () {
                    oauth({}, cb);
                    oauth({unknownProperty: 'unknown'}, cb);
                    oauth({name: void 0}, cb);
                },
                /Option name is required/
            );
        });

        var wrongNameTypes = {
            'null': null, 'false': false, 'true': true,
            '0': 0, '1': 1,'NaN': NaN, 'Infinity': Infinity, '-Infinity': -Infinity,
            'array': [], 'array of length': ['index'],
            'object': {}, 'object of length': {key: 'value'},
            'empty string': ''
        };
        _.each(wrongNameTypes, function (wrongType, identifier) {
            it('should error if required option "name" is ' + identifier, function () {
                assert.throws(
                    function () {
                        oauth({name: wrongType}, cb);
                    },
                    /Option name must be a non-empty string/
                );
            });
        });

        it('should not error if required option "name" is string of length', function () {
            assert.doesNotThrow(function () {
                oauth({name: 'test'}, cb);
            });
        });

        // Option: scope

        it('should not error if option "scopes" is not given', function () {
            assert.doesNotThrow(function () {
                oauth({name: 'test'}, cb);
                oauth({name: 'test', unknownProperty: 'unknown'}, cb);
                oauth({name: 'test', scopes: void 0}, cb);
            });
        });

        var wrongScopeTypes = {
            'null': null, 'false': false, 'true': true,
            '0': 0, '1': 1,'NaN': NaN, 'Infinity': Infinity, '-Infinity': -Infinity,
            'object': {}, 'object of length': {key: 'value'},
            'empty string': '', 'string of length': 'string'
        };
        _.each(wrongScopeTypes, function (wrongType, identifier) {
            it('should error if option "scopes" is ' + identifier, function () {
                assert.throws(
                    function () {
                        oauth({
                            name: 'test',
                            scopes: wrongType
                        }, cb);
                    },
                    /Option scopes must be an array/
                );
            });
        });

        var rightScopeTypes = {
            'array': [], 'array of length': ['scopes']
        };
        _.each(rightScopeTypes, function (rightType, identifier) {
            it('should not error if option "scopes" is ' + identifier, function () {
                assert.doesNotThrow(function () {
                    oauth({
                        name: 'test',
                        scopes: rightType
                    }, cb);
                });
            });
        });

        // Option: prompt

        var wrongPromptTypes = {
            'null': null, 'false': false, 'true': true,
            '0': 0, '1': 1,'NaN': NaN, 'Infinity': Infinity, '-Infinity': -Infinity,
            'array': [], 'array of length': ['index'],
            'empty string': '', 'string of length': 'string'
        };
        _.each(wrongPromptTypes, function (wrongType, identifier) {
            it('should error if option "prompt" is ' + identifier, function () {
                assert.throws(
                    function () {
                        oauth({
                            name: 'test',
                            prompt: wrongType
                        }, cb);
                    },
                    /Option prompt must be an object/
                );
            });
        });

        var rightPromptTypes = {
            'undefined': void 0,
            'object': {}, 'object of length': {key: 'value'}
        };
        _.each(rightPromptTypes, function (rightType, identifier) {
            it('should not error if option "prompt" is ' + identifier, function () {
                assert.doesNotThrow(function () {
                    oauth({
                        name: 'test',
                        prompt: rightType
                    }, cb);
                });
            });
        });

        // Option: url
        // Option: username
        // Option: password
        // Option: code

        var wrongOptionalStringTypes = {
            'null': null, 'false': false, 'true': true,
            '0': 0, '1': 1,'NaN': NaN, 'Infinity': Infinity, '-Infinity': -Infinity,
            'array': [], 'array of length': ['index'],
            'object': {}, 'object of length': {key: 'value'}
        };
        var rightOptionalStringTypes = {
            'undefined': void 0,
            'empty string': '',
            'string of length': 'string'
        };
        var stringOptionsEmptyOrNot = ['url', 'username', 'password', 'code'];
        _.each(stringOptionsEmptyOrNot, function (stringOption) {
            describe('options.' + stringOption, function () {

                _.each(wrongOptionalStringTypes, function (wrongType, identifier) {
                    it('should error if option "' + stringOption + '" is ' + identifier, function () {
                        assert.throws(
                            function () {
                                var authOptions = {
                                    name: 'test'
                                };
                                authOptions[stringOption] = wrongType;
                                oauth(authOptions, cb);
                            },
                            new RegExp('Option ' + stringOption + ' must be a string')
                        );
                    });
                });

                _.each(rightOptionalStringTypes, function (rightType, identifier) {
                    it('should not error if option "' + stringOption + '" is ' + identifier, function () {
                        assert.doesNotThrow(function () {
                            oauth({
                                name: 'test',
                                username: rightType
                            }, cb);
                        });
                    });
                });

            });
        });

    });



    describe('promptValue', function () {
        it('should have a custom value on the prompt after successful input', function (done) {
            prompt = oauth.promptValue('custom', function () {
                assert.ok(_.has(prompt.answers, 'custom'));
                assert.equal(prompt.answers.custom, 'my-custom-value');
                done();
            });
            writeToPrompt(prompt, 'my-custom-value');
        });
        it('should send a custom value to the prompt callback after successful input', function (done) {
            prompt = oauth.promptValue('custom', function (err, custom) {
                assert.equal(custom, 'my-custom-value');
                done();
            });
            writeToPrompt(prompt, 'my-custom-value');
        });
    });

    // Normal use: asks for details.
    describe('promptUsername', function () {
        it.skip('should show message on empty username input', function () {
            // Need to be able to act on prompt error.
            // See inquirer/lib/prompts/base.js
        });
        it('should not error on username input', function (done) {
            // I don't think this test should exist unless we can test for
            // an error also.
            assert.doesNotThrow(function () {
                prompt = oauth.promptUsername(function (err, username) {
                    done();
                });
                writeUsername(prompt);
            });
        });
        it('should have a username on the prompt after successful input', function (done) {
            prompt = oauth.promptUsername(function () {
                assert.ok(_.has(prompt.answers, 'username'));
                assert.equal(prompt.answers.username, 'my-username');
                done();
            });
            writeToPrompt(prompt, 'my-username');
        });
        it('should send a username to the prompt callback after successful input', function (done) {
            prompt = oauth.promptUsername(function (err, username) {
                assert.equal(username, 'my-username');
                done();
            });
            writeToPrompt(prompt, 'my-username');
        });
    });

    describe('promptPassword', function () {
        it('should show message on empty password input', function () {
            // Need to be able to act on prompt error.
            // See inquirer/lib/prompts/base.js
        });
        it('should not error on password input', function (done) {
            // I don't think this test should exist unless we can test for
            // an error also.
            assert.doesNotThrow(function () {
                prompt = oauth.promptPassword(function (err, password) {
                    done();
                });
                writePassword(prompt);
            });
        });
        it('should have a password on the prompt after successful input', function (done) {
            prompt = oauth.promptPassword(function (err, password) {
                assert.ok(_.has(prompt.answers, 'password'));
                assert.equal(prompt.answers.password, 'my-password');
                done();
            });
            writeToPrompt(prompt, 'my-password');
        });
        it('should send a password to the prompt callback after successful input', function (done) {
            prompt = oauth.promptPassword(function (err, password) {
                assert.equal(password, 'my-password');
                done();
            });
            writeToPrompt(prompt, 'my-password');
        });
    });

    describe('prompt2FACode', function () {
        it('should show message on empty code input', function () {
            // Need to be able to act on prompt error.
            // See inquirer/lib/prompts/base.js
        });
        it('should not error on code input', function (done) {
            // I don't think this test should exist unless we can test for
            // an error also.
            assert.doesNotThrow(function () {
                prompt = oauth.prompt2FACode(function (err, code) {
                    done();
                });
                write2FACode(prompt);
            });
        });
        it('should have a code on the prompt after successful input', function (done) {
            prompt = oauth.prompt2FACode(function (err, code) {
                assert.ok(_.has(prompt.answers, 'code'));
                assert.equal(prompt.answers.code, '123456');
                done();
            });
            writeToPrompt(prompt, '123456');
        });
        it('should send a code to the prompt callback after successful input', function (done) {
            prompt = oauth.prompt2FACode(function (err, code) {
                assert.equal(code, '123456');
                done();
            });
            writeToPrompt(prompt, '123456');
        });
    });

    describe('saveBasicAuth', function () {
        it('should error when no parameters given', function () {
            assert.throws(function () {
                oauth.saveBasicAuth();
            });
        });
        it('should error when username not given', function () {
            assert.throws(function () {
                oauth.saveBasicAuth(null, 'password');
            });
        });
        it('should error when password not given', function () {
            assert.throws(function () {
                oauth.saveBasicAuth('username');
            });
        });
        it('should not error when username and password are given', function () {
            assert.doesNotThrow(function () {
                oauth.saveBasicAuth('username', 'password');
            });
        });
    });



    // Authentication test.
    describe('authentication', function () {

        it.skip('should error an authentication test with bad credentials when 2FA not required', function (done) {
            apiResponse.testAuth.no2FA.bad();
            prompt = run(function (err, res) {
                assert.throws(function () {
                    assert.ifError(err);
                });
                done();
            });
            writeUserPass(prompt);
        });
        it.skip('should error an authentication test with bad credentials when 2FA required', function (done) {
            apiResponse.testAuth.has2FA.bad();
            prompt = run(function (err, res) {
                assert.throws(function () {
                    assert.ifError(err);
                });
                done();
            });
            writeUserPass(prompt);
        });
        it.skip('should succeed an authentication test with good basic credentials', function (done) {
            apiResponse.testAuth.no2FA.good();
            prompt = run(function (err, res) {
                assert.doesNotThrow(function () {
                    assert.ifError(err);
                });
                done();
            });
            writeUserPass(prompt);
        });
        it.skip('should succeed an authentication test with good 2FA credentials', function (done) {
            apiResponse.testAuth.has2FA.good();
            prompt = run(function (err, res) {
                assert.doesNotThrow(function () {
                    assert.ifError(err);
                });
                done();
            });
            writeUserPass(prompt);
        });
    });



    // Token creation.
    it('should error when it cannot connect to the api');
    it('should explain when rate limit remaining is 0');
    it('should create and return a new token');
    it('should get and return an existing token by name');

});
