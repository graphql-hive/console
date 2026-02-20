# Supertokens Implementation Notes

This file contains some useful information regarding the supertokens implementation.

## OIDC/Social Provider Login Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend App
    participant Backend Server
    participant OIDC Provider

    Browser->>Frontend App: 1. User clicks "Login with Google/GitHub/etc."

    Frontend App->>Backend Server: 2. Requests the provider's authorization URL (e.g., GET /auth/oidc/authorization-url)
    note right of Backend Server: The backend generates and stores a<br/>`state` value and a `pkce_verifier`<br/> for security. The `code_challenge`<br/>(derived from the verifier) is part of the URL.

    Backend Server-->>Frontend App: 3. Responds with the unique authorization URL

    Frontend App->>Browser: 4. Redirects the browser to the OIDC Provider's URL

    Browser->>OIDC Provider: 5. User logs in with their credentials and grants consent to your application

    OIDC Provider->>Browser: 6. Redirects back to your app's callback URL with an `authorization_code` and the `state` value

    Browser->>Frontend App: 7. The Frontend App loads, capturing the `code` and `state` from the URL parameters

    Frontend App->>Backend Server: 8. Sends the `authorization_code` and `state` to the backend callback endpoint (e.g., POST /auth/oidc/callback)
    note right of Backend Server: The backend first validates that the received `state`<br/>matches the one it stored earlier to prevent CSRF attacks.

    Backend Server->>OIDC Provider: 9. Exchanges the `code` for tokens (includes `code`, `client_secret`, and the original `pkce_verifier`)

    OIDC Provider-->>Backend Server: 10. Verifies the request and returns an `access_token` and `id_token`

    Backend Server->>OIDC Provider: 11. Uses the `access_token` to request the user's identity from a `/userinfo` endpoint

    OIDC Provider-->>Backend Server: 12. Returns the user's profile information (e.g., email, name, ID)
    note right of Backend Server: The backend now has trusted information about the user.

    Backend Server->>Backend Server: 13. Finds an existing user or creates a new one in its database and creates a new session

    Backend Server-->>Frontend App: 14. Responds with success and attaches the session cookies (`sAccessToken`, `sRefreshToken`) to the response

    Frontend App->>Browser: 15. The login is complete. The browser now stores the session cookies, and the user is authenticated within your application.
```

## Refresh Session Flow

```mermaid
graph TD
    subgraph Session Refresh Flow
        A[POST /auth/session/refresh] --> B{Extract Refresh Token from Cookie};
        B --> E{Verify Refresh Token Signature & Expiry};
        E -- Invalid --> F[Clear Cookies & 401 Unauthorized];
        E -- Valid --> G{Extract Session Handle from Token};
        G --> H{Fetch Session from Store};
        H -- Not Found --> F;
        H -- Found --> I(Validate Session);
    end

    subgraph Validate Session Sub-Flow
        I --> I1{Is Provided Refresh Token the LATEST one for this session?};
        I1 -- No (Old token was used) --> I2[TOKEN THEFT DETECTED];
        I2 --> I3[Revoke all sessions for this user & Clear Cookies];
        I1 -- Yes --> J{Generate New Access Token};
    end

    subgraph Token Generation and Response
      J --> K{"Generate New Refresh Token (Token Rotation)"};
      K --> L{Update Session in Store with new token hash};
      L --> M{Set New Tokens in Cookies};
      M --> N[200 OK];
    end
```

### Refresh Session Security

This section goes a bit into detail on how token theft is prevented.

The mechanism relies on a "chained" or "linked" token system, where each new refresh token is
cryptographically linked to the one that came before it. The server only needs to store a single
hash to validate the entire chain.

#### The Key Components

1.  **The Refresh Token Payload**: When a new refresh token is created, it contains a special field
    called `parentRefreshTokenHash1`. This field holds a SHA256 hash of the _previous_ refresh token
    that was used. The very first refresh token in a session will not have this field.

2.  **The Session Store (Database)**: The server does not store the raw refresh tokens. Instead, for
    each session, it stores a value called `refreshTokenHash2`. This is the hash of the **latest and
    currently valid** refresh token that has been issued to the client.

#### The Validation Process

When a client sends a request to `/auth/session/refresh`, the server performs the following checks,
which you can see in the `supertokens-at-home.ts` file around lines 499-509:

```ts
if (
  !payload.parentRefreshTokenHash1 &&
  sha256(sha256(refreshToken)) !== session.refreshTokenHash2
) {
  req.log.debug('The refreshTokenHash2 does not match (first refresh).');
  return unsetAuthCookies(rep).status(404).send();
}

if (
  payload.parentRefreshTokenHash1 &&
  session.refreshTokenHash2 !== sha256(payload.parentRefreshTokenHash1)
) {
```

##### Scenario 1: The Very First Refresh

- **Condition**: The incoming refresh token's payload **does not** contain a
  `parentRefreshTokenHash1`.
- **Action**: The server knows this must be the original refresh token created at login. To verify
  it, it performs a double SHA256 hash on the raw token (`sha256(sha256(refreshToken))`) and
  compares it to the `refreshTokenHash2` stored in the session.
- **Result**: If they match, the token is valid. If not, the request is rejected.

##### Scenario 2: All Subsequent Refreshes

- **Condition**: The incoming refresh token's payload **does** contain a `parentRefreshTokenHash1`.
- **Action**: This is the crucial step for detecting token reuse. The server takes the
  `parentRefreshTokenHash1` from the payload, hashes it once
  (`sha256(payload.parentRefreshTokenHash1)`), and compares it to the `refreshTokenHash2` from the
  session store.
- **Result**:
  - **Match**: This proves that the token used to generate the _current_ token was the latest one
    known to the server. The session is valid.
  - **Mismatch**: This is the **token theft** scenario. It means that the `refreshTokenHash2` in the
    database is newer than the one being presented. This can only happen if an older, already used
    token has been submitted. The request is immediately rejected.

### The "Rotation": Updating the Hash

If the validation is successful, the server generates a _new_ refresh token and then immediately
updates the session in the database. The `refreshTokenHash2` is replaced with a new hash derived
from the refresh token that was just used.

This ensures that for the next refresh cycle, only the newly issued refresh token will be considered
valid, continuing the chain and maintaining security.
