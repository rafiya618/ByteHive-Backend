import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const relatedBlogSchema = new Schema(
  {
    keyword: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    relatedPosts: [
      {
        postId: String,
        id: String,
        title: String,
        snippet: String,
        readTime: String,
        relevanceScore: Number,
        thumbnail: String,
        author: String,
      },
    ],
    searchCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

relatedBlogSchema.index({ keyword: 1 });
export const RelatedBlog = model('RelatedBlog', relatedBlogSchema);
