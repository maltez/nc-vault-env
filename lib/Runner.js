'use strict';

const _ = require('lodash');
const {exec} = require('child_process');

class Runner {
    constructor(exec, {kill_signal, logger}) {
        this.exec = exec;
        this.killSignal = kill_signal;
        this.logger = logger;
    }

    run(env) {
        this.child = exec(this.exec, _.extend({}, process.env, env));
        this.logger.info(
            'running %s (pid %s)',
            this.exec,
            this.child.pid
        );
        this.logger.debug('environment:\n%s', JSON.stringify(env, null, '\t'));

        return {
            stdout: this.child.stdout,
            stderr: this.child.stderr
        };
    }

    stop() {
        // TODO
        if (!this.child) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.logger.info('stopping');
            this.child.on('exit', (code, signal) => resolve());

            this.logger.debug('send signal %s for pid %s', this.killSignal, this.child.pid);
            this.child.kill(this.killSignal);
        });
    }
}

module.exports = Runner;