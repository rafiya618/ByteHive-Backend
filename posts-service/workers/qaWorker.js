import { Worker, QueueEvents } from "bullmq";
import { redisConnection } from "../config/redis.js";
import Post from "../models/Post.js";
import { analyzePostContent } from "../services/geminiService.js";
import { ruleValidate } from "../services/ruleService.js";

const queueName = "qaJobs";
const concurrency = 3;

const processor = async (job) => {
  console.log("QA Job Started:", job.id);

  const { postId } = job.data;

  const post = await Post.findById(postId);
  if (!post) return { skipped: true, reason: "Post not found" };

  // 1. AI analysis
  const ai = await analyzePostContent(post);

  // 2. Rule validation
  const rule = ruleValidate(post);

  // 3. Final decision
  const passedQuality = ai.quality_score >= 0.6;
  const relevantEnough = ai.relevance_score >= 0.5;
  const hasNoViolations =
    !ai.violations.nsfw &&
    !ai.violations.hate_speech &&
    !ai.violations.violence &&
    rule.passed;

  let final_status;

  if (relevantEnough && passedQuality && hasNoViolations) {
    final_status = "approved"; // all good
  } else {
    final_status = "rejected"; // low quality or violations

  }

  // 4️⃣ Save QA results
  post.qa = {
    ai_analysis: ai,
    rule_validation: rule,
    final_status,
    validated_at: new Date()
  };

  post.status = final_status;

  await post.save();

  const passed = final_status === "approved";
  return { postId, passed };
};

export const worker = new Worker(queueName, processor, {
  connection: redisConnection,
  concurrency
});

const events = new QueueEvents(queueName, { connection: redisConnection });
events.on("completed", ({ jobId, returnvalue }) => {
  console.log(`QA Job ${jobId} completed`, returnvalue);
});
events.on("failed", ({ jobId, failedReason }) => {
  console.error(`QA Job ${jobId} failed: ${failedReason}`);
});
