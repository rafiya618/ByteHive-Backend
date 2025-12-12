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
    inputs: [String],          // incoming base64 or URLs (to be uploaded)
    assets: [MediaAssetSchema] // final Cloudinary assets
  },
  { _id: false }
);

const PostSchema = new mongoose.Schema(
  {
    post_title: { type: String, required: true, trim: true },
    small_description: { type: String, maxlength: 220 },
    post_description: { type: String, required: true },
    category: { type: String, enum: ['blog', 'question'], required: true, index: true },
    tags: [{ type: String, index: true }],
    upvotes: [{ type: String }], 
    downvotes: [{ type: String }], 
    views: { type: Number, default: 0 },
    community: { type: String },
    comments: { type: Number, default: 0 }, // count only
    user_id: { type: String, required: true }, // from JWT in real app
    date: { type: Date, default: Date.now },
    read_time: { type: Number }, // computed by worker
    thumbnail: { type: String }, // fallback set by worker
    media: { type: MediaSchema, default: () => ({ inputs: [], assets: [] }) },
    status: { type: String, enum: ["pending", "ready"], default: "pending" }
  },
  { timestamps: true }
);

export default mongoose.model("Post", PostSchema);
