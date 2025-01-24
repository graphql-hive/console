---
'hive': minor
---

Emails Service: Debug log emails

When developing Hive, working on Emails service, it is useful to see the output of emails since they will not actually be sent in development.

Now when log level is set to debug, sent emails will be logged.

> [!CAUTION]
> Remember that we strongly recommend to disable debug logs in production for performance and security reasons.

### Example

#### Before

```
[15:19:52] INFO: Sending email to jason3kuhrt@me.com
[15:19:52] INFO: Email sent
```

#### After

```
[15:19:52] INFO: Sending email to jason3kuhrt@me.com
[15:19:52] DEBUG:
    event: "send_email"
    email: {
      "id": "{\"id\":\"org-invitation\",\"organization\":\"daedd972-df38-48c4-85c0-9ee566de9312\",\"code\":\"811fc5c94e2ebe608956079e75475ad0ec72fb3d9f2589aa1100fdbc57ec0d60\",\"email\":\"1d98be49fd18d4fa141b074bb085373e54817e39101319f81005b0e5cda73cb1\"}",
      "email": "jason3kuhrt@me.com",
      "subject": "You have been invited to join kuhrt",
      "body": "\n          <mjml>\n            <mj-body>\n              <mj-section>\n                <mj-column>\n                  <mj-image width=\"150px\" src=\"https://graphql-hive.com/logo.png\"></mj-image>\n                  <mj-divider border-color=\"#ca8a04\"></mj-divider>\n                  <mj-text>\n                    Someone from <strong>kuhrt</strong> invited you to join GraphQL Hive.\n                  </mj-text>.\n                  <mj-button href=\"http://localhost:3000/join/c1edaa5e8\">\n                    Accept the invitation\n                  </mj-button>\n                </mj-column>\n              </mj-section>\n            </mj-body>\n          </mjml>\n        "
    }
[15:19:52] INFO: Email sent
```
