// Instruction Notes:
// - Loosely-coupled approach: fetch community data via Communities service APIs, not local schemas
import axios from "axios";
import { ENV } from "../../config/env.js";

export async function getCommunityTagsById(communityId) {
  if (!ENV.COMMUNITIES_SERVICE_URL) return [];
  const url = `${ENV.COMMUNITIES_SERVICE_URL}/${encodeURIComponent(communityId)}/lite`; // prefers /api/communities/:id/lite
  const { data } = await axios.get(url);
  const community = data?.community || data?.data || data;
  return community?.community_tags || [];
}
