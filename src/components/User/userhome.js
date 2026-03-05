import React, { useState, useEffect } from "react";
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Tooltip, CircularProgress, Menu, MenuItem, Card, CardContent, Collapse
} from "@mui/material";
import { useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import HomeFilledIcon from "@mui/icons-material/HomeFilled";
import BookOnlineSharpIcon from "@mui/icons-material/BookOnlineSharp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import ArticleIcon from "@mui/icons-material/Article";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate } from "react-router-dom";
import CreateTicketForm from "./createticket.js";
import ViewTickets from "./viewticket.js";
import KnowledgeBase from './knowledgebase.js';
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";
import jsPDF from "jspdf";

import UserGraph from "./usergraph.js";
import UserSettings from "./usersettings.js";

const drawerWidth = { xs: 60, sm: 280 };

const statusColorMap = {
  Closed: "success",
  Resolved: "info",
  "In Progress": "warning",
  Open: "default",
};

const UserHome = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [organization, setOrganization] = useState("");
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [selectedKnowledgeTab, setSelectedKnowledgeTab] = useState("faq");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [closedTicketsWithRemarks, setClosedTicketsWithRemarks] = useState([]);
  const [loadingClosed, setLoadingClosed] = useState(false);
  const [expandedTicketIdx, setExpandedTicketIdx] = useState(null);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTicketForDownload, setSelectedTicketForDownload] = useState(null);
  const openDownloadMenu = Boolean(anchorEl);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme?.breakpoints?.down("sm") ?? ((theme) => theme.breakpoints.down("sm")));
  
  const [themeMode, setThemeMode] = useState("light"); // Or grab from context/store
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(true); // For loading spinner


  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      const fetchUser = async () => {
        try {
          const userRef = doc(db, "Users", storedUsername);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            const org = data.orgName || data.organization || "Not Assigned";
            setOrganization(org);
            // NEW: Check if mustChangePassword is true
            if (data.passwordChange) {
              setMustChangePassword(true);
            }
          } else {
            setOrganization("Not Assigned");
          }
        } catch (error) {
          setOrganization("Not Assigned");
        }
        setCheckingPassword(false);
      };
      fetchUser();
    } else {
      navigate("/Login");
    }
  }, [navigate]);


  useEffect(() => {
    if ((selectedPage === "reports" || (selectedPage === "knowledge-base" && selectedKnowledgeTab === "remarks")) && username) {
      setLoadingClosed(true);
      const fetchClosedTickets = async () => {
        try {
          const q = query(
            collection(db, "tickets"),
            where("createdBy", "==", username),
            where("status", "==", "Closed")
          );
          const snapshot = await getDocs(q);
          const closedWithRemarks = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (Array.isArray(data.remarks) && data.remarks.length > 0) {
              closedWithRemarks.push({ id: docSnap.id, ...data });
            }
          });
          setClosedTicketsWithRemarks(closedWithRemarks);
        } catch (error) {
          setClosedTicketsWithRemarks([]);
        }
        setLoadingClosed(false);
      };
      fetchClosedTickets();
    }
  }, [selectedPage, selectedKnowledgeTab, username]);

  const handleMenuClick = (pageKey) => {
    setSelectedPage(pageKey);
    if (isSmallScreen) setDrawerOpen(false);
  };

  const handleKnowledgeTab = (tabKey) => {
    setSelectedKnowledgeTab(tabKey);
    setExpandedTicketIdx(null);
  };

  const getListItemStyles = (itemKey) => ({
    backgroundColor: selectedPage === itemKey ? "#2A2A2A" : "transparent",
    color: selectedPage === itemKey ? "#1976D2" : "#FFFFFF",
    mx: { xs: 0.5, sm: 1 },
    my: 0.5,
    minHeight: 48,
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "#2A2A2A",
      color: "#1976D2",
      transform: "scale(1.02)",
      "& .MuiListItemIcon-root": {
        color: "#1976D2",
      },
    },
    "& .MuiListItemIcon-root": {
      color: selectedPage === itemKey ? "#1976D2" : "#FFFFFF",
    },
  });

  const confirmLogout = () => {
    sessionStorage.removeItem("username");
    setLogoutDialogOpen(false);
    navigate("/Login");
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const downloadPDF = (ticket) => {
    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text(`Ticket Report`, 15, 20);
    docPDF.setFontSize(13);
    let y = 35;

    docPDF.setFont(undefined, "bold"); docPDF.text("Ticket ID:", 15, y);
    docPDF.setFont(undefined, "normal"); docPDF.text(ticket.id, 50, y);
    y += 8;

    docPDF.setFont(undefined, "bold"); docPDF.text("Problem:", 15, y);
    docPDF.setFont(undefined, "normal"); docPDF.text(ticket.problem || "-", 50, y);
    y += 8;

    docPDF.setFont(undefined, "bold"); docPDF.text("Department:", 15, y);
    docPDF.setFont(undefined, "normal"); docPDF.text(ticket.department || "-", 50, y);
    y += 8;

    docPDF.setFont(undefined, "bold"); docPDF.text("Description:", 15, y);
    docPDF.setFont(undefined, "normal");
    let splitDesc = docPDF.splitTextToSize(ticket.description || "-", 140);
    docPDF.text(splitDesc, 50, y, { maxWidth: 140 });
    y += splitDesc.length * 8;

    docPDF.setFont(undefined, "bold"); docPDF.text("Created At:", 15, y);
    docPDF.setFont(undefined, "normal");
    docPDF.text(ticket.createdAt?.seconds
      ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
      : "-", 50, y);
    y += 8;

    docPDF.setFont(undefined, "bold"); docPDF.text("Closed At:", 15, y);
    docPDF.setFont(undefined, "normal");
    docPDF.text(ticket.closedAt?.seconds
      ? new Date(ticket.closedAt.seconds * 1000).toLocaleString()
      : ticket.remarks && Array.isArray(ticket.remarks)
        ? (() => {
          const lastRemark = ticket.remarks[ticket.remarks.length - 1];
          return lastRemark?.at
            ? new Date(lastRemark.at).toLocaleString()
            : "-";
        })()
        : "-", 50, y);
    y += 8;

    docPDF.setFont(undefined, "bold"); docPDF.text("Status:", 15, y);
    docPDF.setFont(undefined, "normal"); docPDF.text(ticket.status, 50, y);
    y += 10;

    docPDF.setFont(undefined, "bold");
    docPDF.text("Remarks:", 15, y);
    docPDF.setFont(undefined, "normal");
    y += 7;

    if (Array.isArray(ticket.remarks) && ticket.remarks.length > 0) {
      ticket.remarks.forEach((remark, ridx) => {
        let rStr = `• [${remark.status}] By: ${remark.by} At: ${new Date(remark.at).toLocaleString()}`;
        let rText = `  ${remark.text}`;
        const splitR = docPDF.splitTextToSize(rStr, 160);
        const splitRText = docPDF.splitTextToSize(rText, 160);
        if (y + splitR.length * 7 + splitRText.length * 7 > 270) {
          docPDF.addPage();
          y = 20;
        }
        docPDF.text(splitR, 22, y); y += splitR.length * 7;
        docPDF.text(splitRText, 25, y); y += splitRText.length * 7;
        y += 2;
      });
    } else {
      docPDF.text("No remarks", 22, y);
      y += 7;
    }

    docPDF.save(`ticket${ticket.id}.pdf`);
  };

  const downloadCSVForTicket = (ticket) => {
    const createdAt = ticket.createdAt?.seconds
      ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
      : "";
    const closedAt = ticket.closedAt?.seconds
      ? new Date(ticket.closedAt.seconds * 1000).toLocaleString()
      : ticket.remarks && Array.isArray(ticket.remarks)
        ? (() => {
          const lastRemark = ticket.remarks[ticket.remarks.length - 1];
          return lastRemark?.at
            ? new Date(lastRemark.at).toLocaleString()
            : "";
        })()
        : "";
    const remarksString = Array.isArray(ticket.remarks)
      ? ticket.remarks.map(
        r => `[${r.status}] By: ${r.by} At: ${new Date(r.at).toLocaleString()} | ${r.text.replace(/[\r\n]+/g, " ")}`
      ).join(" || ")
      : "";
    const csv =
      "Ticket ID,Problem,Department,Description,Created At,Closed At,Status,Remarks\n" +
      [
        `"${ticket.id}"`,
        `"${ticket.problem || ""}"`,
        `"${ticket.department || ""}"`,
        `"${(ticket.description || "").replace(/[\r\n]+/g, " ")}"`,
        `"${createdAt}"`,
        `"${closedAt}"`,
        `"${ticket.status || ""}"`,
        `"${remarksString}"`
      ].join(",") + "\n";

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ticket${ticket.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadClick = (event, ticket) => {
    setAnchorEl(event.currentTarget);
    setSelectedTicketForDownload(ticket);
  };

  const handleDownloadClose = () => {
    setAnchorEl(null);
    setSelectedTicketForDownload(null);
  };

  const handleDownloadPDFOption = () => {
    if (selectedTicketForDownload) {
      downloadPDF(selectedTicketForDownload);
    }
    setAnchorEl(null);
  };

  const handleDownloadCSVOption = () => {
    if (selectedTicketForDownload) {
      downloadCSVForTicket(selectedTicketForDownload);
    }
    setAnchorEl(null);
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicketDetails(ticket);
  };

  const cellStyles = {
    fontSize: { xs: "0.75rem", sm: "0.85rem", md: "0.9rem" },
    color: "#20253a",
    verticalAlign: "top",
    borderBottom: "1px solid #e0e7ef",
    py: { xs: 1, sm: 1.5 },
    fontFamily: "'Inter', sans-serif",
  };

  const chipStyles = {
    fontWeight: 600,
    fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.85rem" },
    letterSpacing: "0.03em",
    fontFamily: "'Inter', sans-serif",
  };

  const tableHeaderStyles = {
    background: "#f3f6fb",
    color: "#123499",
    fontWeight: 700,
    fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
    borderBottom: "2px solid #dde3ee",
    py: { xs: 1, sm: 1.5 },
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "#121212",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          px: { xs: 1, sm: 2 },
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
        }}
        role="banner"
        aria-label="Main Navigation"
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              color="inherit"
              onClick={() => setDrawerOpen(!drawerOpen)}
              edge="start"
              sx={{
                mr: { xs: 1, sm: 2 },
                minWidth: 48,
                minHeight: 48,
                color: "#FFFFFF",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  transform: "scale(1.05)",
                },
                transition: "all 0.3s ease",
              }}
              aria-label="Toggle Navigation Drawer"
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.6rem" },
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: "#1976D2",
                letterSpacing: "0.03em",
              }}
            >
              Welcome, {username}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isSmallScreen ? "temporary" : "permanent"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerOpen ? drawerWidth : { xs: 60, sm: 70 },
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerOpen ? drawerWidth : { xs: 60, sm: 70 },
            background: "linear-gradient(180deg, #1E1E1E 0%, #252525 100%)",
            color: "#FFFFFF",
            transition: "width 0.3s ease, background-color 0.3s ease",
            overflowX: "hidden",
            boxSizing: "border-box",
            boxShadow: "2px 0 8px rgba(0, 0, 0, 0.3)",
          },
        }}
        role="navigation"
        aria-label="Sidebar Navigation"
      >
        <Toolbar />
        <Box sx={{ px: { xs: 1, sm: 2 }, py: 1, mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "1.3rem", sm: "1.5rem" },
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "0.05em",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              textAlign: drawerOpen ? "left" : "center",
            }}
          >
            {drawerOpen ? "Helpmate" : "H"}
          </Typography>
        </Box>
        <List sx={{ px: { xs: 0.5, sm: 1 } }}>
          {[
            { key: "dashboard", text: "Home", icon: <HomeFilledIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }} /> },
            { key: "create-ticket", text: "Create Ticket", icon: <BookOnlineSharpIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }} /> },
            { key: "view-ticket", text: "View/Edit Ticket", icon: <BookOnlineSharpIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }} /> },
            { key: "knowledge-base", text: "Knowledge Base", icon: <ArticleIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }} /> },
            { key: "reports", text: "Reports", icon: <AssessmentIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }} /> },
            { key: "settings", text: "Settings", icon: <SettingsIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }} /> }, // Added Settings
            { key: "logout", text: "Logout", icon: <LogoutOutlinedIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }} />, onClick: handleLogout },
          ].map(item => (
            <ListItem
              button
              key={item.key}
              onClick={() => item.onClick ? item.onClick() : handleMenuClick(item.key)}
              sx={{
                ...getListItemStyles(item.key),
                py: 1,
                borderRadius: 0,
                "& .MuiListItemText-primary": {
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "1rem" },
                  transition: "color 0.3s ease",
                },
              }}
              aria-label={item.text}
            >
              <ListItemIcon sx={{
                minWidth: { xs: 40, sm: 56 },
                color: selectedPage === item.key ? "#1976D2" : "#FFFFFF",
                transition: "color 0.3s ease",
              }}>
                {item.icon}
              </ListItemIcon>
              {drawerOpen && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: { xs: "0.85rem", sm: "1rem" },
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    color: selectedPage === item.key ? "#1976D2" : "#FFFFFF",
                  }}
                />
              )}
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: "auto", p: { xs: 1, sm: 2 } }}>
          <ListItem sx={{
            "&:hover": {
              backgroundColor: "#2A2A2A",
              "& .MuiListItemIcon-root": { color: "#1976D2" },
              "& .MuiListItemText-primary": { color: "#1976D2" },
              transform: "scale(1.02)",
            },
            transition: "all 0.3s ease",
          }}>
            <ListItemIcon sx={{
              color: "#FFFFFF",
              minWidth: { xs: 40, sm: 56 },
              transition: "color 0.3s ease",
            }}>
              <AccountCircleOutlinedIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }} />
            </ListItemIcon>
            {drawerOpen && (
              <ListItemText
                primary={username}
                primaryTypographyProps={{
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  color: "#FFFFFF",
                  transition: "color 0.3s ease",
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
          p: { xs: 2, sm: 3 },
          mt: 8,
          minHeight: "100vh",
          backgroundColor: "#E5E5E5",
          boxSizing: "border-box",
          width: { xs: "100%", sm: `calc(100% - ${drawerOpen ? drawerWidth.sm : 70}px)` },
          transition: "width 0.3s ease",
        }}
        role="main"
        aria-label="Main Content"
      >

        {checkingPassword ? (
          <Box sx={{ mt: 15, textAlign: "center" }}>
            <CircularProgress size={32} color="primary" />
            <Typography variant="body1" sx={{ mt: 2, fontFamily: "'Inter', sans-serif" }}>
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
                <DialogTitle sx={{ color: "#123499", fontWeight: 600, fontFamily: "'Inter', sans-serif", fontSize: { xs: "1rem", sm: "1.2rem" } }}>
                  Change Your Password
                </DialogTitle>
                <DialogContent>
                  <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
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
                    sx={{ fontFamily: "'Inter', sans-serif", fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                  >
                    Go to Settings
                  </Button>
                </DialogActions>
              </Dialog>
            )}
            {selectedPage === "settings" ? (
              <UserSettings
                username={username}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                onLogout={() => setLogoutDialogOpen(true)}
              />
            ) : (
              <>

                {selectedPage === "dashboard" && (
                  <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 900 }, mx: "auto" }}>
                    <Card
                      sx={{
                        borderRadius: 4,
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        background: "linear-gradient(180deg, #f7faff 0%, #ffffff 100%)",
                        p: { xs: 2, sm: 4 },
                        mb: 3,
                        "&:hover": { transform: "scale(1.01)", boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)" },
                        transition: "all 0.3s ease",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <CardContent sx={{ p: 0, textAlign: "center" }}>
                        <Typography
                          variant="h4"
                          sx={{
                            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            color: "#123499",
                          }}
                        >
                          Welcome, {username}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            fontSize: { xs: "1rem", sm: "1.2rem" },
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 500,
                            color: "#444",
                            mt: 1,
                          }}
                        >
                          Organization: {organization}
                        </Typography>
                      </CardContent>
                    </Card>
                    <UserGraph username={username} />
                    <Box sx={{ mt: 3, p: { xs: 1.5, sm: 2 }, backgroundColor: "#e9f3fa", borderRadius: 2 }}>
                      <Typography>Need help? Explore our <strong>Knowledge Base</strong> for quick answers from FAQs, detailed insights from Articles, or learn from Past Ticket Remarks to resolve issues faster. We're here to support you every step of the way!</Typography>
                    </Box>
                  </Box>
                )}
                {selectedPage === "create-ticket" && <CreateTicketForm onClose={() => setSelectedPage("dashboard")} username={username} />}
                {selectedPage === "view-ticket" && (
                  <ViewTickets
                    username={username}
                    onEdit={(ticketId) => {
                      setSelectedTicketId(ticketId);
                      setSelectedPage("edit-ticket");
                    }}
                  />
                )}
                {selectedPage === "knowledge-base" && (
                  <Box sx={{ width: "100%", maxWidth: { xs: "95%", sm: 600, md: 800 }, mx: "auto" }}>
                    <Typography
                      variant="h5"
                      sx={{
                        mb: 2,
                        color: "#123499",
                        fontSize: { xs: "1.2rem", sm: "1.4rem" },
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                      }}
                    >
                      Knowledge Base
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 1, sm: 2 }, mb: 3 }}>
                      {[
                        { key: "faq", label: "FAQs" },
                        { key: "article", label: "Articles" },
                        { key: "remarks", label: "Past Ticket Remarks" },
                      ].map(tab => (
                        <Button
                          key={tab.key}
                          variant={selectedKnowledgeTab === tab.key ? "contained" : "outlined"}
                          color="primary"
                          onClick={() => handleKnowledgeTab(tab.key)}
                          sx={{
                            borderRadius: 8,
                            px: { xs: 2, sm: 3 },
                            fontWeight: 600,
                            textTransform: "none",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: { xs: "0.8rem", sm: "0.9rem" },
                            minWidth: 48,
                            minHeight: 48,
                            backgroundColor: selectedKnowledgeTab === tab.key ? "#1976D2" : "transparent",
                            color: selectedKnowledgeTab === tab.key ? "#FFFFFF" : "#1976D2",
                            borderColor: "#1976D2",
                            "&:hover": {
                              backgroundColor: selectedKnowledgeTab === tab.key ? "#1565C0" : "rgba(25, 118, 210, 0.1)",
                              borderColor: "#1976D2",
                              transform: "scale(1.05)",
                            },
                            transition: "all 0.3s ease",
                          }}
                          aria-selected={selectedKnowledgeTab === tab.key}
                          role="tab"
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </Box>
                    {selectedKnowledgeTab === "faq" && organization && organization !== "Not Assigned" && (
                      <KnowledgeBase type="faq" organization={organization} />
                    )}
                    {selectedKnowledgeTab === "article" && organization && organization !== "Not Assigned" && (
                      <KnowledgeBase type="article" organization={organization} />
                    )}
                    {selectedKnowledgeTab === "remarks" && (
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 2,
                            color: "#123499",
                            fontSize: { xs: "1rem", sm: "1.2rem" },
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          Past Ticket Remarks
                        </Typography>
                        {loadingClosed ? (
                          <Box sx={{ textAlign: "center", mt: 3 }}>
                            <CircularProgress size={32} color="primary" />
                          </Box>
                        ) : closedTicketsWithRemarks.length === 0 ? (
                          <Typography
                            color="text.secondary"
                            sx={{ mt: 2, textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" }, fontFamily: "'Inter', sans-serif" }}
                          >
                            No past ticket remarks found.
                          </Typography>
                        ) : (
                          <Box>
                            {closedTicketsWithRemarks.map((ticket, idx) => (
                              <Card
                                key={ticket.id}
                                sx={{
                                  mb: 2,
                                  borderRadius: 2,
                                  boxShadow: "0 2px 8px 0 rgba(18, 52, 153, 0.09)",
                                  background: "#f7faff",
                                  border: "1px solid #dde3ee",
                                }}
                              >
                                <CardContent>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => setExpandedTicketIdx(idx === expandedTicketIdx ? null : idx)}
                                  >
                                    <Typography
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: { xs: "0.95rem", sm: "1.1rem" },
                                        color: "#1976D2",
                                        fontFamily: "'Inter', sans-serif",
                                      }}
                                    >
                                      {ticket.problem || "Untitled Ticket"}
                                    </Typography>
                                    {expandedTicketIdx === idx ? (
                                      <ExpandLessIcon sx={{ color: "#1976D2" }} />
                                    ) : (
                                      <ExpandMoreIcon sx={{ color: "#1976D2" }} />
                                    )}
                                  </Box>
                                  <Collapse in={expandedTicketIdx === idx} timeout="auto" unmountOnExit>
                                    <Box sx={{ mt: 2 }}>
                                      <Chip
                                        label={`Ticket ID: ${ticket.id}`}
                                        sx={{
                                          bgcolor: "#e3edfa",
                                          color: "#123499",
                                          fontWeight: 800,
                                          fontFamily: "monospace",
                                          fontSize: { xs: "0.75rem", sm: "0.85rem" },
                                          mb: 1,
                                        }}
                                      />
                                      <Chip
                                        label={ticket.status}
                                        color={statusColorMap[ticket.status] || "default"}
                                        sx={{
                                          fontWeight: 700,
                                          fontSize: { xs: "0.7rem", sm: "0.8rem" },
                                          textTransform: "capitalize",
                                          mb: 1,
                                          ml: 1,
                                        }}
                                      />
                                      <Typography
                                        sx={{
                                          fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                          fontWeight: 600,
                                          color: "#246",
                                          mb: 1,
                                          fontFamily: "'Inter', sans-serif",
                                        }}
                                      >
                                        <span style={{ color: "#0072D0" }}>Department:</span> {ticket.department || "N/A"}
                                      </Typography>
                                      <Box sx={{ pl: 1 }}>
                                        {ticket.remarks.map((remark, rmidx) => (
                                          <Box
                                            key={rmidx}
                                            sx={{
                                              mb: 2,
                                              p: { xs: 1.5, sm: 2 },
                                              borderRadius: 2,
                                              background: "#e9f3fa",
                                              borderLeft: "5px solid #1976D2",
                                              boxShadow: "0 1px 4px 0 rgba(18, 52, 153, 0.08)",
                                            }}
                                          >
                                            <Typography sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, mt: 1, color: "#444", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                              {remark.text}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Box>
                                    </Box>
                                  </Collapse>
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                    {(selectedKnowledgeTab === "faq" || selectedKnowledgeTab === "article" || selectedKnowledgeTab === "remarks") &&
                      (!organization || organization === "Not Assigned") && (
                        <Typography
                          variant="body1"
                          color="error"
                          sx={{ mt: 3, textAlign: "center", fontSize: { xs: "0.85rem", sm: "0.95rem" }, fontFamily: "'Inter', sans-serif" }}
                        >
                          No valid organization assigned. Please contact support.
                        </Typography>
                      )}
                  </Box>
                )}

                {selectedPage === "reports" && (
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        mb: 2,
                        color: "#123499",
                        fontSize: { xs: "1.2rem", sm: "1.4rem" },
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                      }}
                    >
                      Closed Ticket Reports
                    </Typography>
                    <TableContainer
                      component={Paper}
                      sx={{
                        boxShadow: 4,
                        mt: 2,
                        background: "#f9fafd",
                        maxWidth: "100%",
                        overflowX: "auto",
                      }}
                    >
                      <Table
                        size="small"
                        aria-label="Closed Tickets Table"
                      >
                        <TableHead>
                          <TableRow>
                            {[
                              "Ticket ID",
                              "Problem",
                              "Department",
                              "Created At",
                              "Closed At",
                              "Status",
                              "Remarks",
                              "Actions",
                            ].map(header => (
                              <TableCell key={header} sx={tableHeaderStyles} scope="col">
                                {header}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {loadingClosed ? (
                            <TableRow>
                              <TableCell colSpan={8} align="center">
                                <CircularProgress size={28} color="primary" />
                              </TableCell>
                            </TableRow>
                          ) : closedTicketsWithRemarks.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} align="center">
                                <Typography
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" }, fontFamily: "'Inter', sans-serif" }}
                                >
                                  No closed tickets found.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : closedTicketsWithRemarks.map((ticket) => (
                            <TableRow
                              key={ticket.id}
                              onClick={() => handleTicketClick(ticket)}
                              sx={{
                                background: "#fff",
                                "&:hover": { background: "#e9f3fa", transform: "scale(1.01)" },
                                transition: "all 0.3s ease",
                                cursor: "pointer",
                              }}
                            >
                              <TableCell sx={cellStyles}>
                                <Tooltip title={ticket.id} arrow placement="top">
                                  <Chip
                                    label={ticket.id}
                                    variant="outlined"
                                    sx={{
                                      ...chipStyles,
                                      fontFamily: "monospace",
                                      bgcolor: "#eef4fe",
                                    }}
                                  />
                                </Tooltip>
                              </TableCell>
                              <TableCell sx={cellStyles}>
                                <Chip
                                  label={ticket.problem || "N/A"}
                                  color="primary"
                                  variant="outlined"
                                  sx={chipStyles}
                                />
                              </TableCell>
                              <TableCell sx={cellStyles}>
                                <Chip
                                  label={ticket.department || "N/A"}
                                  color="secondary"
                                  variant="outlined"
                                  sx={chipStyles}
                                />
                              </TableCell>
                              <TableCell sx={cellStyles}>
                                {ticket.createdAt?.seconds
                                  ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
                                  : <i>N/A</i>}
                              </TableCell>
                              <TableCell sx={cellStyles}>
                                {ticket.closedAt?.seconds
                                  ? new Date(ticket.closedAt.seconds * 1000).toLocaleString()
                                  : ticket.remarks && Array.isArray(ticket.remarks)
                                    ? (() => {
                                      const lastRemark = ticket.remarks[ticket.remarks.length - 1];
                                      return lastRemark?.at
                                        ? new Date(lastRemark.at).toLocaleString()
                                        : <i>N/A</i>;
                                    })()
                                    : <i>N/A</i>
                                }
                              </TableCell>
                              <TableCell sx={cellStyles}>
                                <Chip
                                  label={ticket.status}
                                  color={statusColorMap[ticket.status] || "default"}
                                  variant="filled"
                                  sx={{ ...chipStyles, textTransform: "capitalize" }}
                                />
                              </TableCell>
                              <TableCell sx={cellStyles}>
                                {Array.isArray(ticket.remarks) && ticket.remarks.length > 0
                                  ? ticket.remarks.slice(0, 2).map((remark, idx) => (
                                    <Box key={idx} sx={{ mb: 1, pl: 1, borderLeft: "2px solid #1976D2" }}>
                                      <Typography sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" }, fontFamily: "'Inter', sans-serif" }}>
                                        <b>Status:</b> {remark.status}
                                      </Typography>
                                      <Typography sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" }, fontFamily: "'Inter', sans-serif" }}>
                                        <b>By:</b> {remark.by} <b>At:</b> {new Date(remark.at).toLocaleString()}
                                      </Typography>
                                      <Typography sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" }, fontFamily: "'Inter', sans-serif" }}>
                                        <b>Remarks:</b> {remark.text}
                                      </Typography>
                                      <Box sx={{ my: 0.5 }} />
                                    </Box>
                                  ))
                                  : <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Inter', sans-serif", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>No remarks</Typography>
                                }
                                {ticket.remarks?.length > 2 && (
                                  <Typography sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" }, color: "#1976D2", fontFamily: "'Inter', sans-serif" }}>
                                    +{ticket.remarks.length - 2} more remarks
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={cellStyles}>
                                <IconButton
                                  onClick={(e) => handleDownloadClick(e, ticket)}
                                  size="small"
                                  sx={{ color: "#123499", minWidth: 48, minHeight: 48, "&:hover": { transform: "scale(1.05)" }, transition: "all 0.3s ease" }}
                                  aria-label={`Download options for ticket ${ticket.id}`}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                                <Menu
                                  anchorEl={anchorEl}
                                  open={openDownloadMenu && selectedTicketForDownload?.id === ticket.id}
                                  onClose={handleDownloadClose}
                                  MenuListProps={{ 'aria-labelledby': `download-button-${ticket.id}` }}
                                >
                                  <MenuItem
                                    onClick={handleDownloadPDFOption}
                                    sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, minHeight: 48, fontFamily: "'Inter', sans-serif" }}
                                  >
                                    Download as PDF
                                  </MenuItem>
                                  <MenuItem
                                    onClick={handleDownloadCSVOption}
                                    sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, minHeight: 48, fontFamily: "'Inter', sans-serif" }}
                                  >
                                    Download as CSV
                                  </MenuItem>
                                </Menu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {selectedTicketDetails && (
                      <Dialog
                        open={Boolean(selectedTicketDetails)}
                        onClose={() => setSelectedTicketDetails(null)}
                        maxWidth="md"
                        fullWidth
                        sx={{ "& .MuiDialog-paper": { maxWidth: { xs: "95%", sm: 600, md: 900 } } }}
                        aria-labelledby="ticket-details-dialog-title"
                        aria-describedby="ticket-details-dialog-description"
                      >
                        <DialogTitle
                          id="ticket-details-dialog-title"
                          sx={{
                            backgroundColor: "#121212",
                            color: "#1976D2",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: { xs: "1.2rem", sm: "1.4rem" },
                            fontWeight: 600,
                          }}
                        >
                          Ticket Details - {selectedTicketDetails.id}
                        </DialogTitle>
                        <DialogContent>
                          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 1,
                                color: "#123499",
                                fontSize: { xs: "1rem", sm: "1.2rem" },
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 600,
                              }}
                              id="ticket-details-dialog-description"
                            >
                              Problem: {selectedTicketDetails.problem || "N/A"}
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                mb: 1,
                                color: "#444",
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              <strong>Department:</strong> {selectedTicketDetails.department || "N/A"}
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{
                                mb: 2,
                                color: "#444",
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              <strong>Description:</strong> {selectedTicketDetails.description || "N/A"}
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                mb: 1,
                                color: "#444",
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              <strong>Created At:</strong> {selectedTicketDetails.createdAt?.seconds
                                ? new Date(selectedTicketDetails.createdAt.seconds * 1000).toLocaleString()
                                : "N/A"}
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                mb: 1,
                                color: "#444",
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              <strong>Closed At:</strong> {selectedTicketDetails.closedAt?.seconds
                                ? new Date(selectedTicketDetails.closedAt.seconds * 1000).toLocaleString()
                                : selectedTicketDetails.remarks && Array.isArray(selectedTicketDetails.remarks)
                                  ? (() => {
                                    const lastRemark = selectedTicketDetails.remarks[selectedTicketDetails.remarks.length - 1];
                                    return lastRemark?.at
                                      ? new Date(lastRemark.at).toLocaleString()
                                      : "N/A";
                                  })()
                                  : "N/A"}
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                mb: 1,
                                color: "#444",
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              <strong>Status:</strong> {selectedTicketDetails.status}
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{
                                mt: 2,
                                mb: 1,
                                color: "#123499",
                                fontSize: { xs: "1rem", sm: "1.2rem" },
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 600,
                              }}
                            >
                              Remarks:
                            </Typography>
                            {Array.isArray(selectedTicketDetails.remarks) && selectedTicketDetails.remarks.length > 0 ? (
                              selectedTicketDetails.remarks.map((remark, idx) => (
                                <Box
                                  key={idx}
                                  sx={{
                                    mb: 2,
                                    p: { xs: 1.5, sm: 2 },
                                    borderRadius: 2,
                                    background: "#e9f3fa",
                                    borderLeft: "5px solid #1976D2",
                                  }}
                                >
                                  <Typography sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, color: "#444", fontFamily: "'Inter', sans-serif" }}>
                                    <strong>Status:</strong> {remark.status}
                                  </Typography>
                                  <Typography sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, color: "#444", fontFamily: "'Inter', sans-serif" }}>
                                    <strong>By:</strong> {remark.by} <strong>At:</strong> {new Date(remark.at).toLocaleString()}
                                  </Typography>
                                  <Typography sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, color: "#444", fontFamily: "'Inter', sans-serif" }}>
                                    <strong>Text:</strong> {remark.text}
                                  </Typography>
                                </Box>
                              ))
                            ) : (
                              <Typography color="text.secondary" sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, fontFamily: "'Inter', sans-serif" }}>
                                No remarks available
                              </Typography>
                            )}
                          </Box>
                        </DialogContent>
                        <DialogActions>
                          <Button
                            onClick={() => setSelectedTicketDetails(null)}
                            color="primary"
                            sx={{ minWidth: 48, minHeight: 48, fontSize: { xs: "0.8rem", sm: "0.9rem" }, fontFamily: "'Inter', sans-serif" }}
                            aria-label="Close Ticket Details"
                          >
                            Close
                          </Button>
                        </DialogActions>
                      </Dialog>
                    )}
                  </Box>
                )}


                <Dialog
                  open={logoutDialogOpen}
                  onClose={() => setLogoutDialogOpen(false)}
                  aria-labelledby="logout-dialog-title"
                  aria-describedby="logout-dialog-description"
                  sx={{ "& .MuiDialog-paper": { maxWidth: { xs: "90%", sm: 400 } } }}
                >
                  <DialogTitle
                    id="logout-dialog-title"
                    sx={{ fontSize: { xs: "1.2rem", sm: "1.4rem" }, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                  >
                    Confirm Logout
                  </DialogTitle>
                  <DialogContent>
                    <Typography
                      id="logout-dialog-description"
                      variant="body1"
                      sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" }, fontFamily: "'Inter', sans-serif" }}
                    >
                      Are you sure you want to logout?
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button
                      onClick={() => setLogoutDialogOpen(false)}
                      color="primary"
                      sx={{ minWidth: 48, minHeight: 48, fontSize: { xs: "0.8rem", sm: "0.9rem" }, fontFamily: "'Inter', sans-serif" }}
                      aria-label="Cancel Logout"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmLogout}
                      color="error"
                      variant="contained"
                      sx={{ minWidth: 48, minHeight: 48, fontSize: { xs: "0.8rem", sm: "0.9rem" }, fontFamily: "'Inter', sans-serif" }}
                      aria-label="Confirm Logout"
                    >
                      Logout
                    </Button>
                  </DialogActions>
                </Dialog>
                {selectedPage === "settings" && (
                  <UserSettings
                    username={username}
                    themeMode={themeMode}
                    setThemeMode={setThemeMode}
                    onLogout={() => setLogoutDialogOpen(true)}
                  />
                )}
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default UserHome;