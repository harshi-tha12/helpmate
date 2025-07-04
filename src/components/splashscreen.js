import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CircularProgress from "@mui/material/CircularProgress";

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/Login");
    }, 2000); // 2 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        background: "linear-gradient(135deg,rgb(146, 59, 239), #90E0EF)", // Gradient background
        color: "#FFFFFF", // White text for better contrast
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        height: "100vh", // Full screen height
      }}
    >
      {/* Animated Title */}
      <motion.h1
        className="display-3 fw-bold"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "7rem",
          fontFamily: "PT serif",
          textShadow: "2px 2px 4px rgba(0, 0, 0, 0.4)", // Text shadow for a glowing effect
        }}
      >
        Helpmate
      </motion.h1>

      {/* Subtle Loading Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <CircularProgress
          sx={{
            color: "#FFFFFF", // White spinner
            mt: 2, // Margin on top
          }}
        />
      </motion.div>
    </div>
  );
};

export default SplashScreen;