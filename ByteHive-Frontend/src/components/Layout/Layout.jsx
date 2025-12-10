import React from 'react'
import Navbar from '../../shared/Navbar';
// import Navbar from './Navbar';
import { useAuth } from '../../context/auth';

const Layout = ({ children }) => {
  const {auth} = useAuth()
  return (
    <div className='min-h-screen bg-rich-black  flex flex-col relative text-white'>
      
      <Navbar />
      
      <div
        className="absolute z-0"
        style={{
          width: 637,
          height: 300,
          top: -38,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1A1842B3",
          filter: "blur(100px)",
          boxShadow: "0px 4px 100px 500px #00000066",
          borderRadius: 30,
          pointerEvents: "none",
        }}
      />
      
      {/* marginTop: '80px', padding: '20px' */}
      <main style={{}}>{children}</main>
    </div>
    
  )
}

export default Layout
