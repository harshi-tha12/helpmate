import React, { useState, useEffect } from "react";
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Collapse, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Tooltip, CircularProgress, Menu, MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeFilledIcon from "@mui/icons-material/HomeFilled";
import BookOnlineSharpIcon from "@mui/icons-material/BookOnlineSharp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ArrowRightOutlinedIcon from "@mui/icons-material/ArrowRightOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useNavigate } from "react-router-dom";
import CreateTicketForm from "./createticket.js";
import ViewTickets from "./viewticket.js";
import KnowledgeBase from './knowledgebase.js';
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const drawerWidth = 280;

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
  const [ticketManagementOpen, setTicketManagementOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [closedTickets, setClosedTickets] = useState([]);
  const [loadingClosed, setLoadingClosed] = useState(false);

  // Menu for download options
  const [anchorEl, setAnchorEl] = useState(null);
  const openDownloadMenu = Boolean(anchorEl);

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
            setOrganization(data.orgName || data.organization || "Not Assigned");
          }
        } catch (error) {
          setOrganization("Not Assigned");
        }
      };
      fetchOrganization();
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedPage === "reports" && username) {
      setLoadingClosed(true);
      const fetchClosedTickets = async () => {
        try {
          const q = query(
            collection(db, "tickets"),
            where("createdBy", "==", username),
            where("status", "==", "Closed")
          );
          const snapshot = await getDocs(q);
          const closed = [];
          snapshot.forEach(docSnap => {
            closed.push({ id: docSnap.id, ...docSnap.data() });
          });
          setClosedTickets(closed);
        } catch (error) {
          setClosedTickets([]);
        }
        setLoadingClosed(false);
      };
      fetchClosedTickets();
    }
  }, [selectedPage, username]);

  const handleMenuClick = (pageKey) => {
    if (selectedPage === pageKey) {
      setDrawerOpen(!drawerOpen);
    } else {
      setSelectedPage(pageKey);
      setDrawerOpen(true);
    }
  };

  const getListItemStyles = (itemKey) => ({
    borderRadius: selectedPage === itemKey ? "50px" : "0px",
    backgroundColor: selectedPage === itemKey ? "#0072D0" : "transparent",
    mx: 1,
    my: 0.5,
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

  // PDF per-ticket, each with its own file named by ticket id
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

    // Remarks
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

  // CSV for all closed tickets
  // In your component:

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

    // Download
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
  // Download menu handlers
  const handleDownloadClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleDownloadClose = () => {
    setAnchorEl(null);
  };

  // For PDF: Show menu of tickets. On click, generate that ticket's PDF.
  const handleDownloadPDFOption = (ticket) => {
    downloadPDF(ticket);
    setAnchorEl(null);
  };
  // For CSV: Just call downloadCSV
  const handleDownloadCSVOption = () => {
    downloadCSVForTicket();
    setAnchorEl(null);
  };

  const cellStyles = {
    fontSize: "1rem",
    color: "#20253a",
    verticalAlign: "top",
    borderBottom: "1px solid #e0e7ef",
  };

  const chipStyles = {
    fontWeight: 600,
    fontSize: "0.9rem",
    letterSpacing: "0.03em",
  };

  const tableHeaderStyles = {
    background: "#f3f6fb",
    color: "#123499",
    fontWeight: 700,
    fontSize: "1.07rem",
    borderBottom: "2px solid #dde3ee",
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ backgroundColor: "#123499", zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton color="inherit" onClick={() => setDrawerOpen(!drawerOpen)} edge="start" sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ fontSize: "1.8rem", fontFamily: "'Playfair Display', serif" }}
            >
              Welcome, {username}
            </Typography>
          </Box>
          <Box>
            <Button
              color="inherit"
              onClick={() => setSelectedPage("faqs")}
              sx={{ fontFamily: "'PT Serif', serif", mx: 1, fontSize: "1rem", borderBottom: selectedPage === "faqs" ? "2px solid white" : "none" }}
            >
              FAQs
            </Button>
            <Button
              color="inherit"
              onClick={() => setSelectedPage("articles")}
              sx={{ fontFamily: "'PT Serif', serif", mx: 1, fontSize: "1rem", borderBottom: selectedPage === "articles" ? "2px solid white" : "none" }}
            >
              Articles
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? drawerWidth : 70,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerOpen ? drawerWidth : 70,
            backgroundColor: "#123499",
            color: "#fff",
            transition: "width 0.3s",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
        <List>
          <ListItem button onClick={() => handleMenuClick("dashboard")} sx={getListItemStyles("dashboard")}>
            <ListItemIcon sx={{ color: "white" }}>
              <HomeFilledIcon sx={{ fontSize: "1.8rem" }} />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Home" primaryTypographyProps={{ fontSize: "1.1rem", fontFamily: "'PT Serif', serif" }} />}
          </ListItem>
          <ListItem button onClick={() => {
            setTicketManagementOpen(!ticketManagementOpen);
            handleMenuClick("ticket-management");
          }} sx={getListItemStyles("ticket-management")}>
            <ListItemIcon sx={{ color: "white" }}>
              <BookOnlineSharpIcon sx={{ fontSize: "1.8rem" }} />
            </ListItemIcon>
            {drawerOpen && (
              <>
                <ListItemText primary="Ticket Management" primaryTypographyProps={{ fontSize: "1.1rem", fontFamily: "'PT Serif', serif" }} />
                {ticketManagementOpen ? <ExpandLess /> : <ExpandMore />}
              </>
            )}
          </ListItem>
          <Collapse in={ticketManagementOpen && drawerOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {[
                { key: "create-ticket", label: "Create Ticket" },
                { key: "view-ticket", label: "View/Edit Ticket" },
              ].map((item) => (
                <ListItem button key={item.key} onClick={() => handleMenuClick(item.key)} sx={getListItemStyles(item.key)}>
                  <ListItemIcon sx={{ color: "white" }}>
                    <ArrowRightOutlinedIcon sx={{ fontSize: "1.5rem" }} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "1rem", fontFamily: "'PT Serif', serif" }} />
                </ListItem>
              ))}
            </List>
          </Collapse>
          <ListItem button onClick={() => handleMenuClick("reports")} sx={getListItemStyles("reports")}>
            <ListItemIcon sx={{ color: "white" }}>
              <AssessmentIcon sx={{ fontSize: "1.8rem" }} />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Reports" primaryTypographyProps={{ fontSize: "1.1rem", fontFamily: "'PT Serif', serif" }} />}
          </ListItem>
          <ListItem button onClick={handleLogout}>
            <ListItemIcon sx={{ color: "white" }}>
              <LogoutOutlinedIcon sx={{ fontSize: "1.8rem" }} />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: "1.1rem", fontFamily: "'PT Serif', serif" }} />}
          </ListItem>
        </List>
        <Box sx={{ mt: "auto", p: 2 }}>
          <ListItem>
            <ListItemIcon sx={{ color: "white" }}>
              <AccountCircleOutlinedIcon sx={{ fontSize: "1.8rem" }} />
            </ListItemIcon>
            {drawerOpen && <ListItemText primary={username} primaryTypographyProps={{ fontSize: "1rem", fontFamily: "'PT Serif', serif", fontWeight: 500 }} />}
          </ListItem>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, minHeight: "100vh", backgroundColor: "#E5E5E5" }}>
        {selectedPage === "dashboard" && (
          <Box>
            <Typography variant="h5">Dashboard Content Here</Typography>
            <Typography variant="h6" sx={{ mt: 2, color: "#123499", fontFamily: "'Playfair Display', serif" }}>
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
        {selectedPage === "faqs" && <KnowledgeBase type="faq" />}
        {selectedPage === "articles" && <KnowledgeBase type="article" />}

        {selectedPage === "reports" && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2, color: "#123499" }}>Closed Ticket Reports</Typography>
            <Button
              variant="contained"
              color="primary"
              endIcon={<ArrowDropDownIcon />}
              onClick={handleDownloadClick}
              disabled={closedTickets.length === 0}
              sx={{ mb: 2 }}
            >
              Download
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={openDownloadMenu}
              onClose={handleDownloadClose}
              MenuListProps={{ 'aria-labelledby': 'download-button' }}
            >
              {closedTickets.map(ticket => (
                <React.Fragment key={ticket.id}>
                  <MenuItem
                    disabled={!ticket.id}
                    onClick={() => handleDownloadPDFOption(ticket)}
                  >
                    Download as PDF ({ticket.id})
                  </MenuItem>
                  <MenuItem
                    disabled={!ticket.id}
                    onClick={() => downloadCSVForTicket(ticket)}
                  >
                    Download as CSV ({ticket.id})
                  </MenuItem>
                </React.Fragment>
              ))}
            </Menu>
            <TableContainer component={Paper} sx={{
              borderRadius: 3,
              boxShadow: 4,
              mt: 2,
              background: "#f9fafd"
            }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableHeaderStyles}>Ticket ID</TableCell>
                    <TableCell sx={tableHeaderStyles}>Problem</TableCell>
                    <TableCell sx={tableHeaderStyles}>Department</TableCell>
                    <TableCell sx={tableHeaderStyles}>Description</TableCell>
                    <TableCell sx={tableHeaderStyles}>Created At</TableCell>
                    <TableCell sx={tableHeaderStyles}>Closed At</TableCell>
                    <TableCell sx={tableHeaderStyles}>Status</TableCell>
                    <TableCell sx={tableHeaderStyles}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingClosed ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress size={28} color="primary" />
                      </TableCell>
                    </TableRow>
                  ) : closedTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary" fontSize={16}>
                          No closed tickets found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : closedTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      sx={{
                        background: "#fff",
                        "&:hover": { background: "#e9f3fa" },
                        transition: "background 0.1s"
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
                      <TableCell sx={{ ...cellStyles, maxWidth: 180 }}>
                        <Tooltip title={ticket.description || "N/A"} arrow>
                          <span style={{
                            display: "inline-block",
                            maxWidth: 170,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}>
                            {ticket.description || <i>N/A</i>}
                          </span>
                        </Tooltip>
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
                          ? ticket.remarks.map((remark, idx) => (
                            <Box key={idx} sx={{ mb: 1, pl: 1, borderLeft: "2px solid #1976d2" }}>
                              <Typography sx={{ fontSize: "0.85rem" }}>
                                <b>Status:</b> {remark.status}
                              </Typography>
                              <Typography sx={{ fontSize: "0.85rem" }}>
                                <b>By:</b> {remark.by} <b>At:</b> {new Date(remark.at).toLocaleString()}
                              </Typography>
                              <Typography sx={{ fontSize: "0.85rem" }}>
                                <b>Remarks:</b> {remark.text}
                              </Typography>
                              <Box sx={{ my: 0.5 }} />
                            </Box>
                          ))
                          : <Typography variant="body2" color="text.secondary">No remarks</Typography>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        <Dialog
          open={logoutDialogOpen}
          onClose={() => setLogoutDialogOpen(false)}
          aria-labelledby="logout-dialog-title"
        >
          <DialogTitle id="logout-dialog-title">Confirm Logout</DialogTitle>
          <DialogContent>
            <Typography variant="body1">Are you sure you want to logout?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogoutDialogOpen(false)} color="primary">Cancel</Button>
            <Button onClick={confirmLogout} color="error" variant="contained">Logout</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default UserHome;