import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
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
  AppBar,
  Toolbar,
  CircularProgress,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeFilledIcon from "@mui/icons-material/HomeFilled";
import BookOnlineSharpIcon from "@mui/icons-material/BookOnlineSharp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import AssignedTickets from "./assignedtickets.js";
import AgentReport from "./agentreport.js";
import AgentSettings from "./agentsettings.js";
import AgentGraph from "./agentgraph.js";
import { Outlet } from "react-router-dom";

const drawerWidth = { xs: 240, sm: 260, md: 280 };
const appBarHeight = 64; // increased height for AppBar

const navItems = [
  { key: "home", label: "Home", icon: <HomeFilledIcon />, path: "/agent/home" },
  { key: "assigned-tickets", label: "Assigned Tickets", icon: <BookOnlineSharpIcon />, path: "/agent/assigned-tickets" },
  
  { key: "settings", label: "Settings", icon: <SettingsIcon /> },
];

const AgentDashboard = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [agentUsername, setAgentUsername] = useState("");
  const [agentDepartment, setAgentDepartment] = useState("");
  const [organization, setOrganization] = useState("");
  const [selectedPage, setSelectedPage] = useState("home");
  const [themeMode, setThemeMode] = useState("light");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setAgentUsername(storedUsername);
      fetchAgentDetails(storedUsername);
    } else {
      navigate("/Login");
    }
  }, [navigate]);

  // Fetch from Users collection, read orgName, department, and passwordChange fields
  const fetchAgentDetails = async (username) => {
    try {
      const agentRef = doc(db, "Users", username);
      const docSnap = await getDoc(agentRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAgentDepartment(data.department || "");
        setOrganization(data.orgName || "Not Assigned");
        setMustChangePassword(data.passwordChange || false);
      } else {
        console.warn("No such agent found in Users");
        setOrganization("Not Assigned");
      }
    } catch (error) {
      console.error("Error fetching agent details:", error);
      setOrganization("Not Assigned");
    } finally {
      setCheckingPassword(false);
    }
  };

  const handleItemClick = (key, path) => {
    setSelectedPage(key);
    if (key !== "settings" && key !== "assigned-tickets" && key !== "home" && path) {
      navigate(path);
    }
    if (isMobile) {
      setDrawerOpen(false);
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
      {/* Drawer - Side Panel */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? drawerOpen : true}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: isMobile ? (drawerOpen ? drawerWidth.xs : 0) : drawerOpen ? drawerWidth.md : 70,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? drawerWidth.xs : drawerOpen ? drawerWidth.md : 70,
            backgroundColor: "#2A2A2A",
            color: "white",
            transition: "width 0.3s",
            overflowX: "hidden",
            boxSizing: "border-box",
            top: 0,
            height: "100vh",
          },
        }}
        ModalProps={{
          keepMounted: true,
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
          <List>
            {navItems.map(({ key, label, icon, path }) => {
              const isSelected = selectedPage === key;
              return (
                <ListItem
                  button
                  key={key}
                  onClick={() => handleItemClick(key, path)}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    backgroundColor: "transparent",
                    "&:hover": {
                      backgroundColor: "transparent",
                    },
                  }}
                  aria-current={isSelected ? "page" : undefined}
                  aria-label={`Navigate to ${label}`}
                >
                  <ListItemIcon
                    sx={{
                      color: isSelected ? "#00A3FF" : "white",
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
                        color: isSelected ? "#00A3FF" : "white",
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

      {/* AppBar aligned next to drawer */}
      <AppBar
        position="fixed"
        sx={{
          height: appBarHeight,
          ml: isMobile ? 0 : drawerOpen ? `${drawerWidth.md}px` : "70px",
          width: isMobile ? "100%" : `calc(100% - ${drawerOpen ? drawerWidth.md : 70}px)`,
          backgroundColor: "#2A2A2A",
          justifyContent: "center",
          boxShadow: "none",
          borderBottom: "1px solid #222",
        }}
      >
        <Toolbar sx={{ minHeight: appBarHeight, px: 2 }}>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "block" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ fontFamily: "'PT Serif', serif" }}>
            Agent Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main content box with margin top for AppBar */}
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
          mt: `${appBarHeight}px`,
          ...(mustChangePassword && {
            pointerEvents: "none",
            opacity: 0.5,
          }),
        }}
        role="main"
        aria-label="Agent dashboard content"
      >
        {mustChangePassword && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />
        )}
        {checkingPassword ? (
          <Box sx={{ mt: 15, textAlign: "center" }}>
            <CircularProgress size={32} color="primary" />
            <Typography variant="body1" sx={{ mt: 2, fontFamily: "'PT Serif', serif" }}>
              Checking account security...
            </Typography>
          </Box>
        ) : (
          <>
            {mustChangePassword && (
              <Dialog
                open={mustChangePassword}
                disableEscapeKeyDown
                sx={{
                  "& .MuiDialog-paper": {
                    width: { xs: "90%", sm: "400px" },
                    maxWidth: "400px",
                    p: { xs: 1, sm: 2 },
                  },
                }}
              >
                <DialogTitle sx={{ fontFamily: "'PT Serif', serif", fontSize: { xs: "1.1rem", sm: "1.25rem" }, color: "#0A2472" }}>
                  Change Your Password
                </DialogTitle>
                <DialogContent>
                  <Typography sx={{ fontFamily: "'PT Serif', serif", fontSize: { xs: "0.85rem", sm: "0.9rem" }, color: "#333" }}>
                    For your security, you must change your password before accessing the application.
                  </Typography>
                </DialogContent>
                <DialogActions>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setSelectedPage("settings");
                      setMustChangePassword(false);
                    }}
                    sx={{
                      fontFamily: "'PT Serif', serif",
                      fontSize: { xs: "0.8rem", sm: "0.85rem" },
                      minWidth: { xs: 80, sm: 100 },
                    }}
                  >
                    Go to Settings
                  </Button>
                </DialogActions>
              </Dialog>
            )}
            {selectedPage === "home" ? (
              <AgentGraph
                username={agentUsername}
                orgName={organization}
                department={agentDepartment}
              />
            ) : selectedPage === "assigned-tickets" ? (
              <AssignedTickets />
            ) : selectedPage === "settings" ? (
              <AgentSettings
                username={agentUsername}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                onLogout={() => setLogoutDialogOpen(true)}
              />
            
            ) : null}
            <Outlet />
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
          </>
        )}
      </Box>
    </Box>
  );
};

export default AgentDashboard;