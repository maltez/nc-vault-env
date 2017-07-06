# nc-vault-env

nc-vault-env provides a convenient way to populate secrets from Vault into a child process environment using the nc-vault-env daemon.

The daemon allows applications to be configured with secret variables, without having knowledge about the existence of Vault. This makes it especially easy to configure applications throughout all your environments: development, testing, production, etc.

nc-vault-env is inspired by envconsul in its simplicity, name, and function. The biggest difference here that nc-vault-env supports not only [token](https://www.vaultproject.io/docs/auth/token.html) authentication method but also an [AppRole](https://www.vaultproject.io/docs/auth/approle.html) & [AWS IAM](https://www.vaultproject.io/docs/auth/aws.html#iam-authentication-method).

**The documentation in this README corresponds to the master branch of the project. It may contain unreleased features or different APIs than the most recently released version. Please see the Git tag that corresponds to your version of envconsul for the proper documentation.**

## Install
```
npm install -g nc-vault-env
```

## Quick start

1. Put the following config to the `/config.json`
    ```json
    {
      "vault": {
        "address": "https://vault.example.com",
        "auth": {
          "type": "appRole",
          "config": {
            "role_id": "b2a7cfb9-d09a-49c4-9e9a-24127c6dbbf6"
          }
        }
      },
      "secrets": [
        {
          "path": "<%= env('MYENV') %>/mysql/main/creds/app_auth",
          "format": "DATABASE_<%= key %>"
        },
        {
          "path": "secret/some_secret",
          "format": "SECRET_<%= key %>"
        }
      ]
    }
    ```

1. Run
    ```bash
    $ MYENV=staging nc-vault-env -c /config.json -v debug command_for_run
    ```


