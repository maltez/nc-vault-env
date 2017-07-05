'use strict';

const _ = require('lodash');
const VaultClient = require('node-vault-client');
const spawn = require('child_process').spawn;
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
        this.__execCommand = exec;
        this.__vault = config.vault;
        this.__cwd = config.cwd || process.cwd();
        this.__logger = config.logger;

        this.__secrets = _.map(config.secrets, (secret) => template(secret));

        this.__child = null;
    }

    /**
     * @param  stdout
     * @param {Function} onStop
     */
    run(stdout, onStop) {
        Promise.resolve()
            .then(() => this.__getEnv(this.__secrets))
            .then((env) => this.__exec(env, onStop, stdout));
    }

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
            this.__vault.address
        );

        const vault = new VaultClient({
            api: {
                url: this.__vault.address
            },
            auth: this.__vault.auth,
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
    __exec(env, onStop, stdout) {
        const argv = this.__execCommand.split(/\s+/);
        const command = argv[0];
        const args = argv.slice(1);

        const child = this.__child = spawn(
            command,
            args,
            {env: _.extend({}, process.env, env), cwd: this.__cwd}
        );

        this.__logger.info(
            'running %s (pid %s)',
            this.__execCommand,
            child.pid
        );
        this.__logger.debug('environment:\n%s', JSON.stringify(env, null, '\t'));

        child.on('exit', onStop);
        child.on('error', (error) => {
            this.__logger('child process error %s', error);
            onStop(1);
        });
        child.stdout.pipe(stdout);
    }
}

module.exports = VaultEnv;