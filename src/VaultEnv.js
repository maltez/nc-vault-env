'use strict';

const _ = require('lodash');
const VaultClient = require('node-vault-client');
const spawn = require('child_process').spawn;
const template = require('./template');

class VaultEnv {
    /**
     * @param {Object} spawn
     * @param {string} spawn.command
     * @param {Array} spawn.args
     * @param {Object} spawn.options
     * @param {Object} config
     * @param {string} [config.cwd]
     * @param {Object} config.logger
     * @param {Object} config.vault
     * @param {Array<Object>} config.secrets
     */
    constructor(spawn, config) {
        this.__spawn = spawn;
        this.__logger = config.logger;

        this.__config = template(_.pick(config, ['vault', 'secrets']));
        this.__child = null;
    }

    run() {
        this.__logger.debug('final config:\n%s', JSON.stringify(this.__config, null, '  '));
        return Promise.resolve()
            .then(() => this.__getEnv(this.__config.secrets))
            .then((env) => this.__exec(env));
    }

    /**
     *
     * @param signal
     */
    kill(signal) {
        if (!this.__child) {
            return;
        }

        this.__logger.debug(
            'send signal %s for pid %s',
            signal,
            this.__child.pid
        );

        this.__child.kill(signal);
    }

    /**
     * @private
     */
    __getEnv(secrets) {
        this.__logger.debug(
            `creating vault api client (%s)`,
            this.__config.vault.address
        );

        const vault = new VaultClient({
            api: {
                url: this.__config.vault.address
            },
            auth: this.__config.vault.auth,
            logger: this.__logger
        });

        return Promise.all(
            _.map(secrets, (secret) => {
                return vault
                    .read(secret.path)
                    .then((response) => secret.format(response.getData()))
            })
        ).then((values) => _.extend(...values))
    }

    /**
     * @private
     */
    __exec(env) {
        const child = this.__child = spawn(
            this.__spawn.command,
            this.__spawn.args,
            _.extend({}, this.__spawn.options, {env: _.extend({}, this.__spawn.options.env, env)})
        );

        this.__logger.info(
            'running command="%s" args="%s" (pid %s)',
            this.__spawn.command,
            this.__spawn.args.join(' '),
            child.pid
        );
        this.__logger.debug('environment:\n%s', JSON.stringify(env, null, '\t'));

        child.on('exit', this.__spawn.onExit);
        child.on('error', (error) => {
            this.__logger.error('child process error %s', error);
            this.__spawn.onExit(1);
        });

        return child;
    }
}

module.exports = VaultEnv;