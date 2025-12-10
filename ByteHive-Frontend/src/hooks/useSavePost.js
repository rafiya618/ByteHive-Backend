import { useState, useEffect, useCallback } from 'react';
import { savePost, checkSavedStatus } from '../api/curationApi';

export const useSavePost = (postId) => {
  const [isSaved, setIsSaved] = useState(false);
  const [category, setCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await checkSavedStatus(postId);
        setIsSaved(response.isSaved);
        setCategory(response.category);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      checkStatus();
    }
  }, [postId]);

  const toggleSave = useCallback(async (category) => {
    try {
      setIsLoading(true);
      if (isSaved) {
        await savePost(postId); // Without category to unsave
        setIsSaved(false);
        setCategory(null);
      } else {
        await savePost(postId, category);
        setIsSaved(true);
        setCategory(category);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [postId, isSaved]);

  const updateCategory = useCallback(async (newCategory) => {
    try {
      setIsLoading(true);
      await savePost(postId, newCategory);
      setCategory(newCategory);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  return {
    isSaved,
    category,
    isLoading,
    error,
    toggleSave,
    updateCategory
  };
};