import mongoose from "mongoose";

const MediaAssetSchema = new mongoose.Schema(
  {
    url: String,
    public_id: String,
    type: { type: String, enum: ["image", "video", "other"], default: "image" }
  },
  { _id: false }
);

const MediaSchema = new mongoose.Schema(
  {
    inputs: [String],
    assets: [MediaAssetSchema]
  },
  { _id: false }
);

const QASchema = new mongoose.Schema(
  {
    ai_analysis: { type: Object, default: {} },          // AI quality + moderation result
    rule_validation: { type: Object, default: {} },     // Rule-based checks
    final_status: { type: String, default: "pending" }, // qa outcome
    validated_at: { type: Date }
  },
  { _id: false }
);

const PostSchema = new mongoose.Schema(
  {
    post_title: { type: String, required: true, trim: true },
    small_description: { type: String, maxlength: 220 },
    post_description: { type: String, required: true },

    category: {
      type: String,
      enum: ['blog', 'question'],
      required: true,
      index: true
    },

    tags: [{ type: String, index: true }],
    upvotes: [{ type: String }],
    downvotes: [{ type: String }],
    views: { type: Number, default: 0 },
    community: { type: String },

    comments: { type: Number, default: 0 },
    user_id: { type: String, required: true },
    date: { type: Date, default: Date.now },

    read_time: { type: Number },
    thumbnail: { type: String },

    media: {
      type: MediaSchema,
      default: () => ({ inputs: [], assets: [] })
    },

    status: {
      type: String,
      enum: ["pending", "ready", "failed_validation"],
      default: "pending_validation"
    },

    qa: { type: QASchema, default: () => ({}) }   // ✅ merged QA block
  },
  { timestamps: true }
);

export default mongoose.model("Post", PostSchema);
