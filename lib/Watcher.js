'use strict';

const Rx = require('rxjs');
const ms4human = require('./ms4human');
const delay = require('./delay');

class Watcher {
    constructor(secret, vault, {logger}) {
        this.secret = secret;
        this.vault = vault;
        this.logger = logger;

        // TODO: config
        this.retry = 5 * 1000;
        // TODO: config
        this.maxRetryAttempts = 3;
    }

    watch$() {
        this.logger.info(`creating watcher for ${this.secret.path}`);

        return Rx.Observable.create((stream$) => {
            const fn = async () => {
                let attempt = 0;
                for (; ;) {
                    try {
                        this.logger.debug(`starting fetch ${this.secret.path}`);
                        const v = await this.vault.read(this.secret.path);
                        stream$.next(v.getData());
                        const renew = v.__leaseDuration * 1000 / 2;
                        this.logger.debug(`fetched ${this.secret.path}`);
                        this.logger.debug(`sleeping for %s`, ms4human(renew));

                        // TODO: v.isRenewable()
                        await delay(renew);
                        attempt = 0;
                    }
                    catch (e) {
                        this.logger.error(
                            'error fetching secret: %s %s %s',
                            e.options.method,
                            e.options.uri,
                            e.message,
                        );
                        this.logger.info(
                            `retrying in %s (attempt %s)`,
                            ms4human(this.retry),
                            attempt
                        );

                        if (attempt > this.maxRetryAttempts) {
                            this.logger.fatal(
                                'Exceeded maximum number of retry attempts: %s',
                                this.maxRetryAttempts
                            );
                            throw e;
                        }

                        attempt++;
                        await delay(this.retry);
                    }
                }
            };

            fn().catch((reason) => stream$.error(reason));

            return () => {
                // TODO:
            };
        });
    }
}

module.exports = Watcher;