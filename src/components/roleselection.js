import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import Person2TwoToneIcon from "@mui/icons-material/Person2TwoTone";
import SupportAgentTwoToneIcon from "@mui/icons-material/SupportAgentTwoTone";
import ManageAccountsTwoToneIcon from "@mui/icons-material/ManageAccountsTwoTone";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  Card,
  TextField,
  Button,
  Typography,
  Box,
  Dialog,
  DialogContent,
} from "@mui/material";
import { motion } from "framer-motion";

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [credentials, setCredentials] = useState({ userId: "", password: "" });
  const [error, setError] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false);
  };

  const handleIconClick = (role) => {
    setSelectedRole(role);
    setError("");
  };

  const handleLogin = async () => {
    if (!selectedRole) {
      setError("Please select a role first.");
      return;
    }

    if (!credentials.userId || !credentials.password) {
      setError("Please enter both User ID and Password.");
      return;
    }

    setError("");

    try {
      const collectionName =
        selectedRole === "user"
          ? "users"
          : selectedRole === "agent"
            ? "agent"
            : "admin";

      const q = query(
        collection(db, collectionName),
        where("username", "==", credentials.userId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();

        if (userData.password === credentials.password) {
          sessionStorage.setItem("username", credentials.userId);
          setSuccessDialogOpen(true);

          setTimeout(() => {
            if (selectedRole === "user") navigate("/user/home");
            else if (selectedRole === "agent") navigate("/agent/home");
            else navigate("/admin/home");
          }, 2900);
        } else {
          setError("Incorrect password.");
        }
      } else {
        setError("User does not exist.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    }
  };

  const handleSignUp = () => {
    if (!selectedRole) {
      setError("Please select a role first.");
      return;
    }
    navigate(`/${selectedRole}/signup`);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        background: "#E5E5E5", 
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        pt: 6,
      }}
    >
      <Card
        sx={{
          width: { xs: "80%", md: "50%" },
          height: "auto",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF", // White card background
          boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.2)",
          borderRadius: "20px",
          p: 4,
        }}
      >
        {/* Welcome Text with Background */}
        <Box
          sx={{
            backgroundColor: "#0A2472", // Colored background for welcome
            py: 3,
            px: 2,
            borderTopLeftRadius: "10px",
            borderTopRightRadius: "10px",
            borderBottom: "3px solid #ddd",
            textAlign: "center",
            position: "relative",
            top: "-32px",
            width: "calc(100% + 64px)",
            left: "-32px",
            mb: -4,

          }}
        >
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontWeight: "bold",
              color: "#FFFFFF", // White text
              fontFamily: "PT serif",
            }}
          >
            Sign In
          </Typography>
        </Box>

        {/* Role Selection */}
        <Box display="flex" flexDirection="column" alignItems="center" my={4}>
          <Typography
            variant="h4"
            sx={{ mb: 2, fontWeight: "bold", color: "#0A2472", fontFamily: "Outfit" }}
          >
            Select Your Role
          </Typography>

          <Box display="flex" justifyContent="center" gap={3} mt={2}>
            {[
              {
                role: "user",
                icon: <Person2TwoToneIcon fontSize="large" />,
                label: "User",
              },
              {
                role: "agent",
                icon: <SupportAgentTwoToneIcon fontSize="large" />,
                label: "Agent",
              },
              {
                role: "admin",
                icon: <ManageAccountsTwoToneIcon fontSize="large" />,
                label: "Admin",
              },
            ].map(({ role, icon, label }) => (
              <motion.div key={role} whileHover={{ scale: 1.05 }}>
                <Box
                  onClick={() => handleIconClick(role)}
                  sx={{
                    p: 2,
                    border: "2px solid",
                    borderColor: selectedRole === role ? "#0A2472" : "gray",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    width: "100px",
                    transition: "all 0.3s",
                    "&:hover": {
                      borderColor: "#0A2472",
                    },
                  }}
                >
                  {React.cloneElement(icon, {
                    style: {
                      color: selectedRole === role ? "#0A2472" : "gray",

                      transition: "color 0.3s",
                    },
                  })}
                  <Typography
                    variant="body1"
                    sx={{ mt: 1, fontWeight: "bold" }}
                  >
                    {label}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Box>

        {/* Credential Fields */}
        <Box mb={1}>
          <Typography variant="h6" fontWeight="bold" color="#0A2472">
            User ID
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter your User ID"
            margin="dense"
            value={credentials.userId}
            onChange={(e) =>
              setCredentials({ ...credentials, userId: e.target.value })

            }
          />
          <Typography variant="h6" fontWeight="bold" color="#0A2472">
            Password
          </Typography>
          <TextField
            fullWidth
            type="password"
            variant="outlined"
            placeholder="Enter your password"
            margin="dense"
            value={credentials.password}
            onChange={(e) =>
              setCredentials({ ...credentials, password: e.target.value })

            }
          />

          {error && (
            <div style={{
              color: 'red',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              fontFamily : 'Poppins',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ErrorOutlineIcon />
              {error}
            </div>
          )}

          <Button
            variant="contained"
            onClick={handleLogin}
            sx={{
              width: "100%",
              height: "45px",
              fontSize: "26px",
              mt: 2,
              backgroundColor: "#0A2472",
              boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.25)",
              borderRadius: "10px",
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#005f87",
                boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.3)",
              },
            }}
          >
            Login
          </Button>

          {/* Sign-Up Text */}
          <Typography
            variant="body2"
            align="center"
            sx={{
              mt: 2,
              fontSize: "20px",
              fontWeight: "bold",
              cursor: "pointer",
              color: "#14213D", // Default color
              textDecoration: "underline", // Underline text
              "&:hover": {
                color: "#0A2472", // Hover color
              },
              "&:active": {
                color: "#005f87", // Active (clicked) color
              },
            }}
            onClick={handleSignUp}
          >
            Don't have an account? Sign up
          </Typography>
        </Box>

        {/* Success Dialog */}
        <Dialog
          open={successDialogOpen}
          onClose={handleSuccessDialogClose}
          PaperProps={{
            sx: {
              p: 4,
              borderRadius: "20px",
              textAlign: "center",
              backgroundColor: "#ffffff",
              boxShadow: 24,
            },
          }}
          BackdropProps={{
            style: {
              backdropFilter: "blur(5px)",
              backgroundColor: "rgba(0,0,0,0.2)",
            },
          }}
        >
          <DialogContent>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              gap={2}
            >
              <TaskAltIcon sx={{ fontSize: 60, color: "#123499" }} />
              <Typography variant="h4" fontWeight="bold" color="#0A2472">
                Login Successful
              </Typography>
            </Box>
          </DialogContent>
        </Dialog>
      </Card>
    </Box>
  );
};

export default RoleSelection;    