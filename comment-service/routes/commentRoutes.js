// import express from 'express';
// import {
//   addComment,
//   deleteComment,
//   dislikeComment,
//   getCommentsById,
//   getCommentsByPost,
//   getReplies,
//   likeComment,
//   updateComment
// } from '../controllers/commentController.js';

// const router = express.Router();

// router.post('/add', addComment);
// router.get('/replies', getReplies);
// router.post('/like', likeComment);
// router.post("/dislike", dislikeComment);
// router.post('/update', updateComment);
// router.get('/:commentId', getCommentsById);
// router.get('/all/:postId', getCommentsByPost);
// router.delete('/delete/:commentId', deleteComment);


// export default router;

import express from 'express';
import {
  addComment,
  deleteComment,
  dislikeComment,
  getCommentsById,
  getCommentsByPost,
  getReplies,
  likeComment,
  updateComment
} from '../controllers/commentController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add', verifyUser, addComment);
router.get('/replies', verifyUser, getReplies);
router.post('/like', verifyUser, likeComment);
router.post("/dislike", verifyUser, dislikeComment);
router.post('/update', verifyUser, updateComment);
router.get('/:commentId', verifyUser, getCommentsById);
router.get('/all/:postId', verifyUser, getCommentsByPost);
router.delete('/delete/:commentId', verifyUser, deleteComment);


export default router;