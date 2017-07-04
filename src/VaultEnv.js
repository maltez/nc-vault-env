'use strict';

const _ = require('lodash');
const VaultClient = require('node-vault-client');
const Runner = require('./Runner');
const Secret = require('./Secret');

class VaultEnv {
    /**
     * @param {string} exec - command for execute
     * @param {Object} config
     * @param {string} [config.cwd]
     * @param {Object|Function} config.logger
     * @param {Object} config.vault
     * @param {Array<Object>} config.secrets
     * @param {killSignal} config.killSignal
     */
    constructor(exec, {cwd, logger, vault, secrets, killSignal}) {
        this.exec = exec;
        this.secrets = _.map(
            secrets,
            ({path, format}) => new Secret(path, {format})
        );
        this.killSignal = killSignal;
        this.vault = vault;
        this.cwd = cwd || process.cwd();
        this.loggerFactory = _.isFunction(logger) ? logger : () => logger;
    }

    /**
     * @param {Function} exit
     * @returns {Promise.<{stdout, stderr}>}
     */
    async run(exit) {
        const logger = this.loggerFactory();

        logger.info(
            `creating vault api client (%s)`,
            this.vault.address
        );

        const vault = new VaultClient({
            api: {
                url: this.vault.address
            },
            auth: this.vault.auth,
            logger: (channel) => this.loggerFactory(channel ? `vault_client/${channel}` : 'vault_client')
        });


        const runner = this.runner = new Runner(this.exec, {
            killSignal: this.killSignal,
            logger: this.loggerFactory('runner'),
            cwd: this.cwd,
            exit: exit
        });

        return Promise.all(_.map(this.secrets, async (secret) =>
            vault.read(secret.path).then((response) => secret.parseResponse(response.getData()))))
            .then((values) => _.extend(...values))
            .then((env) => runner.run(env));
    }

    /**
     * @returns {Promise}
     */
    async stop() {
        return this.runner.stop()
    }
}

module.exports = VaultEnv;