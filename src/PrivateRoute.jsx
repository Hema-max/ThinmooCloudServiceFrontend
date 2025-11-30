
// import React from "react";
// import { Navigate } from "react-router-dom";

// export default function PrivateRoute({ children }) {
//   const tokenData = localStorage.getItem('token');

//   // No login data stored
//   if (!tokenData ) {
//     return <Navigate to="/login" replace />;
//   }

//   // Check expiry
//   const tokenTime = localStorage.getItem('expiresIn') ? new Date(localStorage.getItem('expiresIn')).getTime() : null;
//   const now = Date.now();
//   const twoHours = 7200 * 1000; // 2 hours in milliseconds

//   if (!tokenTime || now - tokenTime > twoHours) {
//     // Token expired — clear and redirect
//     localStorage.removeItem("authData");
//     return <Navigate to="/login" replace />;
//   }

//   // Otherwise allow access
//   return children;
// }



import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function PrivateRoute({ children }) {
  const [isValid, setIsValid] = useState(true);
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const expiresIn = localStorage.getItem("expiresIn");

    // ❌ No token or invalid token
    if (!token || token === "undefined" || token === "null") {
      localStorage.clear();
      toast.warning("Please log in to continue.");
      setIsValid(false);
      setRedirect(true);
      return;
    }

    // ⏰ Check expiry
    if (expiresIn) {
      const tokenTime = new Date(expiresIn).getTime();
      const now = Date.now();
      const twoHours = 7200 * 1000; // 2 hours

      if (now - tokenTime > twoHours) {
        localStorage.clear();
        toast.error("Session expired. Please log in again.");
        setIsValid(false);
        setRedirect(true);
        return;
      }
    } else {
      // If no expiry info found
      localStorage.clear();
      toast.error("Invalid session. Please log in again.");
      setIsValid(false);
      setRedirect(true);
      return;
    }
  }, []);

  // 🔄 Redirect when invalid
  if (redirect || !isValid) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Token valid
  return children;
}


