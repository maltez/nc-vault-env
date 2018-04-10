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

function templateSecret(secret) {
    const tpl = template(secret.format);

    if (_.isString(secret.key)) {
        return {
            path: template(secret.path)(),
            format: (response) => ({[secret.key]: tpl(response)})
        }
    }

    const format = (response) =>
        _.chain(response)
            .map((value, key) => [secret.upcase === undefined || secret.upcase === true ? _.toUpper(tpl({key: key})) : tpl({key: key}), value])
            .fromPairs()
            .value();

    return {
        path: template(secret.path)(),
        format: format,
    };
}

module.exports = function (config) {
    return {
        vault: JSON.parse(template(JSON.stringify(config.vault))()),
        secrets: _.map(config.secrets, (secret) => templateSecret(secret))
    };
};
