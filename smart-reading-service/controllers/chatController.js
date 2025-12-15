import { chatAboutWord as aiChatAboutWord } from '../helpers/aiHelper.js';

export async function chatAboutWord(req, res) {
  try {
    const { word, message } = req.body;

    if (!word || !message || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Word and message are required'
      });
    }

    console.log(`💬 Chatting about "${word}" with message: "${message}"`);

    const aiResponse = await aiChatAboutWord(word, message);

    res.status(200).json({
      success: true,
      data: {
        word,
        userMessage: message,
        aiResponse,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error in chatAboutWord:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message,
    });
  }
}