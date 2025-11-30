import React, { useEffect, useState } from 'react';
import { Box } from "@mui/material";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Dashboard() {

  const users = localStorage.getItem('username');
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      toast.error("Session expired. Please login again.");
      window.location.href = "/login";
      return;
    }
  }, []);

  return (
    <Box sx={{ p: 3, backgroundColor: "#f7faff", minHeight: "100vh" }}>
      <div className="dashboard-page">
        <div className="welcome-card">
          <h3>Welcome, {users}</h3>
          {/* <p>This is your dashboard. Add widgets and pages from the sidebar.</p> */}
        </div>
      </div>
    </Box>
  );
}
