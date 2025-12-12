import { useState, useEffect, useCallback } from "react";
import { getMeaning, searchBlogs, chatAboutWord, simplifyPost } from "../../api/smartReadingApi";
import { recordActivity } from "../../api/retentionApi";
import toast from "react-hot-toast";

const TextSelectionPopup = ({ selectedText, onClose }) => {
  const [activeTab, setActiveTab] = useState("meaning");
  const [showContent, setShowContent] = useState(false);
  const [meaningData, setMeaningData] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loadingMeaning, setLoadingMeaning] = useState(false);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState(selectedText);
  const [chatMessages, setChatMessages] = useState([]);
  const [simplifiedContent, setSimplifiedContent] = useState(null);
  const [loadingSimplify, setLoadingSimplify] = useState(false);
  const [showSimplifyDialog, setShowSimplifyDialog] = useState(false);
  const [simplifyView, setSimplifyView] = useState("original"); // "original" or "simplified"

  // Clear chat messages when selected text changes
  useEffect(() => {
    setChatMessages([]);
    setSearchQuery(selectedText + " ");
  }, [selectedText]);

  const fetchMeaning = useCallback(async () => {
    const cacheKey = `meaning_${selectedText.split(" ")[0]}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const cacheExpiry = 60 * 60 * 1000; // 1 hour in milliseconds

        if (cacheAge < cacheExpiry) {
          setMeaningData(data);
          setLoadingMeaning(false);
          return;
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch (error) {
        console.warn('Error parsing cached meaning:', error);
        localStorage.removeItem(cacheKey);
      }
    }

    try {
      setLoadingMeaning(true);
      const word = selectedText.split(" ")[0];
      const data = await getMeaning(word);
      setMeaningData(data);

      // Cache the result
      const cacheData = {
        data: data,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Record word meaning activity
      try {
        await recordActivity('word_meaning', null, null, `Looked up meaning of: ${word}`);
      } catch (err) {
        console.warn('Failed to record word_meaning activity:', err);
      }
    } catch (error) {
      console.error("Error fetching meaning:", error);
      toast.error("Failed to fetch meaning");
      // Set placeholder data
      setMeaningData({
        word: selectedText.split(" ")[0],
        definition: "Definition not available. Please try another word.",
        partOfSpeech: "unknown",
      });
    } finally {
      setLoadingMeaning(false);
    }
  }, [selectedText]);

  const fetchRelatedBlogs = useCallback(async () => {
    const cacheKey = `relatedBlogs_${selectedText}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const cacheExpiry = 60 * 60 * 1000; // 1 hour in milliseconds

        if (cacheAge < cacheExpiry) {
          setRelatedBlogs(data);
          setLoadingBlogs(false);
          return;
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch (error) {
        console.warn('Error parsing cached blogs:', error);
        localStorage.removeItem(cacheKey);
      }
    }

    try {
      setLoadingBlogs(true);
      const blogs = await searchBlogs(selectedText);
      setRelatedBlogs(blogs);

      // Cache the result
      const cacheData = {
        data: blogs,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error fetching related blogs:", error);
      setRelatedBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  }, [selectedText]);

  const handleOutsideClick = useCallback((e) => {
    if (!e.target.closest('.popup-content')) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    setShowContent(true);
    // Fetch meaning and related blogs when popup opens - removed to make instant
  }, [selectedText, fetchMeaning, fetchRelatedBlogs]);

  // Fetch meaning when meaning tab is active
  useEffect(() => {
    if (activeTab === "meaning") {
      fetchMeaning();
    }
  }, [activeTab, fetchMeaning]);

  // Fetch related blogs when blogs tab is active
  useEffect(() => {
    if (activeTab === "blogs") {
      fetchRelatedBlogs();
    }
  }, [activeTab, fetchRelatedBlogs]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setLoadingBlogs(true);

      // Get AI response
      const chatResponse = await chatAboutWord(selectedText.split(" ")[0], searchQuery);
      console.log('Chat response received:', chatResponse);

      // Handle different response structures
      let aiContent = '';
      if (typeof chatResponse === 'string') {
        aiContent = chatResponse;
      } else if (chatResponse && chatResponse.aiResponse) {
        aiContent = chatResponse.aiResponse;
      } else if (chatResponse && typeof chatResponse === 'object') {
        // Check for structured response
        if (chatResponse.summary || chatResponse.keyPoints) {
          aiContent = chatResponse; // Keep the object structure
        } else {
          // Try to find the response in any property
          aiContent = chatResponse.response || chatResponse.message || chatResponse.content || JSON.stringify(chatResponse);
        }
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiContent,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);

      // Also search for blogs
      const blogs = await searchBlogs(searchQuery);
      setRelatedBlogs(blogs);
      setActiveTab("search");
      setSearchQuery(selectedText + " "); // Reset to selected word + space for next input

      // Record search activity
      try {
        await recordActivity('search', null, null, `Searched: ${searchQuery}`);
      } catch (err) {
        console.warn('Failed to record search activity:', err);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed");
    } finally {
      setLoadingBlogs(false);
    }
  };

  const handleSimplify = async () => {
    try {
      setLoadingSimplify(true);
      // For now, we'll simplify the selected text itself
      // In a real implementation, you'd get the full post content
      const simplified = await simplifyPost("temp-post-id", selectedText, "detailed");
      setSimplifiedContent(simplified);
      setShowSimplifyDialog(true);
    } catch (error) {
      console.error("Error simplifying:", error);
      toast.error("Simplification failed");
    } finally {
      setLoadingSimplify(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [handleOutsideClick]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      style={{ display: showContent ? 'block' : 'none' }}
    >
      <div
        className="popup-content fixed bg-navbar-bg border border-navbar-border rounded-xl shadow-2xl w-96 max-w-sm 
             top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      >

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-navbar-border">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-periwinkle">auto_fix_high</span>
            <h3 className="font-semibold text-white">Smart Lookup</h3>
          </div>
          <button
            onClick={onClose}
            className="text-periwinkle hover:text-white p-1 rounded-lg hover:bg-periwinkle-light transition-colors"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Selected Text Display */}
        <div className="p-4 bg-rich-black-light border-b border-navbar-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-periwinkle text-sm font-semibold mb-1">Selected Text:</p>
              <div className="min-h-8 flex items-center">
                {loadingSimplify ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin">
                      <span className="material-icons text-periwinkle">hourglass_top</span>
                    </div>
                    <span className="text-periwinkle text-sm">Simplifying...</span>
                  </div>
                ) : (
                  <p className="text-white italic">
                    "{simplifyView === "simplified" && simplifiedContent
                      ? simplifiedContent.simplifiedContent
                      : selectedText}"
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleSimplify}
              disabled={loadingSimplify}
              className="bg-celadon text-rich-black px-3 py-2 rounded-lg hover:bg-celadon-dark transition-colors font-semibold text-sm disabled:opacity-50 ml-3"
            >
              {loadingSimplify ? "Simplifying..." : "Simplify"}
            </button>
          </div>

          {/* View Toggle Buttons */}
          {simplifiedContent && !loadingSimplify && (
            <div className="flex space-x-2">
              <button
                onClick={() => setSimplifyView("original")}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${simplifyView === "original"
                  ? "bg-periwinkle text-rich-black"
                  : "bg-rich-black text-periwinkle border border-periwinkle hover:bg-periwinkle-light"
                  }`}
              >
                Original
              </button>
              <button
                onClick={() => setSimplifyView("simplified")}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${simplifyView === "simplified"
                  ? "bg-periwinkle text-rich-black"
                  : "bg-rich-black text-periwinkle border border-periwinkle hover:bg-periwinkle-light"
                  }`}
              >
                Simplified
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-navbar-border">
          <button
            onClick={() => setActiveTab("meaning")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "meaning"
              ? "text-white bg-medium-slate-blue"
              : "text-periwinkle hover:bg-periwinkle-light"
              }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="material-icons text-lg">book</span>
              <span>Meaning</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "search"
              ? "text-white bg-medium-slate-blue"
              : "text-periwinkle hover:bg-periwinkle-light"
              }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="material-icons text-lg">search</span>
              <span>Search</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("blogs")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "blogs"
              ? "text-white bg-medium-slate-blue"
              : "text-periwinkle hover:bg-periwinkle-light"
              }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="material-icons text-lg">article</span>
              <span>Blogs</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 max-h-80 overflow-y-auto">
          {activeTab === "meaning" && (
            <div className="space-y-4">
              {loadingMeaning ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <span className="material-icons">hourglass_top</span>
                  </div>
                  <span className="ml-2 text-periwinkle">Loading definition...</span>
                </div>
              ) : meaningData ? (
                <>
                  <div>
                    <h4 className="text-periwinkle font-semibold text-lg mb-2">
                      {meaningData.word}
                      {meaningData.partOfSpeech && (
                        <span className="text-sm font-normal ml-2 text-celadon">
                          {meaningData.partOfSpeech}
                        </span>
                      )}
                    </h4>
                    {meaningData.pronunciation && (
                      <p className="text-periwinkle/80 text-sm mb-3">
                        {meaningData.pronunciation}
                      </p>
                    )}
                    <p className="text-white leading-relaxed">
                      {meaningData.definition}
                    </p>
                    {meaningData.examples && meaningData.examples.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-periwinkle text-xs font-semibold">Examples:</p>
                        {meaningData.examples.slice(0, 2).map((example, idx) => (
                          <p key={idx} className="text-white/80 text-sm italic">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                    {meaningData.synonyms && meaningData.synonyms.length > 0 && (
                      <div className="mt-3">
                        <p className="text-periwinkle text-xs font-semibold mb-1">Synonyms:</p>
                        <p className="text-white/80 text-sm">
                          {meaningData.synonyms.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>

                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-periwinkle/60">Unable to fetch definition</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "search" && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const selectedWord = selectedText.split(" ")[0];
                    const newValue = e.target.value;

                    // Allow free typing, but ensure the input always starts with the selected word
                    if (newValue.trim() === "" || !newValue.toLowerCase().includes(selectedWord.toLowerCase())) {
                      // If empty or doesn't contain selected word, reset to selected word + space
                      setSearchQuery(selectedWord + " ");
                    } else {
                      // Allow the input as-is, but ensure it starts with selected word
                      const startsWithWord = newValue.toLowerCase().startsWith(selectedWord.toLowerCase());
                      if (!startsWithWord) {
                        // Prepend the selected word if it's not at the beginning
                        setSearchQuery(selectedWord + " " + newValue);
                      } else {
                        setSearchQuery(newValue);
                      }
                    }
                  }}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-rich-black-light border border-navbar-border rounded-lg px-4 py-3 text-white placeholder-periwinkle focus:outline-none focus:border-periwinkle"
                  placeholder="Type your question..."
                />
                <button
                  onClick={handleSearch}
                  disabled={loadingBlogs}
                  className="absolute right-3 top-3 text-periwinkle hover:text-white disabled:opacity-50"
                >
                  <span className="material-icons">send</span>
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {loadingBlogs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin">
                      <span className="material-icons">hourglass_top</span>
                    </div>
                    <span className="ml-2 text-periwinkle">Thinking...</span>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-rich-black-light border border-navbar-border text-white">
                          <div className="space-y-2">
                            {(() => {
                              const content = message.content;

                              // Handle structured object content
                              if (typeof content === 'object' && content !== null) {
                                return (
                                  <>
                                    {content.summary && (
                                      <div className="text-sm leading-relaxed mb-2 font-medium">
                                        {content.summary}
                                      </div>
                                    )}
                                    {content.keyPoints && Array.isArray(content.keyPoints) && content.keyPoints.length > 0 && (
                                      <ul className="space-y-1">
                                        {content.keyPoints.map((point, idx) => (
                                          <li key={idx} className="text-sm flex items-start">
                                            <span className="text-periwinkle mr-2">•</span>
                                            <span>{point}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {/* Fallback if object but empty props */}
                                    {!content.summary && !content.keyPoints && (
                                      <p className="text-sm">{JSON.stringify(content)}</p>
                                    )}
                                  </>
                                );
                              }

                              const lines = String(content).split('\n');
                              const summaryLines = [];
                              const bulletPoints = [];

                              let inSummary = false;
                              let inBullets = false;

                              for (const line of lines) {
                                const trimmed = line.trim();
                                if (trimmed.match(/^\d+\./) && !inSummary && !inBullets) {
                                  // Start of summary (numbered lines)
                                  inSummary = true;
                                  summaryLines.push(trimmed.replace(/^\d+\.\s*/, ''));
                                } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                                  // Bullet point
                                  inSummary = false;
                                  inBullets = true;
                                  bulletPoints.push(trimmed.replace(/^[-•]\s*/, ''));
                                } else if (inSummary && trimmed) {
                                  summaryLines.push(trimmed);
                                }
                              }

                              return (
                                <>
                                  {summaryLines.length > 0 && (
                                    <div className="text-sm leading-relaxed mb-2">
                                      {summaryLines.map((line, idx) => (
                                        <p key={idx} className="mb-1">{line}</p>
                                      ))}
                                    </div>
                                  )}
                                  {bulletPoints.length > 0 && (
                                    <ul className="space-y-1">
                                      {bulletPoints.map((point, idx) => (
                                        <li key={idx} className="text-sm flex items-start">
                                          <span className="text-periwinkle mr-2">•</span>
                                          <span>{point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {summaryLines.length === 0 && bulletPoints.length === 0 && (
                                    <p className="text-sm">{content}</p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}

                    {chatMessages.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-periwinkle/60 text-sm">
                          Start a conversation about "{selectedText.split(" ")[0]}"
                        </p>
                        <p className="text-periwinkle/40 text-xs mt-1">
                          The selected word is preserved in your questions
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "blogs" && (
            <div className="space-y-4">
              <h4 className="text-periwinkle font-semibold mb-3">Related Articles</h4>
              {loadingBlogs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <span className="material-icons">hourglass_top</span>
                  </div>
                  <span className="ml-2 text-periwinkle">Loading articles...</span>
                </div>
              ) : relatedBlogs && relatedBlogs.length > 0 ? (
                <>
                  {relatedBlogs.map((blog, index) => (
                    <div
                      key={index}
                      className="bg-rich-black-light rounded-lg p-3 border border-navbar-border hover:border-periwinkle transition-colors cursor-pointer hover:bg-rich-black-light/80"
                    >
                      <h5 className="text-white font-semibold text-sm mb-2">
                        {blog.title}
                      </h5>
                      <p className="text-periwinkle/80 text-xs mb-2">
                        {blog.snippet || "No description available"}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-celadon text-xs">{blog.readTime}</span>
                        <span className="material-icons text-periwinkle text-sm">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  ))}

                  <button className="w-full bg-periwinkle text-rich-black py-2 px-4 rounded-lg hover:bg-periwinkle-dark transition-colors font-semibold">
                    View All Related
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-periwinkle/60">
                    No related articles found for "{selectedText}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Simplify Dialog */}
      {showSimplifyDialog && simplifiedContent && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-navbar-bg border border-navbar-border rounded-xl shadow-2xl w-96 max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-navbar-border">
              <h3 className="font-semibold text-white">Simplified Content</h3>
              <button
                onClick={() => setShowSimplifyDialog(false)}
                className="text-periwinkle hover:text-white p-1 rounded-lg hover:bg-periwinkle-light transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h4 className="text-periwinkle font-semibold mb-2">Key Takeaways:</h4>
                  <ul className="space-y-1">
                    {simplifiedContent.keyTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="text-white text-sm flex items-start">
                        <span className="text-celadon mr-2">•</span>
                        {takeaway}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-periwinkle font-semibold mb-2">Simplified Text:</h4>
                  <p className="text-white text-sm leading-relaxed">
                    {simplifiedContent.simplifiedContent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextSelectionPopup;