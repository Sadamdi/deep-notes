# F-21 Social feed

Status: implemented and tested (`backend/tests/feed.test.ts`).

Business rules
- BR-01 Any signed-in user can read the feed; posts are text (max 500 characters) with an optional attachment.
- BR-02 Only public workspaces can be attached, and only a finished session of the author can be shared as a result card. A workspace that later turns private shows as unavailable without any detail.
- BR-03 Likes are idempotent; comments max 300 characters; the commenter or the post author can delete a comment; only the author can delete a post.
- BR-04 Follow and unfollow; `scope=following` shows own posts plus followed people. Public profiles show name, course, counts, points and badges, never an email.
- BR-05 Posting and commenting are limited to 20 per 10 minutes per user. Cursor paging uses `before` and `nextBefore`.
- Not built: notifications, reposts, hashtags, moderation tools (report and block). Add moderation before opening the feed to people outside the pilot.
