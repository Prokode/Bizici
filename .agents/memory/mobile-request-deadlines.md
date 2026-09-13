---
name: Mobile request deadlines
description: Scope deadlines to short reads rather than all shared API traffic
---
Use opt-in deadlines for short mobile reads; do not impose a short global timeout on the shared API client.

**Why:** The same client handles base64 photos, KYC uploads, and AI processing that can legitimately take longer on mobile networks. A fetch promise also resolves at headers, not after body consumption.

**How to apply:** Keep cancellation/deadlines active through token acquisition and response-body parsing. Test delayed bodies and caller cancellation, not just delayed headers.