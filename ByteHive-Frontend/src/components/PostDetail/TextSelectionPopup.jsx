import { useState, useEffect } from "react";
import { getMeaning, searchBlogs } from "../../api/smartReadingApi";
import toast from "react-hot-toast";

const TextSelectionPopup = ({ position, selectedText, onClose }) => {
  const [activeTab, setActiveTab] = useState("meaning");
  const [showContent, setShowContent] = useState(false);
  const [meaningData, setMeaningData] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loadingMeaning, setLoadingMeaning] = useState(false);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState(selectedText);
  const [aiResponse, setAiResponse] = useState("");

  useEffect(() => {
    setShowContent(true);
    // Fetch meaning and related blogs when popup opens
    fetchMeaning();
    fetchRelatedBlogs();
  }, [selectedText]);

  const fetchMeaning = async () => {
    try {
      setLoadingMeaning(true);
      const word = selectedText.split(" ")[0];
      const data = await getMeaning(word);
      setMeaningData(data);
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
  };

  const fetchRelatedBlogs = async () => {
    try {
      setLoadingBlogs(true);
      const blogs = await searchBlogs(selectedText);
      setRelatedBlogs(blogs);
    } catch (error) {
      console.error("Error fetching related blogs:", error);
      setRelatedBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setLoadingBlogs(true);
      // Simulate AI response
      setAiResponse(
        `Searching for "${searchQuery}"... Here are some insights from our platform about this topic.`
      );
      const blogs = await searchBlogs(searchQuery);
      setRelatedBlogs(blogs);
      setActiveTab("blogs");
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed");
    } finally {
      setLoadingBlogs(false);
    }
  };

  const handleOutsideClick = (e) => {
    if (!e.target.closest('.popup-content')) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);

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
          <p className="text-periwinkle text-sm font-semibold mb-1">Selected Text:</p>
          <p className="text-white italic">"{selectedText}"</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-navbar-border">
          <button
            onClick={() => setActiveTab("meaning")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "meaning"
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
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "search"
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
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "blogs"
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-rich-black-light border border-navbar-border rounded-lg px-4 py-3 text-white placeholder-periwinkle focus:outline-none focus:border-periwinkle"
                  placeholder="Search..."
                />
                <button
                  onClick={handleSearch}
                  disabled={loadingBlogs}
                  className="absolute right-3 top-3 text-periwinkle hover:text-white disabled:opacity-50"
                >
                  <span className="material-icons">search</span>
                </button>
              </div>

              <div className="space-y-3">
                {loadingBlogs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin">
                      <span className="material-icons">hourglass_top</span>
                    </div>
                    <span className="ml-2 text-periwinkle">Searching...</span>
                  </div>
                ) : (
                  <>
                    {aiResponse && (
                      <div className="bg-rich-black-light rounded-lg p-3 border border-navbar-border">
                        <div className="flex items-start space-x-3">
                          <div className="bg-medium-slate-blue p-2 rounded-lg flex-shrink-0">
                            <span className="material-icons text-white">smart_toy</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-periwinkle font-semibold text-sm mb-1">
                              AI Assistant
                            </p>
                            <p className="text-white text-sm">{aiResponse}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button className="w-full bg-celadon text-rich-black py-2 px-4 rounded-lg hover:bg-celadon-dark transition-colors font-semibold">
                      View All Results
                    </button>
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
    </div>
  );
};

export default TextSelectionPopup;