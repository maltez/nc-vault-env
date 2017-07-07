#!/usr/bin/env node
'use strict';

const _ = require('lodash');
const commander = require('commander');
const path = require('path');
const winston = require('winston');
const VaultEnv = require('../src/VaultEnv');
const pkg = require('../package.json');

const VERSION = pkg.version;

commander
    .version(VERSION)
    .arguments('<spawn> [spawnArgs...]')
    .option(
        '-c, --config <path>',
        'path to config file',
        (v) => path.resolve(v)
    )
    .option(
        '-v, --verbosity <level>',
        'level of verbosity. "info" by default.',
        /^(error|warn|info|verbose|debug|silly)$/i,
        'info'
    )
    .action((spawn, spawnArgs) => {
        const config = require(commander.config);

        const logger = new winston.Logger({
            level: config.verbosity || commander.verbosity,
            levels: {
                error: 0,
                warn: 1,
                info: 2,
                debug: 3,
                trace: 4,
            },
            transports: [
                new winston.transports.Console({
                    formatter(options) {
                        return `(Vault Env) [${_.upperCase(options.level)}] - ${options.message}`;
                    }
                })
            ]
        });

        logger.info('version %s', VERSION);

        const vaultEnv = new VaultEnv(
            {
                command: spawn,
                args: spawnArgs,
                options: {
                    env: process.env,
                    stdio: 'inherit'
                },
                onExit(code, signal) {
                    logger.info(
                        'child process has finished execution. code=%s signal=%s',
                        code === null ? 'None' : code,
                        signal === null ? 'None' : signal
                    );
                    const parentCode = code === null ? 1 : code;
                    logger.info('exiting with code=%s', parentCode);
                    process.exit(parentCode);
                }
            },
            _.extend({logger: logger}, config)
        );

        _.each([
            'SIGHUP',
            'SIGTERM',
            'SIGINT',
            'SIGQUIT',
            'SIGUSR1',
            'SIGUSR2'
        ], (signal) => {
            process.on(signal, () => {
                logger.info('receive %s signal.', signal);
                vaultEnv.kill(signal);
            });
        });

        vaultEnv
            .run()
            .catch((reason) => {
                logger.error('Unhandled promise rejection: %s', reason.message);
                process.exit(1);
            });
    })
    .on('--help', function () {
        console.log();
        console.log('  Usage:');
        console.log('    $ nc-vault-env --verbosity debug -c ./config.json command_for_run');
        console.log('    $ nc-vault-env --verbosity info -c ./config.json -- bash -c "echo Hello, Bash!"');
        console.log();
    })
    .parse(process.argv);
