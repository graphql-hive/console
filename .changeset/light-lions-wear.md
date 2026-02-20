---
'hive': minor
---

Add experimental support for running without `supertokens` service.

## Instructions

### Prerequisites

Adjust your docker compose file like the following:
- Remove `services.supertokens` from your `docker-compose.community.yml` file
- Remove the following environment variables from the `services.server.environment`
  - `SUPERTOKENS_CONNECTION_URI=`
  - `SUPERTOKENS_API_KEY=`
- Set the following environment variables for `services.server.environment`
  - `SUPERTOKENS_AT_HOME=1`
  - `SUPERTOKENS_REFRESH_TOKEN_KEY=`
  - `SUPERTOKENS_ACCESS_TOKEN_KEY=`
- Set the following environment variables for `services.migrations.environment`
  - `SUPERTOKENS_AT_HOME=1`

### Set the refresh token key

#### Extract from existing `supertokens` deployment

This method works if you use supertokens before and want to have existing user sessions to continue working.
If you want to avoid messing with the database, you can also create a new refresh token key from scratch, the drawback is that users are forced to login again.

Extract the refresh token key from the supertokens database
```sql
SELECT "value" FROM "supertokens_key_value" WHERE "name" = 'refresh_token_key';
```
  
The key should look similar to this: `1000:15e5968d52a9a48921c1c63d88145441a8099b4a44248809a5e1e733411b3eeb80d87a6e10d3390468c222f6a91fef3427f8afc8b91ea1820ab10c7dfd54a268:39f72164821e08edd6ace99f3bd4e387f45fa4221fe3cd80ecfee614850bc5d647ac2fddc14462a00647fff78c22e8d01bc306a91294f5b889a90ba891bf0aa0`

Update the docker compose `services.server.environment.SUPERTOKENS_REFRESH_TOKEN_KEY` environment variable value to this string.

#### Create from scratch

Run the following command to create a new refresh key from scratch:

```sh
echo "1000:$(openssl rand -hex 64):$(openssl rand -hex 64)"
```

Update the docker compose `services.server.environment.SUPERTOKENS_REFRESH_TOKEN_KEY` environment variable value to this string.

### Set the access token key

Generate a new access token key using the following instructions:

```sh
# 1. Generate a unique key name. 'uuidgen' is great for this.
#    You can replace this with any string you like, e.g., KEY_NAME="my-app-key-1"
KEY_NAME=$(uuidgen)
# 2. Generate a 2048-bit RSA private key in PEM format, held in memory.
PRIVATE_KEY_PEM=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048)
# 3. Extract the corresponding public key from the private key, also held in memory.
PUBLIC_KEY_PEM=$(echo "$PRIVATE_KEY_PEM" | openssl rsa -pubout)
# 4. Strip the headers/footers and newlines from the private key PEM
#    to get just the raw Base64 data.
PRIVATE_KEY_DATA=$(echo "$PRIVATE_KEY_PEM" | awk 'NF {if (NR!=1 && $0!~/-----END/) print}' | tr -d '\n')
# 5. Do the same for the public key PEM.
PUBLIC_KEY_DATA=$(echo "$PUBLIC_KEY_PEM" | awk 'NF {if (NR!=1 && $0!~/-----END/) print}' | tr -d '\n')
# 6. Echo the final formatted string to the console.
echo "${KEY_NAME}|${PUBLIC_KEY_DATA}|${PRIVATE_KEY_DATA}"
```

Update the docker compose `services.server.environment.SUPERTOKENS_REFRESH_TOKEN_KEY` environment variable value to the formatted string output.

## Conclusion

After performing this updates you can run Hive Console without the need for the `supertokens` service. All the relevant authentication logic resides within the `server` container instead.

Existing users in the supertokens system will continue to exist when running without the `supertokens` service.
