# Recommendation Engine (RE-service)

This service implements your requirements end-to-end over the shared ByteHive database (users, posts, communities).

What’s implemented (with code comments):
- Event logging: POST /track stores user interactions in InteractionLog (logs-only basis; no views).
- Batch processing: periodic profile building and trending computation (via node-cron).
- Summaries: per-user content and collaborative profiles.
- Ranking: candidate generation and scoring combining content, collaborative, trending, and freshness.
- Feed API: returns Recommendations, Trending, and Most Recent (based on user interest) for the frontend.
- Admin routes: trigger jobs and inspect generated profiles during testing.

## Configure
Create `RE-service/.env`:

```
MONGO_URI=mongodb+srv://<user>:<pass>@bytehive.xqmy3.mongodb.net/?retryWrites=true&w=majority&appName=ByteHive
PORT=7105
POSTS_SERVICE_URL=http://localhost:7101/api/posts
COMMUNITIES_SERVICE_URL=http://localhost:7103/api/communities
```

## Run

```
cd ByteHive-Backend/RE-service
npm install
npm run dev
```

## Test requests

1) Track events (logs):
```
curl -X POST http://localhost:7105/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<USER_ID>",
    "entityType": "post",
    "entityId": "<POST_ID>",
    "action": "read",
    "metadata": {"timeSpentSec": 35}
  }'
```

2) Build profiles (batch) and inspect:
```
curl -X POST http://localhost:7105/admin/rebuild-profiles
curl http://localhost:7105/admin/profile/<USER_ID>
```

3) Compute trending and fetch:
```
curl -X POST http://localhost:7105/admin/recompute-trending -H "Content-Type: application/json" -d '{"lookbackHours":72}'
curl http://localhost:7105/trending/posts
curl http://localhost:7105/trending/communities
```

4) Get feed (Recommendations + Trending + Most Recent):
```
curl http://localhost:7105/feed/<USER_ID>?limit=50
```

## MongoDB Atlas logs and settings
- Real-time logs: Atlas UI → Projects → Deployments → Databases → your cluster → Metrics → Logs.
- Slow query logs: Enable Profiler (Performance Advisor → Profiler) or set profiling level for your DB.
- Access rules: Network Access → allow your IP. Database Access → create DB user. Ensure `retryWrites=true`.
- Connection pool/timeout tuning can be set via Mongoose options if needed.

---
Notes: Trending is derived only from InteractionLog (no views field). Recency and action weights are applied. Ranking deliberately avoids regional/day-night context as requested.
