'use strict';

const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai');
const Runner = require('../src/Runner');

const expect = chai.expect;
chai.use(require('sinon-chai'));

async function delay(ms) {
    return new Promise((resolve) => _.delay(resolve, ms));
}

const nullLogger = _.fromPairs(
    _.map(['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'], (level) => [level, _.noop])
);

describe('Runner', function () {
    this.timeout(10 * 1000);
    this.slow(5 * 1000);

    it('should run child process', async function () {
        return new Promise((resolve) => {
            let out = '';

            const runner = new Runner('bash ./loop.sh --exit_code 0 --max_count 3 --sleep 1', {
                cwd: __dirname,
                killSignal: 'SIGTERM',
                logger: nullLogger,
                exit(code) {
                    expect(out).to.match(/LOOP/);
                    expect(code).to.equal(0);
                    resolve();
                }
            });

            const {stdout} = runner.run({});

            stdout.on('data', (buffer) => out += buffer.toString())

        });
    });

    it('should run child process with specified env', async function () {
        return new Promise((resolve) => {
            const env = `_ENV_${Math.floor(Math.random() * 1000)}`;
            let out = '';

            const runner = new Runner('bash ./loop.sh --print_env 1', {
                cwd: __dirname,
                killSignal: 'SIGTERM',
                logger: nullLogger,
                exit() {
                    expect(out).to.match(new RegExp(`${env}=1`, 'g'));
                    resolve();
                }
            });

            const {stdout} = runner.run({
                [env]: 1
            });

            stdout.on('data', (buffer) => out += buffer.toString())
        });
    });

    it.skip('should stop child process with specified signal', async function () {
        const runner = new Runner('bash ./loop.sh --exit_code 1 --max_count 100 --sleep 1', {
            cwd: __dirname,
            killSignal: 'SIGQUIT',
            logger: nullLogger,
            exit() {

            }
        });

        const {stdout} = runner.run();

        let out = '';
        stdout.on('data', (buffer) => out += buffer.toString());

        await delay(1000);
        const {code} = await runner.stop();
        await delay(1000);

        expect(out).to.match(/receive\ssignal\sSIGQUIT/);
        expect(code).to.equal(1)
    });
});