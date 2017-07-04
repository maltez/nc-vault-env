'use strict';

const _ = require('lodash');
const {exec} = require('child_process');

class Runner {
    /**
     * @param {string} exec
     * @param {string} cwd
     * @param {string} killSignal
     * @param {Object} logger
     * @param {Function} exit
     */
    constructor(exec, {cwd, killSignal, logger, exit}) {
        this.exec = exec;
        this.cwd = cwd;
        this.killSignal = killSignal;
        this.logger = logger;
        this.selfExit = exit;
    }

    /**
     * @param {Object} env
     * @returns {{stdout: *, stderr: *}}
     */
    run(env) {
        this.child = exec(this.exec, {env: _.extend({}, process.env, env), cwd: this.cwd});
        this.logger.info(
            'running %s (pid %s)',
            this.exec,
            this.child.pid
        );
        this.logger.debug('environment:\n%s', JSON.stringify(env, null, '\t'));

        this.child.on('exit', this.selfExit);

        return {
            stdout: this.child.stdout,
            stderr: this.child.stderr
        };
    }

    /**
     * @returns {Promise}
     */
    async stop() {
        return new Promise((resolve) => {
            this.logger.info('stopping');
            this.child.removeListener('exit', this.selfExit);
            this.child.on('exit', (code, signal) => resolve({code}));
            this.logger.debug('send signal %s for pid %s', this.killSignal, this.child.pid);
            this.child.kill(this.killSignal);
        });
    }
}

module.exports = Runner;