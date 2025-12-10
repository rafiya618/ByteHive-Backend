import React from "react";
import Navbar from "../shared/Navbar";
import SavedPage from "../components/SavedItems/SavedPage";

const SavedItems = () => {
  return (
    <div className="bg-rich-black min-h-screen">
      <Navbar />
      <SavedPage />
    </div>
  );
};

export default SavedItems;