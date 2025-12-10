import React, { useState, useRef, useEffect } from "react";
import ActionButton from "../../shared/ActionButton";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./quill-custom.css"; // 👈 add this
import { useAuth } from "../../context/auth";
import { recordActivity } from "../../api/retentionApi";

const PostFormCard = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [smallDescription, setSmallDescription] = useState("");
  const [tags, setTags] = useState("");
  const [community, setCommunity] = useState("Next.js Devs");
  const [thumbnail, setThumbnail] = useState(null);
  const [mediaInputs, setMediaInputs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState("blog");
  const [error, setError] = useState("");
  const { auth } = useAuth();

  const quillRef = useRef(null);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike", "code"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["link", "image", "code-block"],
      ["clean"],
    ],
    clipboard: { matchVisual: false },
  };

  useEffect(() => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const toolbar = quill.getModule("toolbar");
      toolbar.addHandler("image", () => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", "image/*");
        input.click();
        input.onchange = () => {
          const file = input.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result;
              setMediaInputs((prev) => [...prev, base64]);
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, "image", base64);
              quill.setSelection(range.index + 1);
            };
            reader.readAsDataURL(file);
          }
        };
      });
    }
  }, [quillRef]);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setThumbnail(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setLoading(true);
    try {
      const userId = auth?.user?._id ?? auth?.user?.id ?? auth?.user?.user_id ?? auth?.user?.sub ?? auth?.user?.userId ?? 1;
      const response = await axios.post("http://localhost:5000/api/posts", {
        post_title: title,
        small_description: smallDescription,
        post_description: content,
        category: postType,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        community,
        user_id: userId,
        thumbnail,
        mediaInputs,
      });

      // Record post creation activity for streak
      try {
        const postId = response?.data?._id || response?.data?.post?._id;
        if (postId) {
          await recordActivity('post', postId, null, 'Created a post');
        }
      } catch (err) {
        console.warn('Failed to record post activity:', err);
      }

      setLoading(false);
      setTitle("");
      setSmallDescription("");
      setContent("");
      setTags("");
      setCommunity("Next.js Devs");
      setThumbnail(null);
      setMediaInputs([]);
      setPostType("blog");
      setError("");
      alert("Post created!");
    } catch (err) {
      setLoading(false);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to create post. Please try again."
      );
    }
  };

  return (
    <form
      className="bg-navbar-bg border border-navbar-border rounded-2xl p-6 flex flex-col gap-6 w-full"
      onSubmit={handlePublish}
    >
      {error && (
        <div className="bg-[#D9467C22] border border-[#D9467C] text-[#D9467C] px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Post Type */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Post Type</label>
        <select
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-desc focus:outline-none focus:border-periwinkle"
          value={postType}
          onChange={(e) => setPostType(e.target.value)}
        >
          <option value="blog">Blog</option>
          <option value="question">Question</option>
        </select>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Post Title</label>
        <input
          type="text"
          placeholder="Enter a catchy title"
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white placeholder:text-desc text-sm focus:outline-none focus:border-periwinkle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Small Description */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Short Description</label>
        <input
          type="text"
          placeholder="A short summary"
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white placeholder:text-desc text-sm focus:outline-none focus:border-periwinkle"
          value={smallDescription}
          onChange={(e) => setSmallDescription(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Your Content</label>
        <div className="rounded-lg border border-navbar-border overflow-hidden">
          <ReactQuill
            ref={quillRef}
            value={content}
            onChange={setContent}
            modules={modules}
            formats={[
              "header",
              "bold",
              "italic",
              "underline",
              "strike",
              "code",
              "list",
              "bullet",
              "indent",
              "script",
              "align",
              "link",
              "image",
              "code-block",
            ]}
            placeholder="Start writing..."
            theme="snow"
            className="custom-quill"
          />
        </div>
      </div>

      {/* Cover Image */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Cover Image</label>
        <div
          className="border border-dashed border-navbar-border rounded-lg p-5 text-center text-desc cursor-pointer hover:border-periwinkle"
          onClick={() => document.getElementById("cover-image-input").click()}
        >
          <span className="material-icons text-2xl text-periwinkle mb-1">
            image
          </span>
          <p className="text-sm">Drag & drop or click to browse</p>
          <p className="text-xs mt-1">PNG, JPG, GIF up to 10MB</p>
          {thumbnail && (
            <img
              src={thumbnail}
              alt="cover"
              className="mx-auto mt-2 rounded-md max-h-32"
            />
          )}
          <input
            id="cover-image-input"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleThumbnailChange}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Tags</label>
        <input
          type="text"
          placeholder="Add up to 5 tags (comma separated)"
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white placeholder:text-desc text-sm focus:outline-none focus:border-periwinkle"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <p className="text-xs text-desc">Separate tags with commas.</p>
      </div>

      {/* Community */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Select a Community</label>
        <select
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-periwinkle"
          value={community}
          onChange={(e) => setCommunity(e.target.value)}
        >
          <option>Next.js Devs</option>
          <option>Game Designers</option>
          <option>AI Enthusiasts</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-2">
        <ActionButton variant="secondary" type="button">
          Save Draft
        </ActionButton>
        <ActionButton variant="primary" type="submit" disabled={loading}>
          {loading ? "Publishing..." : "Publish"}
        </ActionButton>
      </div>
    </form>
  );
};

export default PostFormCard;
