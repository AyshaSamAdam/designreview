export type Prompt = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  summary: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  scaleHints: string[];
  rubric: string[]; // PRIVATE: what a strong answer covers. Never send this to the browser.
};

export const prompts: Prompt[] = [
  {
    id: "url-shortener",
    title: "Design a URL shortener",
    difficulty: "easy",
    topics: ["databases", "caching", "id generation"],
    summary: "Turn long URLs into short links and redirect visitors to the original page.",
    functionalRequirements: [
      "Create a short link for a long URL",
      "Redirect a short link to its original URL",
      "Optional: custom aliases and expiry dates",
      "Optional: basic click counts",
    ],
    nonFunctionalRequirements: [
      "Redirects must be very fast",
      "The service must be highly available",
      "Two different URLs must never get the same short code",
      "Links keep working for years",
    ],
    scaleHints: [
      "About 100 million new links per month",
      "Reads outnumber writes about 100 to 1",
      "Links are kept for 5 years",
    ],
    rubric: [
      "Estimates traffic and storage: writes per second, reads per second, total links over 5 years",
      "Chooses a way to generate unique short codes (counter with base62, hash with collision handling, or a pre-generated key service) and explains the trade-offs",
      "Uses a read-optimized path: a cache for popular links in front of the database",
      "Picks a data store and explains why (lookup by short code suits a key-value model)",
      "Chooses a redirect status code (301 or 302) and explains the effect on caching and analytics",
      "Addresses availability and scaling: load balancer, stateless app servers, database replication or sharding",
      "Mentions expiry and cleanup, and abuse prevention such as rate limiting and malicious-URL checks",
    ],
  },
  {
    id: "rate-limiter",
    title: "Design a rate limiter",
    difficulty: "medium",
    topics: ["algorithms", "redis", "distributed systems"],
    summary: "Stop any client from sending too many requests in a short time.",
    functionalRequirements: [
      "Limit requests per client (by user, API key or IP address)",
      "Support different limits for different endpoints",
      "Tell rejected clients when they can try again",
      "Rules can change without redeploying the service",
    ],
    nonFunctionalRequirements: [
      "Adds very little delay to each request",
      "Works correctly when many servers handle traffic",
      "Decide what happens if the limiter's own storage fails (fail open or fail closed)",
      "Small inaccuracies in the counts are acceptable",
    ],
    scaleHints: [
      "1 million requests per second across the system",
      "10 million distinct clients",
      "Typical limit: 100 requests per minute per client",
    ],
    rubric: [
      "Explains where the limiter sits (gateway, middleware or separate service) and why",
      "Compares algorithms: fixed window, sliding window log, sliding window counter, token bucket, leaky bucket",
      "Uses a shared fast store (such as Redis) so every server sees the same counts",
      "Handles race conditions with atomic operations (for example a Lua script or atomic increments)",
      "Defines the response: HTTP 429 with a Retry-After header",
      "Decides fail open versus fail closed and justifies it",
      "Covers storing and updating rules, and scaling the limiter's store with sharding or replication",
    ],
  },
  {
    id: "chat-app",
    title: "Design a chat app",
    difficulty: "hard",
    topics: ["websockets", "messaging", "storage", "scaling"],
    summary: "One-to-one and group messaging in real time, like WhatsApp.",
    functionalRequirements: [
      "Send and receive messages in real time, one-to-one and in groups",
      "Show sent, delivered and read status",
      "Show who is online",
      "Deliver messages to people who were offline when they reconnect",
      "Optional: images and files",
    ],
    nonFunctionalRequirements: [
      "Messages reach online users in under a second",
      "Messages are never lost",
      "Messages in one conversation appear in the right order",
      "Millions of users connected at the same time",
    ],
    scaleHints: [
      "500 million users, 50 million online at once",
      "About 20 billion messages per day",
      "Groups of up to 500 members",
    ],
    rubric: [
      "Uses persistent connections (WebSockets) and explains how connections are tracked and routed across many servers",
      "Explains how a message travels from sender to recipient, including when they are on different servers",
      "Stores messages durably and handles offline users with an inbox or queue until they reconnect",
      "Describes delivery and read receipts with acknowledgements",
      "Handles ordering with per-conversation sequence numbers and avoids duplicates with idempotent retries",
      "Chooses storage for a write-heavy, time-ordered workload and explains sharding by conversation or user",
      "Covers group fan-out, presence, push notifications for offline users, and media through object storage and a CDN",
    ],
  },
];