'use strict';

const _ = require('lodash');
const VaultClient = require('node-vault-client');
const spawn = require('child_process').spawn;
const template = require('./template');
const loggerFactory = require('./loggerFactory');

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
        this.__loggerOptions = config.loggerOptions;

        this.__config = template(_.pick(config, ['vault', 'secrets']));
        this.__child = null;
    }

    run() {
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
    __getVaultClient() {
        const vaultConfig = _.cloneDeep(this.__config.vault);
        this.__logger.debug(
            `creating vault api client (%s)`,
            vaultConfig.address
        );
        if (vaultConfig.auth.type === 'iam') {
            const AWS = require('aws-sdk');
            vaultConfig.auth.config.credentials = AWS.CredentialProviderChain.defaultProviders;
        }

        return new VaultClient({
            api:    {
                url: vaultConfig.address
            },
            auth:   vaultConfig.auth,
            logger: this.__loggerOptions ? loggerFactory(
                'Vault Env / Client',
                this.__loggerOptions.verbosity,
                this.__loggerOptions.format
            ) : this.__logger
        });
    }

    /**
     * @private
     */
    __getEnv(secrets) {
        const vault = this.__getVaultClient();

        return Promise.all(
            _.map(secrets, (secret) => {
                if (secret.folder) {
                    this.__logger.info('list path %s', secret.path);
                    return this.__getEnvsForFolder(vault, secret);
                }
                this.__logger.info('reading path %s', secret.path);
                return this.__getEnvsForPath(vault, secret);
            })
        ).then((values) => _.extend(...values))
    }

    /**
     * @private
     */
    __getEnvsForFolder(vault, secret) {
        return vault
            .list(secret.path)
            .then((response) => {
                return Promise.all(
                    response.getData().keys
                        .map((key) => vault
                            .read(`${secret.path}/${key}`)
                            .then((response) => [key, response.getData()])
                        )
                );
            })
            .then((folders) => {
                return secret.format(folders)
            })
    }

    /**
     * @private
     */
    __getEnvsForPath(vault, secret) {
        return vault
            .read(secret.path)
            .then((response) => secret.format(response.getData()));
    }

    /**
     * @private
     */
    __exec(env) {
        this.__logger.info('Variables passed to the process', _.extend({}, this.__spawn.options.env, _.mapValues(env, () => '****')));

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
