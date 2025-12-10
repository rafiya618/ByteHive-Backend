// src/context/ProfileContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { getProfile } from '../api/ProfileApi';
import axios from "axios";
import { useAuth } from "./auth";
import { jwtDecode } from 'jwt-decode';

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { auth } = useAuth();


  const fetchProfile = async () => {
    try {
      if (!auth?.user?._id || auth?.user?.onboardingStep !== 4) return;
      setLoading(true);
      const res = await getProfile(auth?.user?._id);
      console.log('res', res.data)
      setProfile(res?.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.token && auth?.user?._id) {
      fetchProfile();
    }
  }, [auth]);


  return (
    <ProfileContext.Provider value={{ profile, setProfile, loading, fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
