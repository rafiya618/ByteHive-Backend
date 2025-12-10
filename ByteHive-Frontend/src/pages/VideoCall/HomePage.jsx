import React from "react";
import Navbar from "../../shared/Navbar";

function HomePage() {
  const [roomLink, setRoomLink] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  function generateRoomId() {
    return Math.random().toString(36).substring(2, 10);
  }

  const createRoom = () => {
    const roomId = generateRoomId();
    const link = `${window.location.origin}/room/${roomId}`;
    setRoomLink(link);
    setCopied(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
  };

  return (
    <div className="min-h-screen bg-rich-black flex flex-col">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="max-w-lg w-full bg-navbar-bg border border-navbar-border rounded-2xl shadow-lg p-8 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-icons text-periwinkle text-4xl">videocam</span>
            <h1 className="font-fenix text-3xl text-white">ByteHive Video Rooms</h1>
          </div>
          <button
            onClick={createRoom}
            className="bg-periwinkle hover:bg-medium-slate-blue text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 mb-6"
          >
            <span className="material-icons text-lg">add_circle</span>
            Create Room
          </button>
          {roomLink && (
            <div className="w-full mt-4 flex flex-col items-center">
              <div className="text-columbia-blue mb-2 font-lato">Sharable Room Link:</div>
              <div className="flex w-full gap-2">
                <input
                  value={roomLink}
                  readOnly
                  className="flex-1 bg-rich-black-light border border-navbar-border rounded-lg px-4 py-2 text-white font-lato"
                  style={{ minWidth: 0 }}
                />
                <button
                  onClick={copyLink}
                  className="bg-periwinkle hover:bg-medium-slate-blue text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-icons text-base">content_copy</span>
                  Copy
                </button>
                {copied && (
                  <span className="text-green-400 flex items-center gap-1 ml-2">
                    <span className="material-icons text-base">check_circle</span>
                    Copied!
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
