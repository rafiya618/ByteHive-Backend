import { Meaning } from '../models/Meaning.js';
import { getMeaningFromAI } from '../helpers/aiHelper.js';

export async function getMeaning(req, res) {
  try {
    const { word } = req.query;

    if (!word || word.trim().length === 0) {
      return res.status(400).json({ error: 'Word parameter is required' });
    }

    const cleanWord = word.trim().toLowerCase();
    console.log(`🔍 Looking up meaning for: "${cleanWord}"`);

    // Check database first
    let meaning = await Meaning.findOne({ word: cleanWord });

    if (meaning) {
      console.log('✅ Found meaning in database');
      // Increment search count
      meaning.searchCount += 1;
      await meaning.save();
    } else {
      console.log('🔄 Generating meaning from AI');
      const aiMeaning = await getMeaningFromAI(cleanWord);

      // Save to database for future use
      meaning = new Meaning({
        word: cleanWord,
        definition: aiMeaning.definition,
        pronunciation: aiMeaning.pronunciation,
        partOfSpeech: aiMeaning.partOfSpeech,
        examples: aiMeaning.examples || [],
        synonyms: aiMeaning.synonyms || [],
        antonyms: aiMeaning.antonyms || [],
        source: 'ai_generated',
        searchCount: 1,
      });

      await meaning.save();
      console.log('💾 Meaning saved to database');
    }

    res.status(200).json({
      success: true,
      data: {
        word: meaning.word,
        definition: meaning.definition,
        pronunciation: meaning.pronunciation,
        partOfSpeech: meaning.partOfSpeech,
        examples: meaning.examples,
        synonyms: meaning.synonyms,
        antonyms: meaning.antonyms,
      },
    });
  } catch (error) {
    console.error('❌ Error in getMeaning:', error);
    res.status(500).json({
      error: 'Failed to fetch meaning',
      message: error.message,
    });
  }
}

export async function searchMeanings(req, res) {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`🔎 Searching meanings for: "${query}"`);

    const meanings = await Meaning.find({
      $or: [
        { word: { $regex: query, $options: 'i' } },
        { definition: { $regex: query, $options: 'i' } },
      ],
    })
      .limit(10)
      .sort({ searchCount: -1 });

    res.status(200).json({
      success: true,
      count: meanings.length,
      data: meanings,
    });
  } catch (error) {
    console.error('❌ Error in searchMeanings:', error);
    res.status(500).json({
      error: 'Failed to search meanings',
      message: error.message,
    });
  }
}
