import React, { useEffect, useState } from "react";
import {
  Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Select, MenuItem, CircularProgress, Alert, Chip, Stack, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, Divider, TextField, Card, CardContent, Collapse, IconButton, useTheme, useMediaQuery, Slider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CloseIcon from "@mui/icons-material/Close";
import { db } from "../../firebase";
import { collection, getDocs, query, where, updateDoc, doc, getDoc } from "firebase/firestore";
import { getAgentSuggestions } from "../../api/agentsuggestion"; // New import

// Blue palette (consistent with TicketDetails.jsx)
const palette = {
  accent: "#1976d2",
  accentDark: "#115293",
  accentLight: "#e3f2fd",
  border: "#b3c7e6",
};

const statusOrder = ["Open", "In Progress", "Resolved", "Closed"];
const statusColor = {
  Open: "info",
  "In Progress": "warning",
  Resolved: "success",
  Closed: "default",
};

// Priority color mapping utility
const priorityColorMap = {
  high: { bg: "#ffebee", color: "#d32f2f" },
  medium: { bg: "#fff8e1", color: "#ff9800" },
  low: { bg: "#e8f5e9", color: "#388e3c" },
  default: { bg: "#e0eafd", color: "#153570" },
};
const getPriorityInfo = (priority) => {
  let pri = typeof priority === "object" && priority !== null
    ? priority.priority
    : priority;
  pri = (pri || "").toLowerCase();
  if (!(pri in priorityColorMap)) pri = "default";
  return {
    label: typeof priority === "object" && priority !== null
      ? priority.priority
      : priority || "N/A",
    ...priorityColorMap[pri],
  };
};

// Utility to format time difference
const formatTimeDifference = (start, end) => {
  if (!start || !end) return "N/A";

  let startDate;
  if (typeof start === "string" && start.includes(" at ")) {
    const formattedStart = start.replace(" at ", ", ").replace("UTC+5:30", "+0530");
    startDate = new Date(formattedStart);
  } else if (start.toDate) {
    startDate = start.toDate();
  } else {
    startDate = new Date(start);
  }

  const formattedEnd = end.replace(" at ", ", ").replace("GMT+5:30", "+0530");
  const endDate = new Date(formattedEnd);

  if (isNaN(startDate) || isNaN(endDate)) return "Invalid";

  const diffMs = endDate - startDate;
  if (diffMs < 0) return "Invalid";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} hours ${minutes} minutes`;
};

// Modal for zoomed file preview
const FilePreviewModal = ({ open, onClose, fileUrl, fileType, fileName }) => {
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleZoomChange = (event, newValue) => {
    setZoomLevel(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          background: "rgba(0, 0, 0, 0.9)",
          borderRadius: 2,
          maxHeight: "90vh",
          maxWidth: "90vw",
        },
      }}
    >
      <DialogTitle sx={{ fontFamily: "PT Serif", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {fileName || "File Preview"}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: "#fff" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", p: 2 }}>
        <Box sx={{ width: "100%", maxWidth: 600, mb: 2 }}>
          <Typography sx={{ fontFamily: "PT Serif", color: "#fff", fontSize: "0.9rem", mb: 1 }}>
            Zoom: {zoomLevel}%
          </Typography>
          <Slider
            value={zoomLevel}
            onChange={handleZoomChange}
            min={50}
            max={200}
            step={10}
            sx={{
              color: palette.accent,
              "& .MuiSlider-thumb": {
                backgroundColor: "#fff",
                border: `2px solid ${palette.accent}`,
              },
              "& .MuiSlider-rail": {
                backgroundColor: "#fff",
              },
            }}
            aria-label="Zoom level"
          />
        </Box>
        {fileUrl && typeof fileUrl === "string" && fileUrl.startsWith("data:") ? (
          fileUrl.startsWith("data:application/pdf") ? (
            <embed
              src={fileUrl}
              type="application/pdf"
              title={fileName || "PDF Preview"}
              style={{
                width: `${zoomLevel}%`,
                height: `${zoomLevel * 0.8}vh`,
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 8,
                border: `1px solid ${palette.border}`,
              }}
            />
          ) : (
            <img
              src={fileUrl}
              alt={fileName || "attachment"}
              style={{
                transform: `scale(${zoomLevel / 100})`,
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: 8,
                border: `1px solid ${palette.border}`,
                transformOrigin: "center",
              }}
            />
          )
        ) : (
          <Typography sx={{ fontFamily: "PT Serif", color: "#fff" }}>
            Unable to preview this file type. Please download to view.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          href={fileUrl}
          download={fileName || "attachment"}
          sx={{ fontFamily: "PT Serif", color: "#fff", textTransform: "none" }}
        >
          Download
        </Button>
        <Button
          onClick={onClose}
          sx={{ fontFamily: "PT Serif", color: "#fff", textTransform: "none" }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Helper for file preview
const FilePreview = ({ fileUrl, fileType, fileName }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = () => {
    if (fileUrl && typeof fileUrl === "string" && fileUrl.startsWith("data:")) {
      if (
        fileUrl.startsWith("data:application/pdf") ||
        fileUrl.startsWith("data:image/png") ||
        fileUrl.startsWith("data:image/jpeg") ||
        fileUrl.startsWith("data:image/webp")
      ) {
        setModalOpen(true);
      }
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  if (!fileUrl) return null;
  if (typeof fileUrl === "string" && fileUrl.startsWith("data:")) {
    if (fileUrl.startsWith("data:application/pdf")) {
      return (
        <>
          <Box sx={{ mt: 1, cursor: "pointer" }} onClick={handleOpenModal}>
            <Typography sx={{ fontFamily: "PT Serif", color: palette.accentDark, fontSize: "0.9rem" }}>
              <strong>Preview (click to zoom):</strong>
            </Typography>
            <embed
              src={fileUrl}
              type="application/pdf"
              width="100%"
              height="300px"
              style={{ borderRadius: 8, border: `1px solid ${palette.border}` }}
            />
            <Box sx={{ mt: 1 }}>
              <a href={fileUrl} download={fileName || "attachment.pdf"} style={{ color: palette.accent, textDecoration: "underline" }}>
                Download PDF
              </a>
            </Box>
          </Box>
          <FilePreviewModal
            open={modalOpen}
            onClose={handleCloseModal}
            fileUrl={fileUrl}
            fileType={fileType}
            fileName={fileName}
          />
        </>
      );
    } else if (
      fileUrl.startsWith("data:image/png") ||
      fileUrl.startsWith("data:image/jpeg") ||
      fileUrl.startsWith("data:image/webp")
    ) {
      return (
        <>
          <Box sx={{ mt: 1, cursor: "pointer" }} onClick={handleOpenModal}>
            <Typography sx={{ fontFamily: "PT Serif", color: palette.accentDark, fontSize: "0.9rem" }}>
              <strong>Preview (click to zoom):</strong>
            </Typography>
            <img
              src={fileUrl}
              alt={fileName || "attachment"}
              style={{
                maxWidth: "100%",
                maxHeight: 300,
                borderRadius: 8,
                border: `1px solid ${palette.border}`,
              }}
            />
            <Box sx={{ mt: 1 }}>
              <a href={fileUrl} download={fileName || "attachment"} style={{ color: palette.accent, textDecoration: "underline" }}>
                Download Image
              </a>
            </Box>
          </Box>
          <FilePreviewModal
            open={modalOpen}
            onClose={handleCloseModal}
            fileUrl={fileUrl}
            fileType={fileType}
            fileName={fileName}
          />
        </>
      );
    }
  }
  return (
    <Box sx={{ mt: 1 }}>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: palette.accent, textDecoration: "underline" }}
      >
        View/Download Attachment
      </a>
    </Box>
  );
};

const AssignedTickets = () => {
  const [ticketsByStatus, setTicketsByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [loadingUser, setLoadingUser] = useState(false);
  const [statusChange, setStatusChange] = useState({ open: false, ticket: null, newStatus: "", remarks: "" });
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const username = sessionStorage.getItem("username");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // <600px

  // Fetch user info for modal on demand
  const fetchUserDetails = async (userName) => {
    setLoadingUser(true);
    try {
      const userRef = doc(db, "Users", userName);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserDetails(userSnap.data());
      } else {
        setUserDetails({});
      }
    } catch (e) {
      setUserDetails({});
    }
    setLoadingUser(false);
  };

  // Fetch tickets assigned to agent and organization
  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "tickets"), where("assignedAgent", "==", username));
      const querySnapshot = await getDocs(q);
      const allTickets = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const userRef = doc(db, "Users", username);
      const userSnap = await getDoc(userRef);
      const agentOrganization = userSnap.exists() ? userSnap.data().orgName || userSnap.data().organization || "" : "";

      const grouped = {};
      statusOrder.forEach((status) => (grouped[status] = []));
      allTickets.forEach((ticket) => {
        if (ticket.organization === agentOrganization) { 
          const status = statusOrder.includes(ticket.status) ? ticket.status : "Open";
          grouped[status].push(ticket);
        }
      });

      setTicketsByStatus(grouped);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to fetch tickets.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI suggestions when a ticket is selected
  const fetchAiSuggestions = async (ticket) => {
    if (!ticket || !ticket.description || !ticket.organization) return;
    setSuggestionsLoading(true);
    try {
      const suggestions = await getAgentSuggestions({ description: ticket.description, organization: ticket.organization });
      const enrichedSuggestions = await Promise.all(
        (suggestions || []).map(async (s) => {
          const ticketRef = doc(db, "tickets", s.ticketId);
          const ticketSnap = await getDoc(ticketRef);
          return {
            ...s,
            remarks: ticketSnap.exists() ? ticketSnap.data().remarks || [] : [],
          };
        })
      );
      const sortedSuggestions = enrichedSuggestions.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      setAiSuggestions(sortedSuggestions);
    } catch (e) {
      console.warn("Failed to fetch AI suggestions:", e);
      setAiSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line
  }, [username]);

  // For status change: open remarks dialog only for "Closed", otherwise just update
  const handleStatusChange = (ticketId, newStatus, ticket) => {
    setError("");
    if (ticket.status === "Closed") {
      setError("Cannot change status of a closed ticket.");
      return;
    }
    if (newStatus === "Closed") {
      setStatusChange({ open: true, ticket, newStatus, remarks: "" });
    } else {
      updateStatusDirectly(ticketId, newStatus);
    }
  };

  // Update status directly (no remarks)
  const updateStatusDirectly = async (ticketId, newStatus) => {
    setError("");
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: newStatus });
      await fetchTickets();
    } catch (err) {
      setError("Could not update ticket status.");
    }
  };

  // After remarks are added for "Closed"
  const handleRemarksSubmit = async () => {
    setRemarksLoading(true);
    setError("");
    const { ticket, newStatus, remarks } = statusChange;
    try {
      const ticketRef = doc(db, "tickets", ticket.id);
      const now = new Date();
      const closedTime = now.toLocaleString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Kolkata",
        timeZoneName: "short",
      }).replace(",", " at").replace("UTC+5:30", "GMT+5:30");
      let newRemarkEntry = {
        by: username,
        status: newStatus,
        text: remarks,
        at: now.toISOString(),
      };

      const ticketSnap = await getDoc(ticketRef);
      let currentRemarks = [];
      if (ticketSnap.exists() && Array.isArray(ticketSnap.data().remarks)) {
        currentRemarks = ticketSnap.data().remarks;
      }

      const assignedTime = ticketSnap.data().assignedTime || ticket.createdAt;
      const resolvedTime = formatTimeDifference(assignedTime, closedTime);

      await updateDoc(ticketRef, {
        status: newStatus,
        remarks: [...currentRemarks, newRemarkEntry],
        closedTime,
        resolvedTime,
      });
      setStatusChange({ open: false, ticket: null, newStatus: "", remarks: "" });
      await fetchTickets();
    } catch (err) {
      setError("Could not update ticket status or save remarks.");
    } finally {
      setRemarksLoading(false);
    }
  };

  // On row click: open modal and fetch user
  const handleRowClick = async (ticket) => {
    setSelectedTicket(ticket);
    await fetchUserDetails(ticket.createdBy);
    setShowSuggestions(false);  // Reset visibility on new ticket open
    setAiSuggestions([]);  // Clear previous suggestions
  };

  const handleCloseDialog = () => {
    setSelectedTicket(null);
    setUserDetails({});
    setLoadingUser(false);
    setAiSuggestions([]);
    setSuggestionsLoading(false);
    setShowSuggestions(false);
  };

  // Toggle card expansion for mobile
  const handleCardToggle = (ticketId) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId);
  };

  // Table styles
  const tableStyles = {
    borderRadius: 3,
    boxShadow: "0 2px 12px rgba(25, 118, 210, 0.07)",
    border: "1px solid #e3e6f0",
    background: "#fff",
    width: "100%",
    overflowX: "auto",
  };

  const cellStyles = {
    fontSize: { xs: "0.8rem", sm: "0.85rem", md: "0.9rem" },
    color: "#263238",
    borderBottom: "1px solid #f3f3f3",
    cursor: "pointer",
    py: { xs: 1, sm: 1.5 },
  };

  const headerCellStyles = {
    ...cellStyles,
    fontWeight: "bold",
    background: "#f7fbff",
    color: "#1976d2",
    borderBottom: "2px solid #e3e6f0",
    cursor: "default",
  };

  // Render AI Suggestions
  const renderAiSuggestions = () => {
    if (suggestionsLoading) {
      return (
        <Box sx={{ my: 2, display: "flex", alignItems: "center" }}>
          <CircularProgress size={20} sx={{ mr: 1 }} /> Checking for similar past solutions...
        </Box>
      );
    }
    if (!aiSuggestions.length) {
      return (
        <Box sx={{ my: 2, p: 2, border: "1px solid #b3c6e0", borderRadius: "8px", background: "#f6faff" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1976d2", mb: 1 }}>
            No AI suggestions.
          </Typography>
        </Box>
      );
    }
    return (
      <Box sx={{ my: 2, p: 2, border: "1px solid #b3c6e0", borderRadius: "8px", background: "#f6faff" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1976d2", mb: 1 }}>
          Similar Past Solutions:
        </Typography>
        <ul style={{ paddingLeft: 0, listStyle: "none" }}>
          {aiSuggestions.slice(0, 3).map((s, idx) => (
            <li key={idx} style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8, borderRadius: 6 }}>
              <strong>Ticket ID:</strong> {s.ticketId}<br />
              <strong>Solution:</strong>
              {Array.isArray(s.remarks) && s.remarks.length > 0 ? (
                s.remarks.map((remark, rIdx) => (
                  <span key={rIdx}>
                    {remark.text || "No remarks available"}
                    {rIdx < s.remarks.length - 1 && <br />}
                  </span>
                ))
              ) : (
                <span>No remarks available</span>
              )}
              <br /><small>Similarity: {(s.similarity * 100).toFixed(1)}%</small>
            </li>
          ))}
        </ul>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: { xs: "100%", sm: 1200, md: 1400 }, mx: "auto" }}>
      <Typography
        variant="h4"
        sx={{
          color: "#1976d2",
          mb: { xs: 2, sm: 3, md: 4 },
          fontWeight: 700,
          letterSpacing: 1,
          fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
        }}
      >
        Assigned Tickets
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            fontSize: { xs: "0.8rem", sm: "0.85rem" },
          }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : isMobile ? (
        <Box role="list" aria-label="Assigned tickets list">
          {statusOrder.map((status) =>
            (ticketsByStatus[status] || []).length > 0 ? (
              <Box key={status} sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={status}
                    color={statusColor[status]}
                    variant="filled"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      height: 28,
                    }}
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#1976d2",
                      fontWeight: 500,
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    }}
                  >
                    {ticketsByStatus[status].length} ticket{ticketsByStatus[status].length > 1 ? "s" : ""}
                  </Typography>
                </Stack>
                {(ticketsByStatus[status] || []).map((ticket) => {
                  const priorityInfo = getPriorityInfo(ticket.priority);
                  return (
                    <Card
                      key={ticket.id}
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.07)",
                        border: "1px solid #e3e6f0",
                        background: "#fff",
                      }}
                      role="listitem"
                    >
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Chip
                              label={ticket.id}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontFamily: "monospace",
                                fontWeight: 500,
                                fontSize: { xs: "0.75rem", sm: "0.8rem" },
                              }}
                              onClick={() => handleRowClick(ticket)}
                            />
                            <Typography
                              sx={{
                                fontWeight: 600,
                                color: "#1976d2",
                                fontSize: { xs: "0.9rem", sm: "1rem" },
                              }}
                            >
                              {ticket.problem || "N/A"}
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={() => handleCardToggle(ticket.id)}
                            sx={{
                              color: "#1976d2",
                              minWidth: 40,
                              minHeight: 40,
                            }}
                            aria-label={`Toggle details for ticket ${ticket.id}`}
                            aria-expanded={expandedTicketId === ticket.id}
                          >
                            {expandedTicketId === ticket.id ? (
                              <ExpandLessIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                            ) : (
                              <ExpandMoreIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                            )}
                          </IconButton>
                        </Box>
                        <Collapse in={expandedTicketId === ticket.id} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 1.5, bgcolor: "#f7fbff", borderRadius: 1 }}>
                            <Stack spacing={1}>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#1976d2", fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                                >
                                  Priority:
                                </Typography>
                                <Box
                                  sx={{
                                    fontWeight: 700,
                                    fontFamily: "Outfit",
                                    color: priorityInfo.color,
                                    bgcolor: priorityInfo.bg,
                                    borderRadius: 2,
                                    px: 2,
                                    py: 0.5,
                                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                                    display: "inline-block",
                                    minWidth: 64,
                                    textAlign: "center",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {priorityInfo.label || "N/A"}
                                </Box>
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#1976d2", fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                                >
                                  Resolution Time:
                                </Typography>
                                <Typography sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}>
                                  {ticket.resolvedTime || <i>N/A</i>}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#1976d2", fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                                >
                                  Description:
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                                    whiteSpace: "pre-line",
                                  }}
                                >
                                  {ticket.description || <i>N/A</i>}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#1976d2", fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                                >
                                  Created By:
                                </Typography>
                                <Chip
                                  label={ticket.createdBy || "N/A"}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  onClick={() => handleRowClick(ticket)}
                                  sx={{ fontSize: { xs: "0.75rem", sm: "0.8rem" } }}
                                />
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#1976d2", fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                                >
                                  Assigned Time:
                                </Typography>
                                <Typography sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}>
                                  {ticket.assignedTime?.seconds
                                    ? new Date(ticket.assignedTime.seconds * 1000).toLocaleString()
                                    : <i>N/A</i>}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#1976d2", fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                                >
                                  Status:
                                </Typography>
                                {ticket.status === "Closed" ? (
                                  <Chip
                                    label={ticket.status}
                                    color={statusColor[ticket.status]}
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: { xs: "0.8rem", sm: "0.85rem" },
                                      height: 28,
                                    }}
                                  />
                                ) : (
                                  <Select
                                    value={ticket.status || "Open"}
                                    onChange={(e) => handleStatusChange(ticket.id, e.target.value, ticket)}
                                    size="small"
                                    sx={{
                                      minWidth: 120,
                                      fontWeight: 500,
                                      bgcolor: "#f7fbff",
                                      "& .MuiSelect-select": { py: 1 },
                                      fontSize: { xs: "0.8rem", sm: "0.85rem" },
                                    }}
                                  >
                                    {statusOrder.map((option) => (
                                      <MenuItem
                                        key={option}
                                        value={option}
                                        sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                                      >
                                        {option}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                )}
                              </Box>
                            </Stack>
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            ) : null
          )}
          {!loading && statusOrder.every(st => (ticketsByStatus[st] || []).length === 0) && (
            <Alert
              severity="info"
              sx={{
                mt: 2,
                fontSize: { xs: "0.8rem", sm: "0.85rem" },
              }}
            >
              No assigned tickets found.
            </Alert>
          )}
        </Box>
      ) : (
        statusOrder.map((status) =>
          (ticketsByStatus[status] || []).length > 0 ? (
            <Box key={status} sx={{ mb: { xs: 3, sm: 4, md: 5 } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={status}
                  color={statusColor[status]}
                  variant="filled"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" },
                    height: 32,
                  }}
                />
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#1976d2",
                    fontWeight: 500,
                    fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                  }}
                >
                  {ticketsByStatus[status].length} ticket{ticketsByStatus[status].length > 1 ? "s" : ""}
                </Typography>
              </Stack>
              <TableContainer component={Paper} sx={tableStyles}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headerCellStyles}>Priority</TableCell>
                      <TableCell sx={headerCellStyles}>Ticket ID</TableCell>
                      <TableCell sx={headerCellStyles}>Problem</TableCell>
                      <TableCell sx={headerCellStyles}>Resolution Time</TableCell>
                      <TableCell sx={headerCellStyles}>Description</TableCell>
                      <TableCell sx={headerCellStyles}>Created By</TableCell>
                      <TableCell sx={headerCellStyles}>Assigned Time</TableCell>
                      <TableCell sx={headerCellStyles}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(ticketsByStatus[status] || []).map((ticket) => {
                      const priorityInfo = getPriorityInfo(ticket.priority);
                      return (
                        <TableRow
                          key={ticket.id}
                          sx={{
                            transition: "background 0.2s",
                            "&:hover": { background: "#e8f3fc" },
                          }}
                          onClick={() => handleRowClick(ticket)}
                        >
                          <TableCell sx={cellStyles}>
                            <Box
                              sx={{
                                fontWeight: 700,
                                fontFamily: "Outfit",
                                color: priorityInfo.color,
                                bgcolor: priorityInfo.bg,
                                borderRadius: 2,
                                px: 2,
                                py: 0.5,
                                fontSize: { xs: "0.8rem", sm: "0.85rem", md: "0.97rem" },
                                display: "inline-block",
                                minWidth: 64,
                                textAlign: "center",
                                textTransform: "capitalize",
                              }}
                            >
                              {priorityInfo.label || "N/A"}
                            </Box>
                          </TableCell>
                          <TableCell sx={cellStyles}>
                            <Chip
                              label={ticket.id}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontFamily: "monospace",
                                fontWeight: 500,
                                fontSize: { xs: "0.75rem", sm: "0.8rem" },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(ticket);
                              }}
                            />
                          </TableCell>
                          <TableCell sx={cellStyles}>{ticket.problem || <i>N/A</i>}</TableCell>
                          <TableCell sx={cellStyles}>{ticket.resolvedTime || <i>N/A</i>}</TableCell>
                          <TableCell sx={cellStyles} title={ticket.description}>
                            <Box
                              sx={{
                                maxWidth: { xs: 200, sm: 300, md: 400 },
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "inline-block",
                              }}
                            >
                              {ticket.description || <i>N/A</i>}
                            </Box>
                          </TableCell>
                          <TableCell sx={cellStyles}>
                            <Chip
                              label={ticket.createdBy || "N/A"}
                              size="small"
                              color="primary"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(ticket);
                              }}
                              sx={{ fontSize: { xs: "0.75rem", sm: "0.8rem" } }}
                            />
                          </TableCell>
                          <TableCell sx={cellStyles}>
                            {ticket.assignedTime?.seconds
                              ? new Date(ticket.assignedTime.seconds * 1000).toLocaleString()
                              : <i>N/A</i>}
                          </TableCell>
                          <TableCell sx={cellStyles}>
                            {ticket.status === "Closed" ? (
                              <Chip
                                label={ticket.status}
                                color={statusColor[ticket.status]}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: { xs: "0.8rem", sm: "0.85rem" },
                                  height: 28,
                                }}
                              />
                            ) : (
                              <Select
                                value={ticket.status || "Open"}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(ticket.id, e.target.value, ticket);
                                }}
                                size="small"
                                sx={{
                                  minWidth: 120,
                                  fontWeight: 500,
                                  bgcolor: "#f7fbff",
                                  "& .MuiSelect-select": { py: 1.2 },
                                  fontSize: { xs: "0.8rem", sm: "0.85rem" },
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {statusOrder.map((option) => (
                                  <MenuItem
                                    key={option}
                                    value={option}
                                    sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                                  >
                                    {option}
                                  </MenuItem>
                                ))}
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null
        )
      )}
      {!loading && statusOrder.every((st) => (ticketsByStatus[st] || []).length === 0) && (
        <Alert
          severity="info"
          sx={{
            mt: 2,
            fontSize: { xs: "0.8rem", sm: "0.85rem" },
          }}
        >
          No assigned tickets found.
        </Alert>
      )}

      {/* Ticket Details Dialog */}
      <Dialog
        open={!!selectedTicket}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "500px" },
            maxWidth: "500px",
            p: { xs: 1, sm: 2 },
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <DialogTitle sx={{
          fontSize: { xs: "1.1rem", sm: "1.25rem" },
          fontWeight: 600,
          color: "#1976d2",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          Ticket Details
          <IconButton
            onClick={handleCloseDialog}
            sx={{ color: "#1976d2" }}
            aria-label="Close Dialog"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider sx={{ borderColor: "#e3e6f0" }} />
        <DialogContent sx={{ maxHeight: { xs: "70vh", sm: "80vh" }, overflowY: "auto" }}>
          {selectedTicket && (
            <Stack spacing={2}>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Ticket ID:
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                  }}
                >
                  {selectedTicket.id}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Priority:
                </Typography>
                <Box
                  sx={{
                    fontWeight: 700,
                    fontFamily: "Outfit",
                    color: getPriorityInfo(selectedTicket.priority).color,
                    bgcolor: getPriorityInfo(selectedTicket.priority).bg,
                    borderRadius: 2,
                    px: 2,
                    py: 0.5,
                    fontSize: { xs: "0.8rem", sm: "0.85rem", md: "0.97rem" },
                    display: "inline-block",
                    minWidth: 64,
                    textAlign: "center",
                    textTransform: "capitalize",
                  }}
                >
                  {getPriorityInfo(selectedTicket.priority).label || "N/A"}
                </Box>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Problem:
                </Typography>
                <Typography sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                  {selectedTicket.problem || <i>N/A</i>}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Resolution Time:
                </Typography>
                <Typography sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                  {selectedTicket.resolvedTime || <i>N/A</i>}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Description:
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    whiteSpace: "pre-line",
                    bgcolor: "#f7fbff",
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {selectedTicket.description || <i>N/A</i>}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Assigned Time:
                </Typography>
                <Typography sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                  {selectedTicket.assignedTime?.seconds
                    ? new Date(selectedTicket.assignedTime.seconds * 1000).toLocaleString()
                    : <i>N/A</i>}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Closed Time:
                </Typography>
                <Typography sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                  {selectedTicket.closedTime || <i>N/A</i>}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Responded Time:
                </Typography>
                <Typography sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                  {selectedTicket.resolvedTime || <i>N/A</i>}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  Status:
                </Typography>
                <Chip
                  label={selectedTicket.status}
                  color={statusColor[selectedTicket.status]}
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    height: 28,
                  }}
                />
              </Box>
              {Array.isArray(selectedTicket.remarks) && selectedTicket.remarks.length > 0 && (
                <Box>
                  <Divider sx={{ my: 1, borderColor: "#e3e6f0" }} />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#1976d2",
                      fontSize: { xs: "0.8rem", sm: "0.85rem" },
                      fontWeight: 500,
                    }}
                  >
                    Remarks History:
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {selectedTicket.remarks.map((remark, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          mb: 1,
                          pl: 1,
                          borderLeft: "2px solid #1976d2",
                          bgcolor: "#f7fbff",
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            fontSize: { xs: "0.8rem", sm: "0.85rem" },
                          }}
                        >
                          <b>Status:</b> {remark.status}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                        >
                          <b>By:</b> {remark.by} <b>At:</b> {new Date(remark.at).toLocaleString()}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                        >
                          <b>Remarks:</b> {remark.text}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {selectedTicket.fileUrl && (
                <Box>
                  <Divider sx={{ my: 1, borderColor: "#e3e6f0" }} />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#1976d2",
                      fontSize: { xs: "0.8rem", sm: "0.85rem" },
                      fontWeight: 500,
                    }}
                  >
                    File:
                  </Typography>
                  <FilePreview
                    fileUrl={selectedTicket.fileUrl}
                    fileType={selectedTicket.fileType}
                    fileName={selectedTicket.fileName}
                  />
                </Box>
              )}
              <Divider sx={{ my: 1, borderColor: "#e3e6f0" }} />
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  User Name:
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                  }}
                >
                  {selectedTicket.createdBy || <i>N/A</i>}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mt: 2,
                    color: "#1976d2",
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 500,
                  }}
                >
                  User Details:
                </Typography>
                {loadingUser ? (
                  <CircularProgress size={18} />
                ) : userDetails && Object.keys(userDetails).length > 0 ? (
                  <Box sx={{ mt: 1 }}>
                    {userDetails.displayName && (
                      <Typography sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                        <b>Name:</b> {userDetails.displayName}
                      </Typography>
                    )}
                    {userDetails.email && (
                      <Typography sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                        <b>Email:</b> {userDetails.email}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                  >
                    No user details found.
                  </Typography>
                )}
              </Box>
              {/* Render AI Suggestions conditionally */}
              {showSuggestions && renderAiSuggestions()}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          {['Assigned', 'Open'].includes(selectedTicket?.status) && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setShowSuggestions(!showSuggestions);
                if (!aiSuggestions.length && !suggestionsLoading) {
                  fetchAiSuggestions(selectedTicket);
                }
              }}
              disabled={suggestionsLoading}
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.85rem" },
                minWidth: { xs: 80, sm: 100 },
              }}
            >
              AI Suggestions
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseDialog}
            sx={{
              fontSize: { xs: "0.8rem", sm: "0.85rem" },
              minWidth: { xs: 80, sm: 100 },
              bgcolor: "#1976d2",
              "&:hover": {
                bgcolor: "#1565c0",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remarks Dialog, only on closing */}
      <Dialog
        open={statusChange.open}
        onClose={() => setStatusChange({ open: false, ticket: null, newStatus: "", remarks: "" })}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "400px" },
            maxWidth: "400px",
            p: { xs: 1, sm: 2 },
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <DialogTitle sx={{
          fontSize: { xs: "1.1rem", sm: "1.25rem" },
          fontWeight: 600,
          color: "#1976d2",
        }}>
          Add Remarks for Closing Ticket
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: { xs: "0.8rem", sm: "0.85rem" } }}>
            Please explain how this ticket was solved. This will be saved for audit and user reference.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Remarks"
            type="text"
            multiline
            fullWidth
            minRows={3}
            value={statusChange.remarks}
            onChange={(e) => setStatusChange({ ...statusChange, remarks: e.target.value })}
            disabled={remarksLoading}
            sx={{
              "& .MuiInputBase-root": { fontSize: { xs: "0.8rem", sm: "0.85rem" } },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#e3e6f0" },
                "&:hover fieldset": { borderColor: "#1976d2" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          <Button
            onClick={() => setStatusChange({ open: false, ticket: null, newStatus: "", remarks: "" })}
            disabled={remarksLoading}
            sx={{
              fontSize: { xs: "0.8rem", sm: "0.85rem" },
              minWidth: { xs: 80, sm: 100 },
              color: "#1976d2",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRemarksSubmit}
            disabled={remarksLoading || !statusChange.remarks.trim()}
            sx={{
              fontSize: { xs: "0.8rem", sm: "0.85rem" },
              minWidth: { xs: 80, sm: 100 },
              bgcolor: "#1976d2",
              "&:hover": {
                bgcolor: "#1565c0",
              },
            }}
          >
            {remarksLoading ? <CircularProgress size={18} /> : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssignedTickets;