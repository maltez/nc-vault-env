# nc-vault-env

[![npm version](https://badge.fury.io/js/nc-vault-env.svg)](https://www.npmjs.com/package/nc-vault-env)

This package provides a convenient way to launch a subprocess with environment variables populated from Vault.

## How it works?

This tool fetches specified secrets then run your app with environment variables that contain secrets.
Also, propagate received signals to subprocess.

## Getting started[.](#getting_started)

#### Install Vault CLI
1. Vault install [hashi-corp-vault](https://www.vaultproject.io/downloads.html)
1. Verifying the Installation `vault -v`. It should return response like: 
    ```bash
    Vault v0.10.1 ('756fdc..................31a6f119cd')
    ```

1. Configure Vault CLI
    We need to setup following environment variable:
    
    ```bash
    export VAULT_ADDR=https://vault.devops.namecheap.net
    export VAULT_TOKEN=$(cat ~/.vault-token)
    ```
1. Run command to sign in into Vault server
    
    ```bash
    vault auth -method=ldap username=<your_AD_username>
    ```
    
    Input your AD password then
    
    Expected response looks like this
    
    ```bash
    Success! You are now authenticated. The token information displayed below
    is already stored in the token helper. You do NOT need to run "vault login"
    again. Future Vault requests will automatically use this token.
    
    Key                    Value
    ---                    -----
    token                  <token>
    token_accessor         <token>
    token_duration         768h
    token_renewable        true
    token_policies         [default <roles>]
    token_meta_policies    default,<team>
    token_meta_username    <your_username>
    ```

#### Installation of nc-vault-env
1. Install  npm package
    NPM Package: [nc-vault-env](https://www.npmjs.com/package/nc-vault-env)
    `nc-vault-env` written in nodejs, so you need to install suitable versions.
    It currently has been tested with `6.x` and `8.x`.

    ```bash
    npm install -g nc-vault-env
    ```

1. Create config.json
    In working directory you create config.json file

    ```js
    {
      "vault": {
        "address": "<%= env('VAULT_ADDR') %>",
        // Use type: "token" for config local environment
        "auth": {
        "type": "token",
        "config": {
           "token": "<%= env('VAULT_TOKEN') %>"
        },
       // Use type: "iam" for working with AWS 
       "auth": {
          "type": "iam",
          "mount": "<%= env('<VAULT_AWS_AUTH_MOUNT>') %>",
          "config": {
            "role": "<%= env('ENVIRONMENT') %>",
            "iam_server_id_header_value": "<%= env('VAULT_ADDR') %>"
          }
      },
      {
          // For Node.js 
          // Configuration for class
          // ENV=prod
          "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/config",
          "format": "<%= value %>",
          "upcase": true
      },
      "secrets": [
      {
          // Secret for .NET Connection string looks like: 
          "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/mysql",
          "format": "server=<%= env('DATABASE_HOST') %>;port=<%= env('DATABASE_PORT') %>;database=<%= env('DATABASE_NAME') %>;uid=<%= username %>;pwd=<%= password %>",,
          "key": "ConnectionString"
        },
        {
          // For ASP.NET CORE 2
          // Configuration for class
          // public class MyConfiguration
          // {
          //    public string Key {get;set;}
          //}
          "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/config",
          "format": "<%= key %>",
        },
        {
          // For ASP.NET CORE 2
          // Configuration for class
          // public class MyConfiguration
          // {
          //    public string Secret1 {get;set;}
          //    public string Secret2 {get;set;}
          // }
          // /secret/team/env/my_config
          //  { 
          //     "Secret1": "foo",
          //     "Secret2": "bar"
          //  }
          // BE AWARE: Keys from secrets has to equal to Name of configuration properties.
          "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/config",
          "format": "<%= key %>",
        },
        {
          // For ASP.NET CORE 2
          // Configuration for class
          // public class MyConfiguration
          // {
          //   public ItemClass Item { get; set; }
          // } 
          // public class ItemClass
          // {
          //    public string SubItem { get; set; }
          // }
          "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/config",
          "format": "<%= value %>",
          "key": "item__subitem",
        }
      ]
  }
    ```
1. Dockerfile
    For correct work in dockerfile you need 
    ```docker
    RUN apt-get update \
        && apt-get install -y build-essential curl \
        && curl -sL https://deb.nodesource.com/setup_8.x | bash - \
        && apt-get install -y nodejs \
        && npm install -g nc-vault-env \
        && rm -rf /var/lib/apt/lists/*

    COPY vault-env.conf.json .
    ENTRYPOINT ["./entrypoint.sh"]
    CMD ["run"]
    ```
1. Run Application
    Without nc-vault-env run application by command 
    ```bash
      exec ./app.sh
    ```
    With installed nc-vault-env
    ```bash
      exec nc-vault-env -c ./vault-env.conf.json ./app.sh
    ```
1. ...PROFIT...

## CLI

Options:

| option           | description                                                                              |
|------------------|------------------------------------------------------------------------------------------|
| -c, --config     | path to configuration file.                                                              |
| -v, --verbosity  | verbosity level. Supported "error", "warn", "info", "debug", "trace". Default is "info". |
| -f, --log-format | logging format. Supported "json" and "text". Default is "json".                          |

## Configuration File API

Configuration files are written in json.

```js
{
  // This denotes the start of the configuration section for Vault.
  "vault": {
    // This is the address of the Vault. The protocol (http(s)) portion
    // of the address is required.
    //
    // Like this: https://vault.devops.namecheap.net
    "address": "<%= env('VAULT_ADDR') %>",

    // This part related to authentication configuration
    "auth": {

      // Supported auth types:
      // * token - see https://www.vaultproject.io/docs/auth/token.html
      // * iam - see https://www.vaultproject.io/docs/auth/aws.html#iam-auth-method
      // * appRole - see https://www.vaultproject.io/docs/auth/approle.html
      "type": "token",

      // Auth backend configuration

      // token:
      // It can be suitable to debugging locally
      //
      // "config": {
      //   "token": "<%= env('VAULT_TOKEN') %>"
      // }

      // iam:
      // It is preferred way to run within aws
      //
      // "config": {
      //  "role": "my_awesome_api",
      //  "iam_server_id_header_value": "<%= env('VAULT_ADDR') %>"
      // }

      // appRole:
      //
      // "config": {
      //  "role_id": "b2a7cfb9-d09a-49c4-9e9a-24127c6dbbf6"
      // }

      "config": {
        // ...
      }
    }
  },

  // This specifies a secret in Vault to fetch.
  "secrets": [
    // * key templating
    //
    // secret like this:
    // {
    //   "username": "awesome",
    //   "password: "securePa$$word"
    // }
    //
    // should produce multiple environment variables like this:
    // RMQ_USERNAME="awesome"
    // RMQ_PASSWORD="securePa$$word"
    //
    // Note that names will be uppercased.
    {
      "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/rmq",
      "format": "RMQ_<%= key %>",

      // This tells vault-env to convert environment variable keys to uppercase (which is more common and a bit more standard).
      // optional, by default is true
      "upcase": true
    },
    // There are two different behaviours:

    // * value templating
    //
    // secret like this:
    // {
    //   "username": "awesome",
    //   "password: "securePa$$word"
    // }
    //
    // should produce environment variable like this:
    // ConnectionString="user id=awesome;password=securePa$$word"
    {
      // path to secret
      "path": "secret/my_awesome_team_namespace/<%= env('ENVIRONMENT') %>/mssql",
      // value template
      "format": "user id=<%= username %>;password=<%= password %>",
      // env variable to populate
      "key": "ConnectionString"
    }
  ]
}
```

## Templating

Templating based on [Lodash template function](https://lodash.com/docs/#template).

Predefined functions:

| fn  | description                               | usage                      |
|-----|-------------------------------------------|----------------------------|
| env | provides access to environment variables. | <%= env('VAULT_ADDR') %>   |
|     |                                           |                            |

## Troubleshooting

For debugging purpose you can run this locally using you vault token (token auth backend).
This way assumes that you have access to all of your app's secrets.

Please be aware that debug or trace log level prints secret to stdout, so be careful with enable this level on real environment.

```bash
cat config.json
# {
#   "vault": {
#     "address": "<%= env('VAULT_ADDR') %>",
#     "auth": {
#       "type": "token",
#       "config": {
#         "token": "<%= env('VAULT_TOKEN') %>"
#       }
#     }
#   },
#   ...
# }
export VAULT_ADDR=https://vault.devops.namecheap.net
export VAULT_TOKEN=$(cat ~/.vault-token)
nc-vault-env -c config.json -f text -v trace -- run_my_app.sh
```
