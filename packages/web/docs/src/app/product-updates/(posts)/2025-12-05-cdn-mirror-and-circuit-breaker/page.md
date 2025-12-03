---
title: 'Enhanced CDN and Gateway Reliability'
description:
  Major improvements to our CDN infrastructure to ensure higher
  availability and resilience against outages.
date: 2025-12-05
authors: [laurin]
---

We understand that the reliability of our High-Availability CDN is critical for your production
GraphQL Gateway. Even a brief outage can have a significant impact.

To further enhance the resilience of our systems, we've introduced two major improvements to
mitigate potential outages of critical components for the Gateway.

### CDN Mirror for High Availability

We now operate a second CDN mirror, `cdn-mirror.graphql-hive.com`, built on AWS CloudFront. This
mirror serves as a complete replica of our primary Cloudflare-based CDN. In the event of an outage
with our main CDN, you can seamlessly switch to the mirror, ensuring your schemas and artifacts
remain available.

Our official SDKs have been updated to automatically handle this fallback when configured with both
endpoints.

### Circuit Breaker for Usage Reporting

Failures are inevitable. To gracefully handle transient issues with our usage reporting service,
we've implemented a Circuit Breaker pattern in our Hive SDKs and the Hive Gateway.

If the client detects a series of failed requests, it will temporarily stop sending new usage
reports. This prevents your services from being overwhelmed with failing requests and allows it to
run stable even if an outage affects our usage reporting system.

### Conclusion

These improvements are now available for the Hive JS SDK and JavaScript Hive Gateway. We will soon
also ship these improvements for the Hive Rust SDK, Hive Router and the Apollo Router Hive Plugin.

These updates are part of our ongoing commitment to providing a highly available and reliable schema
registry for your GraphQL APIs.

---

**Further reading:**

- [Running with Hive Console in Production: A High-Availability Guide](/docs/schema-registry/high-availability-resilence)
- [High-Availability CDN Documentation](/docs/schema-registry/high-availability-cdn)
- [Hive Client Configuration (including Circuit Breaker)](/docs/api-reference/client#circuitbreaker)
