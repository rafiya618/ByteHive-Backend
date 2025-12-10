import { useCallback } from "react";
import { retentionApi } from "../api/retentionApi";

/**
 * Custom hook for recording user activities to streak system
 * Usage: const recordActivity = useRecordActivity();
 *        recordActivity("read", { postId: "123" });
 */
export const useRecordActivity = () => {
  const recordActivity = useCallback(async (activityType, options = {}) => {
    try {
      const result = await retentionApi.recordActivity(activityType, options);
      return result;
    } catch (error) {
      console.error(`Failed to record ${activityType} activity:`, error);
      // Silently fail to not disrupt user experience
      return null;
    }
  }, []);

  return recordActivity;
};

export default useRecordActivity;
