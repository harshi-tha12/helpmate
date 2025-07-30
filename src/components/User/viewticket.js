import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  Typography, Box, Stack, CircularProgress, IconButton, TextField, MenuItem,
  Button, Alert, Dialog, DialogTitle, DialogContent, Fade, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Collapse, Paper, InputAdornment, FormControl,
  InputLabel, Select, Card, CardContent, useTheme, useMediaQuery, Chip,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import axios from "axios";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/diogwsroa/upload";
const UPLOAD_PRESET = "helpmate_upload";

// Blue palette
const palette = {
  mainBg: "#f4f8fc",
  headerBg: "#e0eafd",
  accent: "#1976d2",
  accentLight: "#e3f2fd",
  accentDark: "#115293",
  text: "#153570",
  border: "#b3c7e6",
  statusPending: "#e3efff",
  statusInProgress: "#e6f4ff",
  statusResolved: "#e3ffee",
  statusClosed: "#e3e9ff",
  statusOpen: "#e0f7fa",
  statusAssigned: "#fffbe6",
  statusPendingText: "#1e4c93",
  statusInProgressText: "#1976d2",
  statusResolvedText: "#1e8833",
  statusClosedText: "#293e79",
  statusOpenText: "#0a5366",
  statusAssignedText: "#b26a00",
};

const sortOptions = [
  { label: "Newest First", value: "newToOld" },
  { label: "Oldest First", value: "oldToNew" },
  { label: "Pending", value: "Pending" },
  { label: "Assigned", value: "Assigned" },
  { label: "In Progress", value: "In Progress" },
  { label: "Open", value: "Open" },
  { label: "Resolved", value: "Resolved" },
  { label: "Closed", value: "Closed" },
];

const statusColorMap = {
  Pending: { bg: palette.statusPending, color: palette.statusPendingText },
  "In Progress": { bg: palette.statusInProgress, color: palette.statusInProgressText },
  Resolved: { bg: palette.statusResolved, color: palette.statusResolvedText },
  Closed: { bg: palette.statusClosed, color: palette.statusClosedText },
  Open: { bg: palette.statusOpen, color: palette.statusOpenText },
  Assigned: { bg: palette.statusAssigned, color: palette.statusAssignedText },
};

const priorityColorMap = {
  high: { bg: "#ffebee", color: "#d32f2f" },
  medium: { bg: "#fff8e1", color: "#ff9800" },
  low: { bg: "#e8f5e9", color: "#388e3c" },
  default: { bg: "#e0eafd", color: palette.text },
};

function formatTimeLeft(secondsLeft) {
  if (secondsLeft <= 0) return "BREACHED";
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${s}s remaining`;
}

const ViewTickets = ({ username }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [editForm, setEditForm] = useState({
    ticketId: "",
    type: "",
    problem: "",
    department: "",
    description: "",
    file: null,
    fileUrl: "",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newToOld");
  const [timerTick, setTimerTick] = useState(0); // timer for countdown

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme?.breakpoints?.down("sm") ?? ((theme) => theme.breakpoints.down("sm")));

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line
  }, [username]);

  // For updating countdown every second
  useEffect(() => {
    const timer = setInterval(() => setTimerTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    if (!username) {
      setLoading(false);
      return;
    }

    try {
      const ticketsRef = collection(db, "tickets");
      const q = query(ticketsRef, where("createdBy", "==", username));
      const querySnapshot = await getDocs(q);
      // Automatically map status to "Assigned" if assignedAgent is set and status is not closed
      const data = querySnapshot.docs.map((doc) => {
        const d = doc.data();
        let status = d.status;
        if (d.assignedAgent && status !== "Closed" && status !== "Resolved") {
          status = "Assigned";
        }
        return { id: doc.id, ...d, status };
      });
      setTickets(data);
    } catch (error) {
      setError("Failed to fetch tickets.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id) => {
    setExpandedTicketId(expandedTicketId === id ? null : id);
  };

  const handleEdit = (ticket) => {
    setEditingTicketId(ticket.id);
    setEditForm({
      ticketId: ticket.ticketId,
      type: ticket.type || "",
      problem: ticket.problem || "",
      department: ticket.department || "",
      description: ticket.description || "",
      file: null,
      fileUrl: ticket.fileUrl || "",
    });
    setError("");
    setSuccessMessage("");
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
      if (selectedFile.size > maxSize) {
        setError("File size exceeds 10MB limit.");
        setEditForm((prev) => ({ ...prev, file: null }));
        return;
      }
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Only PNG, JPG, JPEG, WEBP, and PDF files are allowed.");
        setEditForm((prev) => ({ ...prev, file: null }));
        return;
      }
      setError("");
      setEditForm((prev) => ({ ...prev, file: selectedFile }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editForm.problem.length > 100) {
      setError("Problem title must be 100 characters or less.");
      return;
    }
    if (editForm.department.length > 50) {
      setError("Department name must be 50 characters or less.");
      return;
    }

    try {
      let fileUrl = editForm.fileUrl;
      if (editForm.file) {
        const formData = new FormData();
        formData.append("file", editForm.file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("resource_type", "auto");

        const uploadResponse = await axios.post(CLOUDINARY_URL, formData, { timeout: 30000 });
        if (!uploadResponse.data.secure_url) {
          throw new Error("File upload failed: No secure_url returned.");
        }
        fileUrl = uploadResponse.data.secure_url;
      }

      const updatedTicketData = {
        ticketId: editForm.ticketId,
        type: editForm.type,
        problem: editForm.problem,
        department: editForm.department,
        description: editForm.description,
        fileUrl,
        createdBy: username,
        createdAt: Timestamp.now(),
        status: "Pending",
      };

      await setDoc(doc(db, "tickets", editingTicketId), updatedTicketData, { merge: false });

      setSuccessMessage("Ticket updated successfully!");
      setEditingTicketId(null);
      setEditForm({
        ticketId: "",
        type: "",
        problem: "",
        department: "",
        description: "",
        file: null,
        fileUrl: "",
      });
      setError("");
      fetchTickets();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      setError(`Error updating ticket: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingTicketId(null);
    setEditForm({
      ticketId: "",
      type: "",
      problem: "",
      department: "",
      description: "",
      file: null,
      fileUrl: "",
    });
    setError("");
  };

  const getFileTypeLabel = (url) => {
    if (!url) return "";
    const extension = url.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "(PDF)";
      case "doc":
        return "(DOC)";
      case "docx":
        return "(DOCX)";
      default:
        return "(Image)";
    }
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const filteredTickets = useMemo(() => {
    let result = tickets.filter((ticket) => {
      const term = searchTerm.toLowerCase();
      return (
        ticket.ticketId?.toString().toLowerCase().includes(term) ||
        ticket.problem?.toLowerCase().includes(term) ||
        ticket.type?.toLowerCase().includes(term) ||
        ticket.department?.toLowerCase().includes(term) ||
        ticket.status?.toLowerCase().includes(term) ||
        ticket.description?.toLowerCase().includes(term)
      );
    });

    if (sortBy === "newToOld") {
      result = result.slice().sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } else if (sortBy === "oldToNew") {
      result = result.slice().sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    } else if (sortBy && ["Pending", "Assigned", "In Progress", "Open", "Resolved", "Closed"].includes(sortBy)) {
      result = result
        .filter((ticket) => ticket.status === sortBy)
        .slice()
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }

    return result;
  }, [tickets, searchTerm, sortBy]);

  const getPriorityInfo = (priority) => {
    let pri = typeof priority === "object" && priority !== null ? priority.priority : priority;
    pri = (pri || "").toLowerCase();
    if (!(pri in priorityColorMap)) pri = "default";
    return {
      label: typeof priority === "object" && priority !== null ? priority.priority : priority || "N/A",
      ...priorityColorMap[pri],
    };
  };

  // Helper to get countdown seconds
  const getResolutionCountdown = (ticket) => {
    if (!ticket.assignedAgent || !ticket.resolutionTime) return null;
    // Use assignedAt if present, else createdAt
    const assignedAt = ticket.assignedAt
      ? (ticket.assignedAt.seconds ? new Date(ticket.assignedAt.seconds * 1000) : new Date(ticket.assignedAt))
      : ticket.createdAt && ticket.createdAt.seconds
        ? new Date(ticket.createdAt.seconds * 1000)
        : new Date(ticket.createdAt || Date.now());
    const deadline = new Date(assignedAt.getTime() + (Number(ticket.resolutionTime) || 120) * 60 * 1000);
    const now = new Date();
    const secondsLeft = Math.floor((deadline - now) / 1000);
    return { deadline, secondsLeft };
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, background: palette.mainBg, minHeight: "100vh" }}>
      <Typography
        variant="h4"
        sx={{
          fontFamily: "PT Serif",
          color: palette.accent,
          fontWeight: "bold",
          letterSpacing: 1,
          fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
          mb: { xs: 2, sm: 3 },
        }}
        role="heading"
        aria-level="1"
      >
        Your Submitted Tickets
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2 }}
        sx={{ mb: { xs: 2, sm: 3 }, alignItems: { xs: "stretch", sm: "center" } }}
      >
        <TextField
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          sx={{
            maxWidth: { xs: "100%", sm: 340 },
            background: "#fff",
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "&:hover fieldset": { borderColor: palette.accent },
              "&.Mui-focused fieldset": { borderColor: palette.accentDark },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: palette.accent, fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
              </InputAdornment>
            ),
            sx: {
              fontFamily: "Outfit",
              color: palette.accent,
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            },
          }}
          inputProps={{ "aria-label": "Search tickets" }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 180 } }}>
          <InputLabel
            id="sort-label"
            sx={{
              fontFamily: "Outfit",
              color: palette.accent,
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
          >
            Sort By
          </InputLabel>
          <Select
            labelId="sort-label"
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
            sx={{
              fontFamily: "Outfit",
              background: "#fff",
              borderRadius: 2,
              color: palette.accent,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: palette.border,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: palette.accent,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: palette.accentDark,
              },
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
            inputProps={{ "aria-label": "Sort tickets by" }}
          >
            {sortOptions.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                sx={{ fontFamily: "Outfit", fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            fontFamily: "Outfit",
            background: "#e3f6ff",
            color: palette.accent,
            fontSize: { xs: "0.8rem", sm: "0.875rem" },
            borderRadius: 2,
          }}
        >
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            fontFamily: "Outfit",
            background: "#e3e7ff",
            color: palette.accentDark,
            fontSize: { xs: "0.8rem", sm: "0.875rem" },
            borderRadius: 2,
          }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <CircularProgress sx={{ color: palette.accent }} size={32} />
        </Box>
      ) : tickets.length === 0 ? (
        <Box
          sx={{
            color: palette.accentDark,
            fontWeight: "bold",
            fontStyle: "italic",
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 2,
            backgroundColor: palette.statusPending,
            padding: 2,
            borderRadius: 2,
            fontFamily: "Outfit",
            fontSize: { xs: "0.9rem", sm: "1rem" },
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
          No tickets found. You haven't submitted any yet.
        </Box>
      ) : isSmallScreen ? (
        <Box role="list" aria-label="Ticket list">
          {filteredTickets.length === 0 ? (
            <Typography
              sx={{
                color: palette.accent,
                fontFamily: "Outfit",
                fontStyle: "italic",
                textAlign: "center",
                mt: 2,
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              No tickets match your search.
            </Typography>
          ) : (
            filteredTickets.map((ticket) => {
              const statusPalette = statusColorMap[ticket.status] || {
                bg: palette.statusPending,
                color: palette.statusPendingText,
              };
              const priorityInfo = getPriorityInfo(ticket.priority);
              const countdown = getResolutionCountdown(ticket);

              return (
                <Card
                  key={ticket.id}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(18, 52, 153, 0.1)",
                    background: "#fff",
                  }}
                  role="listitem"
                >
                  <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography
                        sx={{ fontFamily: "Outfit", fontWeight: 700, color: palette.accent, fontSize: { xs: "1rem", sm: "1.1rem" } }}
                      >
                        {ticket.problem || "Untitled"}
                      </Typography>
                      <IconButton
                        onClick={() => handleToggle(ticket.id)}
                        sx={{ color: palette.accent }}
                        aria-label={`Toggle details for ticket ${ticket.ticketId}`}
                        aria-expanded={expandedTicketId === ticket.id}
                      >
                        {expandedTicketId === ticket.id ? (
                          <ExpandLessIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        ) : (
                          <ExpandMoreIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        )}
                      </IconButton>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: priorityInfo.bg,
                          color: priorityInfo.color,
                          fontWeight: 600,
                          fontSize: { xs: "0.8rem", sm: "0.85rem" },
                          fontFamily: "Outfit",
                          textTransform: "capitalize",
                          mr: 1,
                        }}
                      >
                        {priorityInfo.label || "N/A"}
                      </Box>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: statusPalette.bg,
                          color: statusPalette.color,
                          fontWeight: 600,
                          fontSize: { xs: "0.8rem", sm: "0.85rem" },
                          fontFamily: "Outfit",
                        }}
                      >
                        {ticket.status}
                      </Box>
                    </Box>
                    <Typography sx={{ fontFamily: "Outfit", color: palette.text, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                      <strong>Ticket ID:</strong> {ticket.ticketId}
                    </Typography>
                    <Typography sx={{ fontFamily: "Outfit", color: palette.text, fontSize: { xs: "0.85rm", sm: "0.9rem" } }}>
                      <strong>Created:</strong>{" "}
                      {ticket.createdAt?.seconds
                        ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
                        : "N/A"}
                    </Typography>
                    {ticket.status === "Pending" && (
                      <Box sx={{ mt: 1, textAlign: "right" }}>
                        <Tooltip title="Edit ticket">
                          <IconButton
                            onClick={() => handleEdit(ticket)}
                            sx={{ color: palette.accent }}
                            aria-label={`Edit ticket ${ticket.ticketId}`}
                          >
                            <EditIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    <Collapse in={expandedTicketId === ticket.id} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 2, p: 1.5, background: palette.accentLight, borderRadius: 1 }}>
                        <Stack spacing={1}>
                          <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                            <strong>Type:</strong> {ticket.type || "N/A"}
                          </Typography>
                          <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                            <strong>Department:</strong> {ticket.department || "N/A"}
                          </Typography>
                          <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                            <strong>Description:</strong> {ticket.description || "N/A"}
                          </Typography>
                          {(ticket.priority?.reason || ticket.priority?.priority) && (
                            <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                              <strong>Priority Reason:</strong> {ticket.priority?.reason || "N/A"}
                            </Typography>
                          )}
                          {ticket.fileUrl && (
                            <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                              <strong>Attachment:</strong>{" "}
                              {isValidUrl(ticket.fileUrl) ? (
                                <a href={ticket.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: palette.accent, textDecoration: "underline" }}>
                                  View/Download File {getFileTypeLabel(ticket.fileUrl)}
                                </a>
                              ) : (
                                <span style={{ color: "#d32f2f" }}>Invalid or inaccessible file URL</span>
                              )}
                            </Typography>
                          )}
                          <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                            <strong>Assigned Agent:</strong> {ticket.assignedAgent ? (
                              <span>
                                <AssignmentIndIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                                {ticket.assignedAgent}
                              </span>
                            ) : "N/A"}
                          </Typography>
                          <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                            <strong>Response SLA:</strong> {ticket.responseTime || "N/A"}
                          </Typography>
                          {ticket.assignedAgent && ticket.resolutionTime && (
                            <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                              <strong>Resolution SLA:</strong> {ticket.resolutionTime ? `${ticket.resolutionTime}` : "N/A"}
                            </Typography>
                          )}
                          {ticket.assignedAgent && ticket.resolutionTime && (
                            <Typography sx={{ fontFamily: "Outfit", color: countdown && countdown.secondsLeft <= 0 ? "#d32f2f" : palette.accent, fontWeight: 600, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                              <AccessTimeIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                              {countdown ? formatTimeLeft(countdown.secondsLeft) : "N/A"}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 4,
            boxShadow: "0 4px 24px #b0c4e7",
            overflowX: "auto",
          }}
          role="grid"
          aria-label="Tickets table"
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: palette.headerBg }}>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }} />
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                  Priority
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                  Ticket ID
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                  Problem Title
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                  Created At
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{
                      color: palette.accent,
                      fontFamily: "Outfit",
                      fontStyle: "italic",
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      py: 2,
                    }}
                  >
                    No tickets match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => {
                  const statusPalette = statusColorMap[ticket.status] || {
                    bg: palette.statusPending,
                    color: palette.statusPendingText,
                  };
                  const priorityInfo = getPriorityInfo(ticket.priority);
                  const countdown = getResolutionCountdown(ticket);
                  return (
                    <React.Fragment key={ticket.id}>
                      <TableRow
                        hover
                        onClick={() => handleToggle(ticket.id)}
                        sx={{
                          cursor: "pointer",
                          "&:nth-of-type(even)": { backgroundColor: palette.accentLight },
                          "&:nth-of-type(odd)": { backgroundColor: "#fff" },
                          ...(expandedTicketId === ticket.id && { backgroundColor: "#e3f6ff" }),
                          transition: "background 0.15s",
                        }}
                      >
                        <TableCell sx={{ width: 48 }}>
                          <IconButton
                            onClick={() => handleToggle(ticket.id)}
                            size="small"
                            sx={{ color: palette.accent }}
                            aria-label={`Toggle details for ticket ${ticket.ticketId}`}
                            aria-expanded={expandedTicketId === ticket.id}
                          >
                            {expandedTicketId === ticket.id ? (
                              <ExpandLessIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                            ) : (
                              <ExpandMoreIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              fontWeight: 700,
                              fontFamily: "Outfit",
                              color: priorityInfo.color,
                              bgcolor: priorityInfo.bg,
                              borderRadius: 2,
                              px: 2,
                              py: 0.5,
                              fontSize: { xs: "0.8rem", sm: "0.9rem", md: "0.97rem" },
                              textAlign: "center",
                              textTransform: "capitalize",
                              minWidth: 64,
                            }}
                          >
                            {priorityInfo.label || "N/A"}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: "Outfit", fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" }, color: palette.text }}>
                          {ticket.ticketId}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "Outfit", fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" }, color: palette.text }}>
                          {ticket.problem}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "Outfit", fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                          <Box
                            sx={{
                              display: "inline-block",
                              px: 2,
                              py: 0.5,
                              borderRadius: 2,
                              bgcolor: statusPalette.bg,
                              color: statusPalette.color,
                              fontWeight: 600,
                              fontSize: { xs: "0.8rem", sm: "0.85rem", md: "0.95rem" },
                              letterSpacing: 0.3,
                              fontFamily: "Outfit",
                            }}
                          >
                            {ticket.status}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: "Outfit", fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" }, color: palette.text }}>
                          {ticket.createdAt?.seconds
                            ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
                            : "N/A"}
                        </TableCell>
                        <TableCell sx={{ width: 48 }}>
                          {ticket.status === "Pending" && (
                            <Tooltip title="Edit ticket">
                              <IconButton
                                onClick={() => handleEdit(ticket)}
                                sx={{ color: palette.accent }}
                                aria-label={`Edit ticket ${ticket.ticketId}`}
                              >
                                <EditIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ padding: 0 }} colSpan={7}>
                          <Collapse in={expandedTicketId === ticket.id} timeout="auto" unmountOnExit>
                            <Box sx={{ m: 0, p: { xs: 2, sm: 3 }, background: palette.accentLight, borderRadius: 2 }}>
                              <Stack spacing={1}>
                                <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                  <strong>Type:</strong> {ticket.type || "N/A"}
                                </Typography>
                                <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                  <strong>Department:</strong> {ticket.department || "N/A"}
                                </Typography>
                                <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                  <strong>Description:</strong> {ticket.description || "N/A"}
                                </Typography>
                                {(ticket.priority?.reason || ticket.priority?.priority) && (
                                  <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                    <strong>Priority Reason:</strong> {ticket.priority?.reason || "N/A"}
                                  </Typography>
                                )}
                                {ticket.fileUrl && (
                                  <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rm", sm: "0.9rem", md: "1rem" } }}>
                                    <strong>Attachment:</strong>{" "}
                                    {isValidUrl(ticket.fileUrl) ? (
                                      <a
                                        href={ticket.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: palette.accent, textDecoration: "underline" }}
                                      >
                                        View/Download File {getFileTypeLabel(ticket.fileUrl)}
                                      </a>
                                    ) : (
                                      <span style={{ color: "#d32f2f" }}>Invalid or inaccessible file URL</span>
                                    )}
                                  </Typography>
                                )}
                                <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                  <strong>Assigned Agent:</strong> {ticket.assignedAgent ? (
                                    <span>
                                      <AssignmentIndIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                                      {ticket.assignedAgent}
                                    </span>
                                  ) : "N/A"}
                                </Typography>
                                <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                  <strong>Response SLA:</strong> {ticket.responseTime || "N/A"}
                                </Typography>
                                {ticket.assignedAgent && ticket.resolutionTime && (
                                  <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                    <strong>Resolution SLA:</strong> {ticket.resolutionTime || "N/A"}
                                  </Typography>
                                )}
                                {ticket.assignedAgent && ticket.resolutionTime && (
                                  <Typography sx={{ fontFamily: "Outfit", color: countdown && countdown.secondsLeft <= 0 ? "#d32f2f" : palette.accent, fontWeight: 600, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                                    <AccessTimeIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                                    {countdown ? formatTimeLeft(countdown.secondsLeft) : "N/A"}
                                  </Typography>
                                )}
                                {ticket.firstResponseAt && (
                                  <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                    <strong>First Response At:</strong>{" "}
                                    {ticket.firstResponseAt?.seconds
                                      ? new Date(ticket.firstResponseAt.seconds * 1000).toLocaleString()
                                      : ticket.firstResponseAt}
                                  </Typography>
                                )}
                                {ticket.updatedAt && (
                                  <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}>
                                    <strong>Last Updated:</strong>{" "}
                                    {ticket.updatedAt?.seconds
                                      ? new Date(ticket.updatedAt.seconds * 1000).toLocaleString()
                                      : ticket.updatedAt}
                                  </Typography>
                                )}
                              </Stack>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={editingTicketId !== null}
        onClose={handleCancelEdit}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Fade}
        transitionDuration={600}
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            backgroundColor: "#f0f6ff",
            boxShadow: "0 8px 24px #bdd3f8",
            maxWidth: { xs: "90%", sm: 500 },
          },
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
        }}
        aria-labelledby="edit-ticket-dialog-title"
        aria-describedby="edit-ticket-dialog-description"
      >
        <DialogTitle
          id="edit-ticket-dialog-title"
          sx={{
            fontFamily: "Outfit",
            color: palette.accent,
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: palette.headerBg,
            borderRadius: "16px 16px 0 0",
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          Edit Ticket
          <IconButton
            onClick={handleCancelEdit}
            sx={{ color: palette.accent }}
            aria-label="Close edit dialog"
          >
            <CloseIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <form onSubmit={handleEditSubmit}>
            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
              Ticket ID
            </Typography>
            <TextField
              value={editForm.ticketId}
              disabled
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{
                sx: {
                  fontFamily: "Outfit",
                  color: palette.accentDark,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                },
              }}
              variant="outlined"
              inputProps={{ "aria-label": "Ticket ID (disabled)" }}
            />

            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
              Problem Title
            </Typography>
            <TextField
              value={editForm.problem}
              onChange={(e) => handleEditFormChange("problem", e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{
                sx: {
                  fontFamily: "Outfit",
                  color: palette.accentDark,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                },
              }}
              variant="outlined"
              inputProps={{ maxLength: 100, "aria-label": "Problem Title" }}
              aria-describedby={error && error.includes("Problem title") ? "edit-error-message" : undefined}
            />

            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
              Type of Problem
            </Typography>
            <TextField
              select
              value={editForm.type}
              onChange={(e) => handleEditFormChange("type", e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{
                sx: {
                  fontFamily: "Outfit",
                  color: palette.accentDark,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                },
              }}
              variant="outlined"
              inputProps={{ "aria-label": "Type of Problem" }}
            >
              <MenuItem value="Software" sx={{ fontFamily: "Outfit", fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                Software
              </MenuItem>
              <MenuItem value="Hardware" sx={{ fontFamily: "Outfit", fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                Hardware
              </MenuItem>
            </TextField>

            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
              Department
            </Typography>
            <TextField
              value={editForm.department}
              onChange={(e) => handleEditFormChange("department", e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{
                sx: {
                  fontFamily: "Outfit",
                  color: palette.accentDark,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                },
              }}
              variant="outlined"
              inputProps={{ maxLength: 50, "aria-label": "Department" }}
              aria-describedby={error && error.includes("Department name") ? "edit-error-message" : undefined}
            />

            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
              Description
            </Typography>
            <TextField
              value={editForm.description}
              onChange={(e) => handleEditFormChange("description", e.target.value)}
              multiline
              rows={isSmallScreen ? 3 : 4}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{
                sx: {
                  fontFamily: "Outfit",
                  color: palette.accentDark,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                },
              }}
              variant="outlined"
              inputProps={{ maxLength: 500, "aria-label": "Description" }}
              aria-describedby={error ? "edit-error-message" : undefined}
            />

            <Typography sx={{ mb: 1, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
              Attach PNG, JPG, JPEG, WEBP, or PDF (replaces existing file)
            </Typography>
            <Button
              variant="outlined"
              component="label"
              sx={{
                fontFamily: "Outfit",
                color: palette.accent,
                borderColor: palette.accent,
                borderRadius: "8px",
                textTransform: "none",
                py: 1,
                px: { xs: 1.5, sm: 2 },
                mb: 2,
                "&:hover": {
                  borderColor: palette.accentDark,
                  bgcolor: palette.headerBg,
                },
                fontSize: { xs: "0.85rem", sm: "0.9rem" },
                minHeight: 48,
              }}
              aria-label="Choose file to upload"
            >
              {editForm.file ? editForm.file.name : "Choose File"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                hidden
                onChange={handleFileChange}
                aria-describedby={error && error.includes("File") ? "edit-error-message" : undefined}
              />
            </Button>
            {editForm.fileUrl && (
              <Typography
                sx={{
                  mb: 2,
                  fontFamily: "Outfit",
                  color: palette.accent,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}
              >
                Current file:{" "}
                <a
                  href={editForm.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: palette.accentDark, textDecoration: "underline" }}
                >
                  View Current File {getFileTypeLabel(editForm.fileUrl)}
                </a>
              </Typography>
            )}

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  fontFamily: "Outfit",
                  borderRadius: "8px",
                  bgcolor: "#e3e7ff",
                  color: palette.accentDark,
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
                id="edit-error-message"
              >
                {error}
              </Alert>
            )}

            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                sx={{
                  backgroundColor: palette.accent,
                  color: "#fff",
                  fontFamily: "Outfit",
                  borderRadius: "8px",
                  px: { xs: 3, sm: 4 },
                  py: 1,
                  boxShadow: "none",
                  "&:hover": { backgroundColor: palette.accentDark },
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                  minHeight: 48,
                }}
                aria-label="Save ticket changes"
              >
                Save Changes
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                sx={{
                  color: palette.accent,
                  borderColor: palette.accent,
                  fontFamily: "Outfit",
                  borderRadius: "8px",
                  px: { xs: 3, sm: 4 },
                  py: 1,
                  "&:hover": { borderColor: palette.accentDark, bgcolor: palette.headerBg },
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                  minHeight: 48,
                }}
                aria-label="Cancel edit"
              >
                Cancel
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ViewTickets;