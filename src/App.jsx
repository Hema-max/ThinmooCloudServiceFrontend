

// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import Sidebar from './components/Sidebar';
// import Header from './components/Header';
// import Dashboard from './pages/Dashboard';
// import AuthorizedDriverBulim from './pages/AuthorizedDriverBulim';
// import Device from './pages/Device';
// import Login from './components/Login';
// import PrivateRoute from './PrivateRoute';
// import './theme.css';
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// export default function App() {
//   const [collapsed, setCollapsed] = useState(false);
//   const [mobileVisible, setMobileVisible] = useState(false);
//   const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
//   const userEmail = localStorage.getItem('username') || 'Guest';
//   const location = useLocation();

//   useEffect(() => {
//     const onResize = () => {
//       const mobile = window.innerWidth <= 768;
//       setIsMobile(mobile);
//       if (!mobile) setMobileVisible(false);
//     };
//     window.addEventListener('resize', onResize);
//     return () => window.removeEventListener('resize', onResize);
//   }, []);

//   const isLoginPage = location.pathname === '/login';

//   const currentTitle =
//     location.pathname
//       .split('/')
//       .filter(Boolean)
//       .map(word =>
//         word
//           .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
//           .replace(/-/g, ' ')
//           .replace(/\b\w/g, l => l.toUpperCase())
//       )
//       .join(' ') || 'Dashboard';

//   if (isLoginPage) {
//     return (
//       <div className="login-wrapper">
//         <Routes>
//           <Route path="/login" element={<Login />} />
//           <Route path="*" element={<Navigate to="/login" />} />
//         </Routes>
//         {/* ✅ ToastContainer here too, so login errors show */}
//         <ToastContainer position="top-center" autoClose={3000} />
//       </div>
//     );
//   }

//   return (
//     <div className="app-wrapper">
//       <Sidebar
//         collapsed={collapsed}
//         mobileVisible={mobileVisible}
//         setMobileVisible={setMobileVisible}
//         isMobile={isMobile}
//       />

//       <div
//         className={`main-section 
//           ${!isMobile && collapsed ? 'collapsed' : ''} 
//           ${mobileVisible ? 'overlay-active' : ''}`}
//       >
//         <Header
//           collapsed={collapsed}
//           setCollapsed={setCollapsed}
//           mobileVisible={mobileVisible}
//           setMobileVisible={setMobileVisible}
//           userEmail={userEmail}
//           title={currentTitle}
//           isMobile={isMobile}
//         />

//         <div className="page-body">
//           <Routes>
//             <Route path="/" element={<Navigate to="/dashboard" />} />
//             <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
//             <Route path="/authorized-driver" element={<PrivateRoute><AuthorizedDriverBulim /></PrivateRoute>} />
//             <Route path="/device" element={<PrivateRoute><Device /></PrivateRoute>} />
//             <Route path="*" element={<Navigate to="/dashboard" />} />
//           </Routes>
//         </div>
//       </div>

//       {/* ✅ Toast container at global level */}
//       <ToastContainer position="top-center" autoClose={3000} />
//     </div>
//   );
// }






import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import AuthorizedDriverBulim from "./pages/AuthorizedDriverBulim";
import Device from "./pages/Device";
import Login from "./components/Login";
import PrivateRoute from "./PrivateRoute";
import "./theme.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ Add this interceptor ONCE — before App component
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 ||
        error.response.data?.msg === "Invalid token" ||
        error.response.data?.message === "Invalid token")
    ) {
      // 🔒 Clear invalid token & redirect to login
      localStorage.removeItem("token");
      toast.error("Session expired. Please login again.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }
    return Promise.reject(error);
  }
);

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const userEmail = localStorage.getItem("username") || "Guest";
  const location = useLocation();

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileVisible(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isLoginPage = location.pathname === "/login";

  const currentTitle =
    location.pathname
      .split("/")
      .filter(Boolean)
      .map((word) =>
        word
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
      )
      .join(" ") || "Dashboard";

  if (isLoginPage) {
    return (
      <div className="login-wrapper">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        {/* ✅ ToastContainer here too, so login errors show */}
        <ToastContainer position="top-center" autoClose={3000} />
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Sidebar
        collapsed={collapsed}
        mobileVisible={mobileVisible}
        setMobileVisible={setMobileVisible}
        isMobile={isMobile}
      />

      <div
        className={`main-section 
          ${!isMobile && collapsed ? "collapsed" : ""} 
          ${mobileVisible ? "overlay-active" : ""}`}
      >
        <Header
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileVisible={mobileVisible}
          setMobileVisible={setMobileVisible}
          userEmail={userEmail}
          title={currentTitle}
          isMobile={isMobile}
        />

        <div className="page-body">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/authorized-driver"
              element={
                <PrivateRoute>
                  <AuthorizedDriverBulim />
                </PrivateRoute>
              }
            />
            <Route
              path="/device"
              element={
                <PrivateRoute>
                  <Device />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </div>

      {/* ✅ Toast container at global level */}
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
}

