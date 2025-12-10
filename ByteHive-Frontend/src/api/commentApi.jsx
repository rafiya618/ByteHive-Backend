import axios from "axios";
import { getAuthHeader } from "./authHeader";

const API = axios.create({
  baseURL: import.meta.env.VITE_COMMENT_SERVICE_URL,
});

export const addComment = (commentPayload) =>
   API.post(`/comment/add`, commentPayload, { headers: getAuthHeader() });

export const getCommentsByPost = (postId, cursor, sortOrder = "latest") =>
  API.get(`/comment/all/${postId}`, {
    params: { cursor, limit: 5, sort: sortOrder },
    headers: getAuthHeader(),
  });

export const getcommentById = (commentId) =>
   API.get(`/comment/${commentId}`, { headers: getAuthHeader() });

export const getReplies = (postId, parentId) => 
  API.get(`/comment/replies`, { params: { postId, parentId }, headers: getAuthHeader() });

export const likeComment = (commentId, userId) => 
  API.post(`/comment/like`, { commentId, userId }, { headers: getAuthHeader() });

export const dislikeComment = (commentId, userId) => 
  API.post(`/comment/dislike`, { commentId, userId }, { headers: getAuthHeader() });

export const updateComment = (commentId, text) => 
  API.post(`/comment/update`, { commentId, text }, { headers: getAuthHeader() });

export const deleteComment = (commentId, receiverId) => 
  API.delete(`/comment/delete/${commentId}`, {
    params: { receiverId },
    headers: getAuthHeader(),
  });
