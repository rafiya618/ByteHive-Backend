// Instruction Notes:
// - Loosely-coupled approach: fetch post data via Posts service APIs, not local schemas
import axios from "axios";
import { ENV } from "../../config/env.js";

export async function getPostLiteById(postId) {
  if (!ENV.POSTS_SERVICE_URL) return null;
  const url = `${ENV.POSTS_SERVICE_URL}/${encodeURIComponent(postId)}/lite`; // prefers /api/posts/:id/lite
  try {
    const { data } = await axios.get(url);
    const post = data?.post || data?.data || data; // be resilient to shape
    if (!post) return null;
    return { tags: post.tags || [], community: post.community || null };
  } catch (err) {
    console.error("[RE-service] getPostLiteById error:", err?.message || err);
    return null;
  }
}

export async function getPostTagsById(postId) {
  const lite = await getPostLiteById(postId);
  return lite?.tags || [];
}

export async function getCandidatesByFilters({ tags = [], communities = [], limit = 500, skip = 0 }) {
  if (!ENV.POSTS_SERVICE_URL) return [];
  const params = new URLSearchParams();
  if (tags.length) params.set("tags", tags.join(","));
  if (communities.length) params.set("community", communities[0]);
  params.set("limit", String(Math.min(limit, 500)));
  params.set("skip", String(skip));

  const url = `${ENV.POSTS_SERVICE_URL}/candidates?${params.toString()}`; // lightweight candidates
  try {
    const { data } = await axios.get(url);
    const list = data?.posts || data?.data || [];
    return list.map(p => ({
      _id: p._id,
      post_title: p.post_title,
      tags: p.tags || [],
      community: p.community || null,
      createdAt: p.createdAt || p.date,
    }));
  } catch (err) {
    console.error("[RE-service] getCandidatesByFilters error:", err?.message || err);
    return [];
  }
}
