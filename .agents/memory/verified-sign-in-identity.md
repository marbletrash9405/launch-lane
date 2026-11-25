---
name: Verified sign-in identity
description: Why authorization must not depend on optional Clerk session email claims or public signup.
---

Resolve the authenticated Clerk subject's verified primary email on the server before making admin or guardian access decisions. Do not assume custom email or name claims are present in normal sessions.

**Why:** Real Google sign-in succeeded while every account endpoint returned 403 because the session lacked the optional email claim. Restarting after secret confirmation did not resolve that failure.

**How to apply:** Preserve verified-email ownership checks for every role. A configured founder signing in directly must be able to establish an application account without selecting a public signup role; other users still choose their role through signup.
