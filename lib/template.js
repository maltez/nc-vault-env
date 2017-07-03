'use strict';

const _ = require('lodash');

function env(variable) {
    if (process.env[variable] === undefined) {
        throw new Error(`Environment variable "${variable}" must be set.`);
    }

    return process.env[variable]
}

module.exports = function template(t) {
    return _.template(t, {
        imports: {env}
    });
};