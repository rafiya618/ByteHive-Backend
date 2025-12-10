import React from "react";
import Navbar from "../shared/Navbar";
import HistoryPage from "../components/History/HistoryPage";

const History = () => {
  return (
    <div className="bg-rich-black min-h-screen">
      <Navbar />
      <HistoryPage />
    </div>
  );
};

export default History;