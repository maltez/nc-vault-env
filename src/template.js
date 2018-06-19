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

/**
 * @typedef {Object} EnvSecretTemplateSimple
 * @property {String} key is env name
 * @property {String} path is template to generate path to secrets
 * @property {String} format for generating env value. Can use all secret keys as template variable.
 */

/**
 * @typedef {Object} EnvSecretTemplateGeneratedKeys
 * @property {String} path is template to generate path to secrets
 * @property {String} format for generating env value. Can use "key" variable
 * @property {Boolean} upcase for transform env names to uppercased ones
 */

/**
 * @typedef {EnvSecretTemplateGeneratedKeys} EnvSecretTemplateGeneratedKeysByFolder
 * @property {String} format for generating env value. Can use "key" and "folder" variable
 * @property {true} folder
 */

/**
 * @typedef {EnvSecretTemplateSimple|EnvSecretTemplateGeneratedKeys|EnvSecretTemplateGeneratedKeysByFolder} EnvSecretTemplateEnum
 */

/**
 * @param {EnvSecretTemplateEnum} secret
 * @return {{path: String, format: Function}}
 */
function templateSecret(secret) {
    const tpl = template(secret.format);

    if (_.isString(secret.key)) {
        return {
            path: template(secret.path)(),
            format: (response) => ({[secret.key]: tpl(response)})
        }
    }

    const transformName = secret.upcase === undefined || secret.upcase === true
      ? _.toUpper
      : _.identity;
    const getNameByKey = (key, folderName) => transformName(tpl({key: key, folder: folderName}));

    const format = (response, folderName) =>
        _.chain(response)
            .map((value, key) => [getNameByKey(key, folderName), value])
            .fromPairs()
            .value();

    if (!secret.folder) {
      return {
        path: template(secret.path)(),
        format: format
      };
    }
    return {
        path: template(secret.path)(),
        format(folders) {
          return _.extend(...(folders.map(([folder, secrets]) => format(secrets, folder))));
        },
        folder: true,
    };
}

/**
 * @param {Object} config
 * @param {Object} config.vault
 * @param {EnvSecretTemplateEnum[]} config.secrets
 * @return {{vault: any, secrets: Array}}
 */
module.exports = function (config) {
  return {
        vault: JSON.parse(template(JSON.stringify(config.vault))()),
        secrets: _.map(config.secrets, (secret) => templateSecret(secret))
    };
};
