'use strict';

const _ = require('lodash');

/**
 * @param {string} variable
 */
function env(variable) {
    if (process.env[variable] === undefined) {
        throw new Error(`Environment variable "${variable}" must be set.`);
    }

    return process.env[variable]
}

/**
 * @param {string} tpl
 * @returns {Function}
 */
function template(tpl) {
    return _.template(tpl, {
        imports: {env}
    });
}

module.exports = template;