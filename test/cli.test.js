const spawn = require('child_process').spawnSync;
const path = require('path');
const chai = require('chai');
const expect = chai.expect;

describe('VaultEnv CLI', function () {
    it('Should print help', function () {
        const child = spawn(
            'node',
            ['bin/cli.js', '--help'],
            {cwd: path.join(__dirname, '..')}
        );

        expect(child.status).to.equal(0);
        expect(child.stdout.toString()).to.match(/Usage:\n\s+\$\snc-vault-env/);
    });
});