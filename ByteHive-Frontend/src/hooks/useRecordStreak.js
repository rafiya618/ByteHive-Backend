import { useCallback } from 'react';
import { recordActivity } from '../api/retentionApi';
import toast from 'react-hot-toast';

export const useRecordStreak = () => {
  const recordActivityAction = useCallback(async (activityType, postId = null, commentId = null, description = null) => {
    try {
      await recordActivity(activityType, postId, commentId, description);
      // Optionally show a subtle notification
      console.log(`Activity recorded: ${activityType}`);
    } catch (error) {
      console.error('Error recording activity:', error);
      // Don't show error toast for activity recording to avoid spam
    }
  }, []);

  const recordRead = useCallback((postId) => {
    return recordActivityAction('read', postId);
  }, [recordActivityAction]);

  const recordPost = useCallback((postId) => {
    return recordActivityAction('post', postId);
  }, [recordActivityAction]);

  const recordComment = useCallback((commentId, postId) => {
    return recordActivityAction('comment', postId, commentId);
  }, [recordActivityAction]);

  const recordLike = useCallback((postId) => {
    return recordActivityAction('like', postId);
  }, [recordActivityAction]);

  return {
    recordRead,
    recordPost,
    recordComment,
    recordLike,
    recordActivityAction
  };
};
