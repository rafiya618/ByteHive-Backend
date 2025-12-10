import React, { useState, useRef, useEffect } from "react";
import ActionButton from "../../shared/ActionButton";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "../CreatePost/quill-custom.css";

const EVENT_TYPES = [
  "hackathon",
  "conference",
  "meetup",
  "workshop",
  "webinar",
  "other",
];

const EventFormCard = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [rules, setRules] = useState("");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quillRef = useRef(null);

  const modules = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["clean"],
    ],
    clipboard: { matchVisual: false },
  };

  // For rules rich text
  useEffect(() => {
    if (quillRef.current) {
      // No custom handlers needed for rules
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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !description.trim() || !date || !time) {
      setError("Title, description, date and time are required.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/events", {
        event_title: title,
        description,
        location,
        date,
        time,
        registration_link: registrationLink,
        rules,
        thumbnail,
        event_type: eventType,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setLoading(false);
      setTitle("");
      setDescription("");
      setThumbnail(null);
      setLocation("");
      setDate("");
      setTime("");
      setRegistrationLink("");
      setRules("");
      setEventType(EVENT_TYPES[0]);
      setTags("");
      setError("");
      alert("Event created!");
    } catch (err) {
      setLoading(false);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to create event. Please try again."
      );
    }
  };

  return (
    <form
      className="bg-navbar-bg border border-navbar-border rounded-2xl p-6 flex flex-col gap-6 w-full max-w-xl mx-auto"
      onSubmit={handleCreateEvent}
    >
      {error && (
        <div className="bg-[#D9467C22] border border-[#D9467C] text-[#D9467C] px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Event Title */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Event Title</label>
        <input
          type="text"
          placeholder="Choose event title"
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white placeholder:text-desc text-sm focus:outline-none focus:border-periwinkle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Description</label>
        <textarea
          placeholder="Describe what your event is about"
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white placeholder:text-desc text-sm focus:outline-none focus:border-periwinkle min-h-[100px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Thumbnail */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Thumbnail Image</label>
        <div
          className="border border-dashed border-navbar-border rounded-lg p-5 text-center text-desc cursor-pointer hover:border-periwinkle"
          onClick={() => document.getElementById("event-thumbnail-input").click()}
        >
          <span className="material-icons text-2xl text-periwinkle mb-1">
            image
          </span>
          <p className="text-sm">Click to upload or drag and drop</p>
          <p className="text-xs mt-1">SVG, PNG, JPG or GIF (MAX. 2MB)</p>
          {thumbnail && (
            <img
              src={thumbnail}
              alt="thumbnail"
              className="mx-auto mt-2 rounded-md max-h-32"
            />
          )}
          <input
            id="event-thumbnail-input"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleThumbnailChange}
          />
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Location</label>
        <input
          type="text"
          placeholder="Enter location (or leave blank for online)"
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white placeholder:text-desc text-sm focus:outline-none focus:border-periwinkle"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-white/90 font-fenix">Date</label>
          <input
            type="date"
            className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-periwinkle"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-white/90 font-fenix">Time</label>
          <input
            type="time"
            className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-periwinkle"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Registration Link */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Registration Link</label>
        <input
          type="url"
          placeholder="http://example.com/register"
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white placeholder:text-desc text-sm focus:outline-none focus:border-periwinkle"
          value={registrationLink}
          onChange={(e) => setRegistrationLink(e.target.value)}
        />
      </div>

      {/* Event Type */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Event Type</label>
        <select
          className="w-full bg-navbar-bg border border-navbar-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-periwinkle"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
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

      {/* Rules */}
      <div className="flex flex-col gap-1">
        <label className="text-white/90 font-fenix">Rules</label>
        <div className="rounded-lg border border-navbar-border overflow-hidden">
          <ReactQuill
            ref={quillRef}
            value={rules}
            onChange={setRules}
            modules={modules}
            formats={["bold", "italic", "underline", "list", "bullet"]}
            placeholder="List any rules for your event"
            theme="snow"
            className="custom-quill"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-2">
        <ActionButton variant="secondary" type="button">
          Cancel
        </ActionButton>
        <ActionButton variant="primary" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Event"}
        </ActionButton>
      </div>
    </form>
  );
};

export default EventFormCard;
