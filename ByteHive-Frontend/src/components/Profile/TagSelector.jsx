// components/TagSelector.js
import { useState, useEffect } from "react";
import axios from "axios";

export default function TagSelector({ userId, onSave }) {
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState([]);

  // Fetch available tags + user’s selected tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await axios.get("http://localhost:3000/tags"); // all tags
        setTags(res.data);

        const userRes = await axios.get(`http://localhost:3000/user-tags/${userId}`); // user’s tags
        setSelected(userRes.data.map(t => t._id));
      } catch (err) {
        console.error("Error fetching tags", err);
      }
    };
    fetchTags();
  }, [userId]);

  const toggleTag = (tagId) => {
    setSelected((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    if (selected.length < 5) {
      alert("Please select at least 5 tags before continuing.");
      return; // stop here
    }

    try {
      await axios.post("http://localhost:3000/user-tags", {
        userId,
        tagIds: selected,
      });
      if (onSave) onSave(); // callback for next step
    } catch (err) {
      console.error("Error saving tags", err);
    }
  };


  return (
    <div>
      <h2>Select your interests</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {tags.map((tag) => (
          <button
            key={tag._id}
            onClick={() => toggleTag(tag._id)}
            style={{
              padding: "8px 12px",
              borderRadius: "20px",
              border: selected.includes(tag._id) ? "2px solid blue" : "1px solid gray",
              backgroundColor: selected.includes(tag._id) ? "#d0e6ff" : "white",
              cursor: "pointer",
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={selected.length < 5}
        style={{
          marginTop: "20px",
          padding: "10px 15px",
          backgroundColor: selected.length < 5 ? "#ccc" : "#007bff",
          color: "white",
          cursor: selected.length < 5 ? "not-allowed" : "pointer"
        }}
      >
        Save & Continue
      </button>

    </div>
  );
}
