'use strict';

const _ = require('lodash');
const Rx = require('rxjs');
const VaultClient = require('node-vault-client');
const log4js = require('log4js');
const Runner = require('./Runner');
const Watcher = require('./Watcher');
const Secret = require('./Secret');

class VaultEnv {
    constructor(exec, config) {
        this.exec = exec;
        this.config = config;
        this.secrets = _.map(
            config.secrets,
            ({path, format}) => new Secret(path, {format})
        );
    }

    getLogger(channel) {
        const logger = log4js.getLogger(channel);
        logger.setLevel(this.config.verbosity);
        return logger;
    }

    run() {
        const logger = this.getLogger('env_vault');

        logger.info(`creating vault api client`);
        logger.debug(`vault address: %s`, this.config.vault.address);
        logger.debug(`vault auth type: %s`, this.config.vault.auth.type);

        const vault = new VaultClient({
            api: {
                url: this.config.vault.address
            },
            auth: this.config.vault.auth,
            logger: this.getLogger('vault_client')
        });

        const watchers = _.map(
            this.secrets,
            (secret) => new Watcher(
                secret,
                vault,
                {logger: this.getLogger(`watcher secret(${secret.path})`)}
            )
        );

        let runner = new Runner(this.exec, {
            kill_signal: this.config.kill_signal,
            logger: this.getLogger('runner')
        });


        // TODO: unsubscribe
        const subscription = this.watch$(watchers, logger)
            .mergeMap((env) => runner.stop().then(() => env))
            .subscribe(
                (env) => {
                    const {stdout, stderr} = runner.run(env);
                    stdout.pipe(process.stdout);
                    stderr.pipe(process.stderr);
                },
                (error) => {
                    logger.error(error);
                    console.log('error', error)
                },
                () => {
                    logger.error('complete');
                    console.log('complete')
                }
            );

    }

    watch$(watchers, logger) {
        return Rx
            .Observable
            .combineLatest(
                _.map(
                    watchers,
                    (watcher) =>
                        watcher.watch$().map((response) => watcher.secret.parseResponse(response))))
            .map((values) => _.extend(...values))
            .debounceTime(1000)
            .distinctUntilChanged((v1, v2) => {
                const isEqual = _.isEqual(v1, v2);

                if (isEqual) {
                    logger.debug('environment was the same');
                }

                return isEqual;
            });
    }
}

module.exports = VaultEnv;