# Friends, workspace invitations, and game sessions

Friend relationships and game participation are account-backed. An email is used only to find a registered account; friend lists and request responses expose a public name and optional course, never an email.

```mermaid
sequenceDiagram
  actor A as Student A
  actor B as Student B
  participant UI as Deep Notes UI
  participant API as Backend API
  participant DB as PostgreSQL

  A->>UI: Send friend request by exact email or public profile
  UI->>API: POST /me/friend-requests
  API->>DB: Insert pending friendship (pair is unique)
  API-->>UI: Neutral accepted response (202)
  B->>UI: Accept or reject from Friends page
  UI->>API: POST accept or DELETE pending request
  API->>DB: Change or remove pending friendship
  A->>UI: Open owner-only workspace invite
  UI->>API: POST /notebooks/:id/members with friendId and role
  API->>DB: Verify accepted relationship and add member
  A->>UI: Create duel or group session
  UI->>API: POST /notebooks/:id/sessions
  API->>DB: Save stable host ID and participants
  B->>UI: Join waiting session
  UI->>API: POST /notebooks/:id/sessions/:sid/join
  API->>DB: Add notebook member if session has capacity
  A->>UI: Start when at least two players are present
  UI->>API: POST /notebooks/:id/sessions/:sid/start
  API->>DB: Verify host and minimum player count
```

## Rules

- Unknown emails and valid registered emails receive the same friend-request acknowledgement. Requests are rate limited per account.
- A friend must accept before an owner can add that account by `friendId`. The owner can also add a registered exact email directly.
- Workspace membership grants game access. The session URL by itself does not grant access to a non-member.
- Duel and group sessions stay in the lobby until the session host starts them. The API requires at least two participants and caps a duel at two and a group at twelve.
- Solo sessions start immediately. Every session response includes `hostId`; the frontend does not infer host identity from live score order.
- The UI polls waiting/running sessions; real-time delivery uses polling until a websocket contract exists.
