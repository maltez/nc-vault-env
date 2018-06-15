## New version release
To relese new version of package use the following steps:
```
$ npm version [major | minor | patch]
# Review last commit
$ git push && git push --tags
$ npm publish
```


## Local experiments

1. `docker-compose up -d`
2. `docker-compose exec vault-client sh`
3. `vault kv put secret/data password=pass**123 login=jack_sparrow`
4. `docker-compose exec nc-vault-env bash`
5. `node bin/cli.js -c ./config.json -- printenv`

PROFIT

Raw API calls
```bash
curl \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    --request LIST \
    "$VAULT_ADDR/v1/auth/token/accessors"
curl \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    --request GET \
    "$VAULT_ADDR/v1/auth/token/lookup-self"
```
