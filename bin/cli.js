#!/usr/bin/env node
'use strict';

const commander = require('commander');
const path = require('path');
const VaultEnv = require('../lib/VaultEnv');
const _ = require('lodash');

commander
    .version('0.1.0')
    .arguments('<exec>')
    .option(
        '-c, --config <path>',
        'Config file',
        (v) => path.resolve(v)
    )
    .option(
        '-v, --verbosity <level>',
        'Level of verbosity',
        /^(trace|debug|info|warn|error|fatal)$/i,
        'warn'
    )
    .option(
        '--kill_signal <signal>',
        'Kill signal to send to child process. Defaults to SIGTERM but can be one of SIGHUP,SIGTERM,SIGINT,SIGQUIT,SIGUSR1,SIGUSR2',
        /^(SIGHUP|SIGTERM|SIGINT|SIGQUIT|SIGUSR1|SIGUSR2)$/,
        'SIGTERM'
    )
    .parse(process.argv);

const exec = commander.args.join(' ');
const config = require(commander.config);

const vaultEnv = new VaultEnv(
    exec,
    _.extend(config, _.pick(commander, ['verbosity', 'kill_signal']))
);

vaultEnv.run();