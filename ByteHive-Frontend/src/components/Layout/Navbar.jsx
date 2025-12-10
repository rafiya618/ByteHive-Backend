import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../../context/auth";
import toast from "react-hot-toast";
import { useProfile } from "../../context/profileContext";
import { useNotifications } from "../../context/NotificationContext";
import { registerPush } from "../../helpers/registerPush";
import StreakModal from "../Retention/StreakModal";

const Navbar = () => {

    const [isOpen, setIsOpen] = useState(false);
    const [streakModalOpen, setStreakModalOpen] = useState(false);
    const { auth, setAuth } = useAuth()
    const { profile, setProfile } = useProfile()
    const { unReadCount } = useNotifications()
    const navigate = useNavigate

    const profileImage = profile?.profileImage;

    const HandleLogout = () => {
        localStorage.removeItem("Auth")
        setAuth({ ...auth, token: '' })
        toast.success("User logout successfully.")
        navigate('/login')
    }


    return (
        <nav className="navbar">
            <div className="nav-container">
                <h1 className="logo">ByteHive</h1>

                <ul className={`nav-links ${isOpen ? "open" : ""}`}>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/profile">Profile</Link></li>
                    {
                        (!auth?.token) ?
                            <>

                                <li><Link to="/login">Login</Link></li>
                                <li><Link to="/register">Register</Link></li>
                            </>
                            : <>
                                <li><Link to="/comment">Comment</Link></li>
                                <li>
                                    <Link to="/leaderboard" >
                                        🏆 Leaderboard
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/notification" >
                                        🔔 {unReadCount > 0 ? `(${unReadCount})` : ""}
                                    </Link>
                                </li>
                                <li onClick={() => setStreakModalOpen(true)} style={{ cursor: 'pointer' }}>
                                    <button onClick={() => setStreakModalOpen(true)} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                                        <span className="text-2xl">🔥</span>
                                        <span>Streak</span>
                                    </button>
                                </li>
                                <li ><Link to="/enable-notifications" >Enable Push</Link></li>
                                <li ><Link to="/login" onClick={HandleLogout}>Logout</Link></li>
                            
                            </>

                    }

                </ul>
                {
                    (auth?.token && profileImage) &&
                    (
                        <img
                            src={profileImage}
                            alt="Image"
                            className="nav-avatar"
                        // style={{
                        //     width: "50px",
                        //     height: "50px",
                        //     borderRadius: "50%",
                        //     objectFit: "cover",
                        //     marginLeft: '85px'
                        // }}
                        />
                    )
                }
            </div>
            <StreakModal isOpen={streakModalOpen} onClose={() => setStreakModalOpen(false)} />
        </nav>
    );
};

export default Navbar;

