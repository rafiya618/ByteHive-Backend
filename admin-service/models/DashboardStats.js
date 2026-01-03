import mongoose from "mongoose";

// Single-document store for dashboard counts
const DashboardStatsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "current" },
    totalUsers: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 },
    totalCommunities: { type: Number, default: 0 },
    totalReports: { type: Number, default: 0 }
  },
  { timestamps: true, versionKey: false }
);

DashboardStatsSchema.statics.getCurrent = async function () {
  return this.findById("current").lean();
};

DashboardStatsSchema.statics.upsertCounts = async function (counts = {}) {
  const update = {
    $set: {
      ...Object.fromEntries(
        Object.entries(counts).filter(([_, v]) => typeof v === "number")
      ),
      updatedAt: new Date()
    },
    $setOnInsert: { createdAt: new Date() }
  };

  return this.findByIdAndUpdate("current", update, { upsert: true, new: true, lean: true });
};

DashboardStatsSchema.statics.incrementCounts = async function (delta = {}) {
  const inc = Object.fromEntries(
    Object.entries(delta).filter(([_, v]) => typeof v === "number")
  );

  if (Object.keys(inc).length === 0) return this.findById("current").lean();

  return this.findByIdAndUpdate(
    "current",
    { $inc: inc, $setOnInsert: { createdAt: new Date() }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true, lean: true }
  );
};

const DashboardStats = mongoose.model("DashboardStats", DashboardStatsSchema);

export default DashboardStats;
