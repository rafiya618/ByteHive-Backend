import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";
import app from "./app.js";
import { startScheduler } from "./jobs/scheduler.js";

connectDB().then(() => {
  app.listen(ENV.PORT, () => {
    console.log(`Recommendation Service running on ${ENV.PORT}`);
  });
  // Start periodic batch processing
  startScheduler();
});
