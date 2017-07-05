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
        imports: {env: env}
    });
}

module.exports = function (secret) {
    const tpl = template(secret.format);

    const format = (response) =>
        _.chain(response)
            .map((value, key) => [_.toUpper(tpl({key: key})), value])
            .fromPairs()
            .value();

    return {
        path: template(secret.path)(),
        format: format,
    };
};