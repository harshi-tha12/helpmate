import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeFilledIcon from "@mui/icons-material/HomeFilled";
import BookOnlineSharpIcon from "@mui/icons-material/BookOnlineSharp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssistantIcon from "@mui/icons-material/Assistant";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import AssignedTickets from "./assignedtickets.js";
import { Outlet } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

const drawerWidth = 280;

const navItems = [
  { key: "home", label: "Home", icon: <HomeFilledIcon />, path: "/agent/home" },
  { key: "assigned-tickets", label: "Assigned Tickets", icon: <BookOnlineSharpIcon />, path: "/agent/assigned-tickets" },
  { key: "reports", label: "Reports", icon: <AssessmentIcon />, path: "/agent/reports" },
  { key: "suggestions", label: "Suggestions", icon: <AssistantIcon />, path: "/agent/suggestions" },
];

const AgentDashboard = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [agentUsername, setAgentUsername] = useState("");
  const [agentDepartment, setAgentDepartment] = useState("");
  const [organization, setOrganization] = useState(""); // State for organization name
  const [selectedKey, setSelectedKey] = useState("home");
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

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
        setOrganization(data.organization || "Not Assigned"); // Fetch organization
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
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    sessionStorage.removeItem("username");
    setLogoutDialogOpen(false);
    navigate("/Login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ backgroundColor: "#0A2472", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(!drawerOpen)}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontSize: "1.8rem",
              fontFamily: "'Playfair Display', serif",
              color: "white",
            }}
          >
            Agent {agentUsername}
          </Typography>
          {agentDepartment && (
            <Typography
              variant="subtitle1"
              sx={{
                marginLeft: 3,
                fontSize: "1.2rem",
                fontFamily: "'PT Serif', serif",
                color: "#B0C4DE",
              }}
            >
              Department: {agentDepartment}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerOpen ? drawerWidth : 70,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerOpen ? drawerWidth : 70,
            backgroundColor: "#0A2472",
            color: "white",
            transition: "width 0.3s",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
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
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "white",
                    minWidth: 0,
                    mr: drawerOpen ? 2 : "auto",
                    justifyContent: "center",
                  }}
                >
                  {icon}
                </ListItemIcon>
                {drawerOpen && (
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      fontSize: "1.1rem",
                      fontFamily: "'PT Serif', serif",
                    }}
                  />
                )}
              </ListItem>
            );
          })}

          <ListItem button onClick={handleLogout} sx={{ mx: 1, my: 0.5 }}>
            <ListItemIcon
              sx={{
                color: "white",
                minWidth: 0,
                mr: drawerOpen ? 2 : "auto",
                justifyContent: "center",
              }}
            >
              <LogoutOutlinedIcon />
            </ListItemIcon>
            {drawerOpen && (
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  fontSize: "1.1rem",
                  fontFamily: "'PT Serif', serif",
                }}
              />
            )}
          </ListItem>
        </List>

        <Box sx={{ mt: "auto", p: 2 }}>
          <ListItem>
            <ListItemIcon sx={{ color: "white" }}>
              <AccountCircleOutlinedIcon sx={{ fontSize: "1.8rem" }} />
            </ListItemIcon>
            {drawerOpen && (
              <ListItemText
                primary={agentUsername}
                primaryTypographyProps={{
                  fontSize: "1rem",
                  fontFamily: "'PT Serif', serif",
                  fontWeight: 500,
                }}
              />
            )}
          </ListItem>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          minHeight: "100vh",
          backgroundColor: "#E5E5E5",
          transition: "all 0.3s",
        }}
      >
        {selectedKey === "home" ? (
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: "PT Serif",
                color: "#123499",
                fontWeight: "bold",
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
        >
          <DialogTitle id="logout-dialog-title">Confirm Logout</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to logout?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogoutDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmLogout} color="error" variant="contained">
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AgentDashboard;