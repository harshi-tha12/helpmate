import React, { useState, useEffect } from "react";
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Tooltip, CircularProgress, Menu, MenuItem, Card, CardContent, Collapse
} from "@mui/material";
import { useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from "@mui/icons-material/Menu";
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
import autoTable from "jspdf-autotable";

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

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      const fetchOrganization = async () => {
        try {
          const userRef = doc(db, "Users", storedUsername);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            const org = data.orgName || data.organization || "Not Assigned";
            setOrganization(org);
          } else {
            setOrganization("Not Assigned");
          }
        } catch (error) {
          setOrganization("Not Assigned");
        }
      };
      fetchOrganization();
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
    borderRadius: selectedPage === itemKey ? "50px" : "0px",
    backgroundColor: selectedPage === itemKey ? "#0072D0" : "transparent",
    mx: { xs: 0.5, sm: 1 },
    my: 0.5,
    minHeight: 48,
    "&:hover": {
      backgroundColor: "#005f87",
      borderRadius: "50px",
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
    fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
    color: "#20253a",
    verticalAlign: "top",
    borderBottom: "1px solid #e0e7ef",
    py: { xs: 1, sm: 1.5 },
  };

  const chipStyles = {
    fontWeight: 600,
    fontSize: { xs: "0.75rem", sm: "0.85rem", md: "0.9rem" },
    letterSpacing: "0.03em",
  };

  const tableHeaderStyles = {
    background: "#f3f6fb",
    color: "#123499",
    fontWeight: 700,
    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1.07rem" },
    borderBottom: "2px solid #dde3ee",
    py: { xs: 1, sm: 1.5 },
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "#123499",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          px: { xs: 1, sm: 2 },
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
              sx={{ mr: { xs: 1, sm: 2 }, minWidth: 48, minHeight: 48 }}
              aria-label="Toggle Navigation Drawer"
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
                fontFamily: "'Playfair Display', serif",
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
            backgroundColor: "#123499",
            color: "#fff",
            transition: "width 0.3s",
            overflowX: "hidden",
            boxSizing: "border-box",
          },
        }}
        role="navigation"
        aria-label="Sidebar Navigation"
      >
        <Toolbar />
        <List>
          {[
            { key: "dashboard", text: "Home", icon: <HomeFilledIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.8rem" } }} /> },
            { key: "create-ticket", text: "Create Ticket", icon: <BookOnlineSharpIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.8rem" } }} /> },
            { key: "view-ticket", text: "View/Edit Ticket", icon: <BookOnlineSharpIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.8rem" } }} /> },
            { key: "knowledge-base", text: "Knowledge Base", icon: <ArticleIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.8rem" } }} /> },
            { key: "reports", text: "Reports", icon: <AssessmentIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.8rem" } }} /> },
            { key: "logout", text: "Logout", icon: <LogoutOutlinedIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.8rem" } }} />, onClick: handleLogout },
          ].map(item => (
            <ListItem
              button
              key={item.key}
              onClick={() => item.onClick ? item.onClick() : handleMenuClick(item.key)}
              sx={getListItemStyles(item.key)}
              aria-label={item.text}
            >
              <ListItemIcon sx={{ color: "white", minWidth: { xs: 40, sm: 56 } }}>
                {item.icon}
              </ListItemIcon>
              {drawerOpen && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: { xs: "0.9rem", sm: "1.1rem" },
                    fontFamily: "'PT Serif', serif",
                  }}
                />
              )}
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: "auto", p: { xs: 1, sm: 2 } }}>
          <ListItem>
            <ListItemIcon sx={{ color: "white", minWidth: { xs: 40, sm: 56 } }}>
              <AccountCircleOutlinedIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.8rem" } }} />
            </ListItemIcon>
            {drawerOpen && (
              <ListItemText
                primary={username}
                primaryTypographyProps={{
                  fontSize: { xs: "0.9rem", sm: "1rem" },
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
          p: { xs: 2, sm: 3 },
          mt: 8,
          minHeight: "100vh",
          backgroundColor: "#E5E5E5",
          boxSizing: "border-box",
          width: { xs: "100%", sm: `calc(100% - ${drawerOpen ? drawerWidth.sm : 70}px)` },
        }}
        role="main"
        aria-label="Main Content"
      >
        {selectedPage === "dashboard" && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" }, color: "#123499" }}>
              Dashboard Content Here
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mt: 2,
                color: "#123499",
                fontFamily: "'Playfair Display', serif",
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              Organization: {organization}
            </Typography>
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
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
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
                    fontWeight: 700,
                    textTransform: "none",
                    fontFamily: "'PT Serif', serif",
                    fontSize: { xs: "0.85rem", sm: "1rem" },
                    minWidth: 48,
                    minHeight: 48,
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
                    fontSize: { xs: "1rem", sm: "1.25rem" },
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
                    sx={{ mt: 2, textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem" } }}
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
                                fontSize: { xs: "1rem", sm: "1.15rem" },
                                color: "#1976d2",
                                fontFamily: "'PT Serif', serif",
                              }}
                            >
                              {ticket.problem || "Untitled Ticket"}
                            </Typography>
                            {expandedTicketIdx === idx ? (
                              <ExpandLessIcon sx={{ color: "#1976d2" }} />
                            ) : (
                              <ExpandMoreIcon sx={{ color: "#1976d2" }} />
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
                                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                                  mb: 1,
                                }}
                              />
                              <Chip
                                label={ticket.status}
                                color={statusColorMap[ticket.status] || "default"}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: { xs: "0.75rem", sm: "0.85rem" },
                                  textTransform: "capitalize",
                                  mb: 1,
                                  ml: 1,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: { xs: "0.9rem", sm: "1rem" },
                                  fontWeight: 600,
                                  color: "#246",
                                  mb: 1,
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
                                      borderLeft: "5px solid #1976d2",
                                      boxShadow: "0 1px 4px 0 rgba(18, 52, 153, 0.08)",
                                    }}
                                  >
                                    <Typography sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, mt: 1, color: "#444", fontWeight: 500 }}>
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
                  sx={{ mt: 3, textAlign: "center", fontSize: { xs: "0.9rem", sm: "1rem" } }}
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
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
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
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                        "&:hover": { background: "#e9f3fa" },
                        transition: "background 0.1s",
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
                            <Box key={idx} sx={{ mb: 1, pl: 1, borderLeft: "2px solid #1976d2" }}>
                              <Typography sx={{ fontSize: { xs: "0.75rem", sm: "0.85rem" } }}>
                                <b>Status:</b> {remark.status}
                              </Typography>
                              <Typography sx={{ fontSize: { xs: "0.75rem", sm: "0.85rem" } }}>
                                <b>By:</b> {remark.by} <b>At:</b> {new Date(remark.at).toLocaleString()}
                              </Typography>
                              <Typography sx={{ fontSize: { xs: "0.75rem", sm: "0.85rem" } }}>
                                <b>Remarks:</b> {remark.text}
                              </Typography>
                              <Box sx={{ my: 0.5 }} />
                            </Box>
                          ))
                          : <Typography variant="body2" color="text.secondary">No remarks</Typography>
                        }
                        {ticket.remarks?.length > 2 && (
                          <Typography sx={{ fontSize: { xs: "0.75rem", sm: "0.85rem" }, color: "#1976d2" }}>
                            +{ticket.remarks.length - 2} more remarks
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={cellStyles}>
                        <IconButton
                          onClick={(e) => handleDownloadClick(e, ticket)}
                          size="small"
                          sx={{ color: "#123499", minWidth: 48, minHeight: 48 }}
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
                            sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, minHeight: 48 }}
                          >
                            Download as PDF
                          </MenuItem>
                          <MenuItem
                            onClick={handleDownloadCSVOption}
                            sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, minHeight: 48 }}
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
                    backgroundColor: "#123499",
                    color: "#fff",
                    fontFamily: "'Playfair Display', serif",
                    fontSize: { xs: "1.25rem", sm: "1.5rem" },
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
                        fontSize: { xs: "1rem", sm: "1.25rem" },
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
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                      }}
                    >
                      <strong>Department:</strong> {selectedTicketDetails.department || "N/A"}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: 2,
                        color: "#444",
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                      }}
                    >
                      <strong>Description:</strong> {selectedTicketDetails.description || "N/A"}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mb: 1,
                        color: "#444",
                        fontSize: { xs: "0.9rem", sm: "1rem" },
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
                        fontSize: { xs: "0.9rem", sm: "1rem" },
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
                        fontSize: { xs: "0.9rem", sm: "1rem" },
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
                        fontSize: { xs: "1rem", sm: "1.25rem" },
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
                            borderLeft: "5px solid #1976d2",
                          }}
                        >
                          <Typography sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, color: "#444" }}>
                            <strong>Status:</strong> {remark.status}
                          </Typography>
                          <Typography sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, color: "#444" }}>
                            <strong>By:</strong> {remark.by} <strong>At:</strong> {new Date(remark.at).toLocaleString()}
                          </Typography>
                          <Typography sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, color: "#444" }}>
                            <strong>Text:</strong> {remark.text}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography color="text.secondary" sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}>
                        No remarks available
                      </Typography>
                    )}
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => setSelectedTicketDetails(null)}
                    color="primary"
                    sx={{ minWidth: 48, minHeight: 48, fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
            sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
          >
            Confirm Logout
          </DialogTitle>
          <DialogContent>
            <Typography
              id="logout-dialog-description"
              variant="body1"
              sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              Are you sure you want to logout?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setLogoutDialogOpen(false)}
              color="primary"
              sx={{ minWidth: 48, minHeight: 48, fontSize: { xs: "0.85rem", sm: "1rem" } }}
              aria-label="Cancel Logout"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmLogout}
              color="error"
              variant="contained"
              sx={{ minWidth: 48, minHeight: 48, fontSize: { xs: "0.85rem", sm: "1rem" } }}
              aria-label="Confirm Logout"
            >
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default UserHome;