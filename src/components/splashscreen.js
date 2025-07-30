import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Box, CircularProgress, Typography } from "@mui/material";

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/Login");
    }, 2000); // 2 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #923BEF, #90E0EF)", // Gradient background
        color: "#FFFFFF", // White text for contrast
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        minHeight: "100vh", // Changed to minHeight
        width: "100%", // Prevent overflow
        overflowX: "hidden",
      }}
      role="region"
      aria-label="Helpmate Splash Screen"
    >
      {/* Animated Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <Typography
          variant="h1"
          sx={{
            fontFamily: "'PT Serif', serif",
            fontWeight: "bold",
            fontSize: { xs: "2.5rem", sm: "4rem", md: "5rem", lg: "6rem" }, // Responsive font size
            textShadow: "1px 1px 3px rgba(0, 0, 0, 0.3)", // Simplified shadow
            textAlign: "center",
            px: { xs: 2, sm: 0 }, // Padding for small screens
          }}
          aria-label="Helpmate Title"
        >
          Helpmate
        </Typography>
      </motion.div>

      {/* Subtle Loading Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <CircularProgress
          size={{ xs: 32, sm: 40 }} // Responsive spinner size
          sx={{
            color: "#FFFFFF",
            mt: { xs: 1.5, sm: 2 }, // Adjusted margin
          }}
          aria-label="Loading"
        />
        <Typography
          variant="srOnly" // Visually hidden for screen readers
          sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
          aria-live="polite"
        >
          Loading Helpmate, please wait...
        </Typography>
      </motion.div>
    </Box>
  );
};

export default SplashScreen;