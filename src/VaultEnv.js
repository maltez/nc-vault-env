'use strict';

const _ = require('lodash');
const VaultClient = require('node-vault-client');
const exec = require('child_process').exec;
const template = require('./template');

class VaultEnv {
    /**
     * @param {string} exec - command for execute
     * @param {Object} config
     * @param {string} [config.cwd]
     * @param {Object} config.logger
     * @param {Object} config.vault
     * @param {Array<Object>} config.secrets
     */
    constructor(exec, config) {
        this.exec = exec;
        this.vault = config.vault;
        this.cwd = config.cwd || process.cwd();
        this.logger = config.logger;

        this.secrets = _.map(config.secrets, (secret) => ({
            path: template(secret.path)(),
            format: (response) => {
                const tpl = template(secret.format);
                return _.chain(response)
                    .map((value, key) => [_.toUpper(tpl({key: key})), value])
                    .fromPairs()
                    .value();
            }
        }));
    }

    /**
     * @param {Function} onStop
     * @returns {Promise.<{stdout, stderr}>}
     */
    run(onStop) {
        this.logger.debug(
            `creating vault api client (%s)`,
            this.vault.address
        );

        const vault = new VaultClient({
            api: {
                url: this.vault.address
            },
            auth: this.vault.auth,
            logger: this.logger
        });

        return Promise.all(_.map(
            this.secrets,
            (secret) => vault.read(secret.path).then((response) => secret.format(response.getData()))))
            .then((values) => _.extend(...values))
            .then((env) => this._exec(env, onStop));
    }

    /**
     * @private
     */
    _exec(env, onStop) {
        const child = this._child = exec(
            this.exec,
            {env: _.extend({}, process.env, env), cwd: this.cwd}
        );

        this.logger.info(
            'running %s (pid %s)',
            this.exec,
            child.pid
        );
        this.logger.debug('environment:\n%s', JSON.stringify(env, null, '\t'));

        child.on('exit', onStop);

        return {
            stdout: child.stdout,
            stderr: child.stderr
        };
    }

    kill(signal) {
        this.logger.debug(
            'send signal %s for pid %s',
            signal,
            this._child.pid
        );

        this._child.kill(signal);
    }
}

module.exports = VaultEnv;