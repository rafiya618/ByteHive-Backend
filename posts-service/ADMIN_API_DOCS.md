# Admin Content Management API Documentation

## Overview
This API provides comprehensive content management functionality for administrators, following the same pattern as user and community management.

## Base URL
All endpoints are prefixed with: `/api/admin/posts`

## Status Enums
Posts use the following status values (enums):
- **pending_review** - Post is awaiting admin approval/rejection after QA validation
- **approved** - Post has been approved by admin
- **rejected** - Post has been rejected by admin

---

## 4.1 View All Posts

### Endpoint
```
GET /api/admin/posts
```

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10, max: 100) |
| community | string | Filter by community ID |
| category | string | Filter by category (blog, question) |
| status | string | Filter by status (pending_review, approved, rejected) |
| sortBy | string | Sort field (createdAt, date, views, comments, upvotes) |
| order | string | Sort order (asc, desc - default: desc) |

### Response
```json
{
  "ok": true,
  "data": [
    {
      "_id": "post_id_1",
      "post_title": "Understanding React Hooks",
      "author_id": "user_id_123",
      "date": "2025-12-28T10:30:00Z",
      "status": "approved",
      "category": "blog",
      "community": "community_id_1",
      "engagement_count": 245,
      "upvotes": 150,
      "downvotes": 5,
      "comments": 45,
      "views": 1200
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

### Example Requests
```bash
# Get all posts, page 1
curl "http://localhost:5001/api/admin/posts?page=1&limit=10"

# Filter by status and community
curl "http://localhost:5001/api/admin/posts?status=pending_review&community=tech&page=1"

# Search and filter by category
curl "http://localhost:5001/api/admin/posts?search=react&category=blog&sortBy=views&order=desc"
```

---

## 4.2 Filter Posts

### Filter by Community
```
GET /api/admin/posts?community=<community_id>&page=1&limit=10
```

### Filter by Category
```
GET /api/admin/posts?category=<blog|question>&page=1&limit=10
```

### Filter by Popular (Sort by Engagement)
```
GET /api/admin/posts/popular?limit=10&community=<optional>&category=<optional>
```

**Response**: Returns top posts by views

### Filter by New
```
GET /api/admin/posts/new?limit=10&community=<optional>&category=<optional>
```

**Response**: Returns newest posts first

---

## 4.3 Admin Actions

### 4.3.1 Approve Post

#### Endpoint
```
PUT /api/admin/posts/:postId/approve
```

#### Requirements
- Post must have status: `pending_review`
- Admin authorization required

#### Response
```json
{
  "ok": true,
  "message": "Post approved successfully",
  "post": {
    "_id": "post_id_1",
    "post_title": "Understanding React Hooks",
    "status": "approved",
    "user_id": "user_id_123"
  }
}
```

#### Side Effects
- Sets post status to `approved`
- Sends notification to post author (optional, non-blocking)

---

### 4.3.2 Reject Post

#### Endpoint
```
PUT /api/admin/posts/:postId/reject
```

#### Request Body
```json
{
  "reason": "Content violates community guidelines"
}
```

#### Requirements
- Post must have status: `pending_review`
- Admin authorization required

#### Response
```json
{
  "ok": true,
  "message": "Post rejected successfully",
  "post": {
    "_id": "post_id_1",
    "post_title": "Understanding React Hooks",
    "status": "rejected",
    "user_id": "user_id_123"
  }
}
```

#### Side Effects
- Sets post status to `rejected`
- Sends rejection notification to post author with reason

---

### 4.3.3 Delete Post

#### Endpoint
```
DELETE /api/admin/posts/:postId
```

#### Requirements
- Admin authorization required

#### Response
```json
{
  "ok": true,
  "message": "Post deleted successfully",
  "post": {
    "_id": "post_id_1",
    "post_title": "Understanding React Hooks",
    "user_id": "user_id_123"
  }
}
```

#### Side Effects
- Permanently deletes the post
- Sends deletion notification to post author

---

### 4.3.4 Edit Post (Title/Content)

#### Endpoint
```
PUT /api/admin/posts/:postId/edit
```

#### Request Body (all fields optional)
```json
{
  "post_title": "Updated Title",
  "post_description": "Updated content...",
  "small_description": "Updated summary"
}
```

#### Requirements
- Admin authorization required
- At least one field must be provided

#### Response
```json
{
  "ok": true,
  "message": "Post updated successfully",
  "post": {
    "_id": "post_id_1",
    "post_title": "Updated Title",
    "post_description": "Updated content...",
    "small_description": "Updated summary",
    "status": "approved"
  }
}
```

---

## Get Post Details

### Endpoint
```
GET /api/admin/posts/:postId
```

### Response
```json
{
  "ok": true,
  "post": {
    "_id": "post_id_1",
    "post_title": "Understanding React Hooks",
    "post_description": "Full post content...",
    "small_description": "Brief summary",
    "category": "blog",
    "status": "approved",
    "community": "community_id_1",
    "user_id": "user_id_123",
    "date": "2025-12-28T10:30:00Z",
    "views": 1200,
    "comments": 45,
    "upvotes_count": 150,
    "downvotes_count": 5,
    "engagement_count": 1400,
    "tags": ["react", "hooks", "javascript"]
  }
}
```

---

## Get Community Posts (Admin)

### Endpoint
```
GET /api/admin/posts/community/:communityId
```

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| status | string | Filter by status (optional) |
| category | string | Filter by category (optional) |

### Response
```json
{
  "ok": true,
  "data": [
    {
      "_id": "post_id_1",
      "post_title": "Post Title",
      "author_id": "user_id_123",
      "date": "2025-12-28T10:30:00Z",
      "status": "approved",
      "category": "blog",
      "engagement_count": 245
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

## Error Responses

### 404 Not Found
```json
{
  "ok": false,
  "message": "Post not found"
}
```

### 400 Bad Request
```json
{
  "ok": false,
  "message": "Only pending posts can be approved"
}
```

### 500 Server Error
```json
{
  "ok": false,
  "message": "Server error",
  "error": "Detailed error message"
}
```

---

## Authentication
- All endpoints require admin authorization via `adminAuth` middleware
- Admin token must be included in request headers

---

## Data Model

### Post Fields
```javascript
{
  _id: ObjectId,
  post_title: String,          // Required
  small_description: String,   // Optional, max 220 chars
  post_description: String,    // Required
  category: String,            // 'blog' or 'question'
  tags: [String],
  upvotes: [String],           // User IDs
  downvotes: [String],         // User IDs
  views: Number,
  comments: Number,
  community: String,           // Community ID
  user_id: String,             // Author ID
  date: Date,
  status: String,              // 'pending_review', 'approved', 'rejected'
  createdAt: Date,
  updatedAt: Date
}
```

---

## Implementation Details

### Features
✅ List all posts with advanced filtering
✅ Search by title, description, and summary
✅ Filter by community, category, and status
✅ Sort by engagement, views, comments, creation date
✅ Pagination support
✅ Approve pending posts
✅ Reject with reason
✅ Delete posts
✅ Edit title and content for corrections
✅ Popular posts ranking
✅ New posts listing
✅ Community-specific post management
✅ Engagement metrics (upvotes + downvotes + comments + views)
✅ User notifications on status changes

### Pattern Consistency
- Follows the same pattern as user and community management
- Consistent error handling and response format
- Cursor-free pagination (page/limit based)
- Admin authorization middleware
- Non-blocking notifications

