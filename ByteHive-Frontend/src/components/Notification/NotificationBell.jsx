// // components/NotificationBell.jsx
// import { useState, useEffect } from "react";
// import { useNotifications } from "../../context/NotificationContext";

// export default function NotificationBell() {
//   const { notifications } = useNotifications();
//   const [open, setOpen] = useState(false);
//   const [unreadCount, setUnreadCount] = useState(10)

//   return (
//     <div className="relative">
//       <button onClick={() => setOpen(!open)} className="relative">
//         🔔
//         {unreadCount > 0 && (
//           <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">
//             {unreadCount}
//           </span>
//         )}
//       </button>

//       {open && (
//         <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-xl p-2 max-h-96 overflow-y-auto">
//           {notifications.map((n) => (
//             <div key={n._id} className="p-2 border-b hover:bg-gray-100">
//               {n.message}
//             </div>
//           ))}
//           <a href="/notifications" className="block text-center text-blue-500 p-2">
//             View all
//           </a>
//         </div>
//       )}
//     </div>
//   );
// }
