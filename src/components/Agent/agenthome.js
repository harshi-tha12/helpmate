import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeFilledIcon from "@mui/icons-material/HomeFilled";
import BookOnlineSharpIcon from "@mui/icons-material/BookOnlineSharp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssistantIcon from "@mui/icons-material/Assistant";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import AssignedTickets from "./assignedtickets.js";
import { Outlet } from "react-router-dom";

const drawerWidth = { xs: 240, sm: 260, md: 280 };

const navItems = [
  { key: "home", label: "Home", icon: <HomeFilledIcon />, path: "/agent/home" },
  { key: "assigned-tickets", label: "Assigned Tickets", icon: <BookOnlineSharpIcon />, path: "/agent/assigned-tickets" },
  { key: "reports", label: "Reports", icon: <AssessmentIcon />, path: "/agent/reports" },
];

const AgentDashboard = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [agentUsername, setAgentUsername] = useState("");
  const [agentDepartment, setAgentDepartment] = useState("");
  const [organization, setOrganization] = useState("");
  const [selectedKey, setSelectedKey] = useState("home");
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // <600px

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setAgentUsername(storedUsername);
      fetchAgentDetails(storedUsername);
    }
  }, [navigate]);

  const fetchAgentDetails = async (username) => {
    try {
      const agentRef = doc(db, "agent", username);
      const docSnap = await getDoc(agentRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAgentDepartment(data.department || "");
        setOrganization(data.organization || "Not Assigned");
      } else {
        console.warn("No such agent found");
      }
    } catch (error) {
      console.error("Error fetching agent details:", error);
    }
  };

  const handleItemClick = (key, path) => {
    setSelectedKey(key);
    if (key === "home" || key === "assigned-tickets") {
      setDrawerOpen(true);
    } else {
      setDrawerOpen(true);
      navigate(path);
    }
    if (isMobile) {
      setDrawerOpen(false); // Close drawer on mobile after selection
    }
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    sessionStorage.removeItem("username");
    setLogoutDialogOpen(false);
    navigate("/Login");
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#E5E5E5" }}>
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? drawerOpen : true}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: isMobile ? (drawerOpen ? drawerWidth.xs : 0) : drawerOpen ? drawerWidth.md : 70,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? drawerWidth.xs : drawerOpen ? drawerWidth.md : 70,
            backgroundColor: "#000000",
            color: "white",
            transition: "width 0.3s",
            overflowX: "hidden",
            boxSizing: "border-box",
            top: 0,
            height: "100vh",
          },
        }}
        ModalProps={{
          keepMounted: true, // Better performance on mobile
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            px: 1,
          }}
          role="navigation"
          aria-label="Agent dashboard navigation"
        >
          <Box sx={{ p: 2, borderBottom: "1px solid #333" }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'PT Serif', serif",
                fontSize: { xs: "1.2rem", sm: "1.5rem" },
                color: "white",
                fontWeight: "bold",
              }}
            >
              Helpmate
            </Typography>
          </Box>
          <Box sx={{ borderLeft: "2px solid #fff", height: "100%", position: "absolute", left: "50px" }} />
          <List>
            {navItems.map(({ key, label, icon, path }) => {
              const isSelected = selectedKey === key;
              return (
                <ListItem
                  button
                  key={key}
                  onClick={() => handleItemClick(key, path)}
                  sx={{
                    borderRadius: isSelected ? "25px" : 0,
                    mx: 1,
                    my: 0.5,
                    backgroundColor: isSelected ? "#266CA9" : "transparent",
                    "&:hover": {
                      backgroundColor: "#266CA9",
                      opacity: 0.9,
                    },
                  }}
                  aria-current={isSelected ? "page" : undefined}
                  aria-label={`Navigate to ${label}`}
                >
                  <ListItemIcon
                    sx={{
                      color: "white",
                      minWidth: 0,
                      mr: drawerOpen ? 2 : "auto",
                      justifyContent: "center",
                      fontSize: { xs: "1.2rem", sm: "1.5rem" },
                      "&:hover": {
                        color: "#00A3FF",
                      },
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  {(drawerOpen || isMobile) && (
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        fontSize: { xs: "0.95rem", sm: "1rem", md: "1.1rem" },
                        fontFamily: "'PT Serif', serif",
                        color: "white",
                        "&:hover": {
                          color: "#00A3FF",
                        },
                      }}
                    />
                  )}
                </ListItem>
              );
            })}
            <ListItem
              button
              onClick={handleLogout}
              sx={{
                mx: 1,
                my: 0.5,
                "&:hover": {
                  backgroundColor: "#266CA9",
                  opacity: 0.9,
                },
              }}
              aria-label="Logout"
            >
              <ListItemIcon
                sx={{
                  color: "white",
                  minWidth: 0,
                  mr: drawerOpen ? 2 : "auto",
                  justifyContent: "center",
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                  "&:hover": {
                    color: "#00A3FF",
                  },
                }}
              >
                <LogoutOutlinedIcon />
              </ListItemIcon>
              {(drawerOpen || isMobile) && (
                <ListItemText
                  primary="Logout"
                  primaryTypographyProps={{
                    fontSize: { xs: "0.95rem", sm: "1rem", md: "1.1rem" },
                    fontFamily: "'PT Serif', serif",
                    color: "white",
                    "&:hover": {
                      color: "#00A3FF",
                    },
                  }}
                />
              )}
            </ListItem>
          </List>
          <Box sx={{ mt: "auto", px: 1, pb: 2 }}>
            <ListItem>
              <ListItemIcon sx={{ color: "white", fontSize: { xs: "1.5rem", sm: "1.8rem" } }}>
                <AccountCircleOutlinedIcon />
              </ListItemIcon>
              {(drawerOpen || isMobile) && (
                <ListItemText
                  primary={agentUsername || "Agent"}
                  primaryTypographyProps={{
                    fontSize: { xs: "0.9rem", sm: "0.95rem", md: "1rem" },
                    fontFamily: "'PT Serif', serif",
                    fontWeight: 500,
                  }}
                />
              )}
            </ListItem>
            {(drawerOpen || isMobile) && organization && (
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "'PT Serif', serif",
                  color: "#B0C4DE",
                  fontSize: { xs: "0.8rem", sm: "0.85rem", md: "0.9rem" },
                  mt: 1,
                  pl: 4,
                }}
              >
                {organization}
              </Typography>
            )}
          </Box>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          minHeight: "100vh",
          backgroundColor: "#E5E5E5",
          transition: "margin-left 0.3s",
          ml: isMobile ? 0 : drawerOpen ? `${drawerWidth.md}px` : "70px",
          width: isMobile ? "100%" : `calc(100% - ${drawerOpen ? drawerWidth.md : 70}px)`,
        }}
        role="main"
        aria-label="Agent dashboard content"
      >
        <Box sx={{ position: "absolute", top: 10, right: 10 }}>
          <IconButton color="inherit" aria-label="Profile Settings">
            <SettingsIcon sx={{ color: "#0A2472", fontSize: "1.5rem" }} />
          </IconButton>
        </Box>
        <Card
          sx={{
            width: "100%",
            mb: 3,
            p: 2,
            backgroundColor: "#FFFFFF",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <CardContent>
            <Typography
              variant="h4"
              sx={{
                fontFamily: "'PT Serif', serif",
                color: "#123499",
                fontWeight: "bold",
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
              }}
            >
              Welcome Agent
            </Typography>
            {organization && (
              <Typography
                variant="h6"
                sx={{
                  mt: 1,
                  color: "#0A2472",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                }}
              >
                Organization: {organization}
              </Typography>
            )}
          </CardContent>
        </Card>
        {selectedKey === "home" ? (
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: "'PT Serif', serif",
                color: "#123499",
                fontWeight: "bold",
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                mb: 2,
              }}
            >
              Agent Dashboard
            </Typography>
            {organization && (
              <Typography
                variant="h6"
                sx={{
                  mt: 2,
                  color: "#0A2472",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                }}
              >
                Organization: {organization}
              </Typography>
            )}
          </Box>
        ) : selectedKey === "assigned-tickets" ? (
          <AssignedTickets />
        ) : (
          <Outlet />
        )}

        <Dialog
          open={logoutDialogOpen}
          onClose={() => setLogoutDialogOpen(false)}
          aria-labelledby="logout-dialog-title"
          sx={{
            "& .MuiDialog-paper": {
              width: { xs: "90%", sm: "400px" },
              maxWidth: "400px",
              p: { xs: 1, sm: 2 },
            },
          }}
        >
          <DialogTitle
            id="logout-dialog-title"
            sx={{
              fontFamily: "'PT Serif', serif",
              fontSize: { xs: "1.1rem", sm: "1.25rem" },
              color: "#0A2472",
            }}
          >
            Confirm Logout
          </DialogTitle>
          <DialogContent>
            <Typography
              variant="body1"
              sx={{
                fontFamily: "'PT Serif', serif",
                fontSize: { xs: "0.85rem", sm: "0.9rem" },
                color: "#333",
              }}
            >
              Are you sure you want to logout?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setLogoutDialogOpen(false)}
              color="primary"
              sx={{
                fontFamily: "'PT Serif', serif",
                fontSize: { xs: "0.8rem", sm: "0.85rem" },
                minWidth: { xs: 80, sm: 100 },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmLogout}
              color="error"
              variant="contained"
              sx={{
                fontFamily: "'PT Serif', serif",
                fontSize: { xs: "0.8rem", sm: "0.85rem" },
                minWidth: { xs: 80, sm: 100 },
              }}
            >
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AgentDashboard;