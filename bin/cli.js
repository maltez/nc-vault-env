#!/usr/bin/env node
'use strict';

const _ = require('lodash');
const commander = require('commander');
const path = require('path');
const loggerFactory = require('./../src/loggerFactory');
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
        /^(error|warn|info|debug|trace)$/i,
        'info'
    )
    .option(
        '-f, --log-format <format>',
        'logging format. "json" by default.',
        /^(json|text)$/i,
        'json'
    )
    .action((spawn, spawnArgs) => {
        const config = require(commander.config);

        const verbosity = commander.verbosity || config.verbosity;
        const format = commander.logFormat || config.logFormat;

        const logger = loggerFactory('Vault Env', verbosity, format);

        logger.info('version %s', VERSION);
        logger.info('verbosity "%s"', verbosity);

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
            _.extend({logger: logger, loggerOptions: {verbosity: verbosity, format: format}}, config)
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
                logger.error('Unhandled promise rejection. Reason: %s', reason);
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
