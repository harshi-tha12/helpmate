import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  Typography, Box, Stack, CircularProgress, IconButton, TextField, MenuItem,
  Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Fade, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Collapse, Paper, InputAdornment, FormControl,
  InputLabel, Select, Card, CardContent, useTheme, useMediaQuery, Menu, ListItemIcon, ListItemText,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import MoreVertIcon from "@mui/icons-material/MoreVert";

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

// File to Base64 conversion
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

function formatTimeLeft(secondsLeft) {
  if (secondsLeft <= 0) return "BREACHED";
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${s}s remaining`;
}

// Modal for zoomed file preview
const FilePreviewModal = ({ open, onClose, fileUrl, fileType, fileName }) => {
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
      <DialogTitle sx={{ fontFamily: "Outfit", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {fileName || "File Preview"}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: "#fff" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 2 }}>
        {fileUrl && typeof fileUrl === "string" && fileUrl.startsWith("data:") ? (
          fileUrl.startsWith("data:application/pdf") ? (
            <embed
              src={fileUrl}
              type="application/pdf"
              title={fileName || "PDF Preview"}
              style={{
                width: "100%",
                height: "80vh",
                maxHeight: "90vh",
                borderRadius: 8,
                border: "1px solid #b3c7e6",
              }}
            />
          ) : (
            <img
              src={fileUrl}
              alt={fileName || "attachment"}
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #b3c7e6",
              }}
            />
          )
        ) : (
          <Typography sx={{ fontFamily: "Outfit", color: "#fff" }}>
            Unable to preview this file type. Please download to view.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          href={fileUrl}
          download={fileName || "attachment"}
          sx={{ fontFamily: "Outfit", color: "#fff", textTransform: "none" }}
        >
          Download
        </Button>
        <Button
          onClick={onClose}
          sx={{ fontFamily: "Outfit", color: "#fff", textTransform: "none" }}
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
            <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: "0.9rem" }}>
              <strong>Preview (click to zoom):</strong>
            </Typography>
            <embed
              src={fileUrl}
              type="application/pdf"
              width="100%"
              height="300px"
              style={{ borderRadius: 8, border: "1px solid #b3c7e6" }}
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
            <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: "0.9rem" }}>
              <strong>Preview (click to zoom):</strong>
            </Typography>
            <img
              src={fileUrl}
              alt={fileName || "attachment"}
              style={{
                maxWidth: "100%",
                maxHeight: 300,
                borderRadius: 8,
                border: "1px solid #b3c7e6",
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

const ViewTickets = ({ username }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newToOld");
  const [timerTick, setTimerTick] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    ticketId: "",
    problem: "",
    type: "",
    description: "",
    file: null,
    fileUrl: "",
    fileName: "",
  });

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme?.breakpoints?.down("sm") ?? ((theme) => theme.breakpoints.down("sm")));

  useEffect(() => {
    fetchTickets();
  }, [username]);

  useEffect(() => {
    const timer = setInterval(() => setTimerTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    if (!username) {
      setError("No username provided.");
      setLoading(false);
      return;
    }
    try {
      const ticketsRef = collection(db, "tickets");
      const q = query(ticketsRef, where("createdBy", "==", username));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => {
        const d = doc.data();
        let status = d.status;
        if (d.assignedAgent && status !== "Closed" && status !== "Resolved") {
          status = "Assigned";
        }
        return { id: doc.id, ...d, status };
      });
      setTickets(data);
      setError("");
    } catch (error) {
      setError(`Failed to fetch tickets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id) => {
    setExpandedTicketId(expandedTicketId === id ? null : id);
  };

  const handleMenuClick = (event, ticket) => {
    setAnchorEl(event.currentTarget);
    setSelectedTicket(ticket);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTicket(null);
  };

  const handleEditOpen = () => {
    if (selectedTicket) {
      setEditForm({
        ticketId: selectedTicket.ticketId || "",
        problem: selectedTicket.problem || "",
        type: selectedTicket.type || "",
        description: selectedTicket.description || "",
        file: null,
        fileUrl: selectedTicket.fileUrl || "",
        fileName: selectedTicket.fileName || "",
      });
      setEditDialogOpen(true);
      setAnchorEl(null); // Close menu without clearing selectedTicket
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditForm({
      ticketId: "",
      problem: "",
      type: "",
      description: "",
      file: null,
      fileUrl: "",
      fileName: "",
    });
    setError("");
    setSelectedTicket(null); // Clear selectedTicket when closing dialog
  };

  const handleEditSubmit = async () => {
    if (!selectedTicket) {
      setError("No ticket selected to update. Please reopen the edit dialog and try again.");
      return;
    }
    if (!editForm.problem || !editForm.type || !editForm.description) {
      setError("Please fill in all required fields (Problem, Type, Description).");
      return;
    }

    try {
      let fileUrl = editForm.fileUrl;
      let fileType = selectedTicket?.fileType || "";
      let fileName = editForm.fileName;

      if (editForm.file) {
        const fileSize = editForm.file.size;
        const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
        if (!allowedTypes.includes(editForm.file.type)) {
          setError("Only PNG, JPG, JPEG, WEBP, and PDF files are supported.");
          return;
        }
        if (fileSize > 750 * 1024) {
          setError("File size exceeds 750KB limit.");
          return;
        }
        fileUrl = await toBase64(editForm.file);
        fileType = editForm.file.type;
        fileName = editForm.file.name;
      }

      const ticketData = {
        ticketId: editForm.ticketId,
        problem: editForm.problem,
        type: editForm.type,
        description: editForm.description,
        fileUrl: fileUrl || "",
        fileName: fileName || "",
        fileType: fileType || "",
        createdBy: username,
        createdAt: selectedTicket?.createdAt || Timestamp.now(),
        status: selectedTicket?.status || "Pending",
        assignedAgent: selectedTicket?.assignedAgent || null,
        responseTime: selectedTicket?.responseTime || null,
        resolutionTime: selectedTicket?.resolutionTime || null,
        assignedAt: selectedTicket?.assignedAt || null,
        department: selectedTicket?.department || null,
        priority: selectedTicket?.priority || null,
      };

      await setDoc(doc(db, "tickets", selectedTicket.id), ticketData, { merge: true });
      setSuccessMessage("Ticket updated successfully!");
      setEditDialogOpen(false);
      setEditForm({
        ticketId: "",
        problem: "",
        type: "",
        description: "",
        file: null,
        fileUrl: "",
        fileName: "",
      });
      await fetchTickets();
      setSelectedTicket(null); // Clear selectedTicket after successful update
    } catch (error) {
      console.error("Error updating ticket:", error);
      setError(`Failed to update ticket: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (selectedTicket) {
      try {
        await deleteDoc(doc(db, "tickets", selectedTicket.id));
        setSuccessMessage("Ticket deleted successfully!");
        await fetchTickets();
      } catch (error) {
        setError(`Failed to delete ticket: ${error.message}`);
      }
    }
    handleMenuClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setError("Only PNG, JPG, JPEG, WEBP, and PDF files are supported.");
        return;
      }
      if (file.size > 750 * 1024) {
        setError("File size exceeds 750KB limit.");
        return;
      }
      setEditForm({ ...editForm, file, fileName: file.name });
      setError("");
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

  const getResolutionCountdown = (ticket) => {
    if (!ticket.assignedAgent || !ticket.resolutionTime) return null;
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
          onClose={() => setSuccessMessage("")}
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
          onClose={() => setError("")}
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
              const canEdit = ticket.status === "Pending";

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
                      <Box>
                        <IconButton
                          onClick={(e) => handleMenuClick(e, ticket)}
                          sx={{ color: palette.accent }}
                          aria-label={`Open menu for ticket ${ticket.ticketId}`}
                        >
                          <MoreVertIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl) && selectedTicket?.id === ticket.id}
                          onClose={handleMenuClose}
                          PaperProps={{
                            sx: { borderRadius: 2 },
                          }}
                        >
                          <MenuItem onClick={handleEditOpen} disabled={!canEdit}>
                            <ListItemIcon>
                              <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Edit" />
                          </MenuItem>
                          <MenuItem onClick={handleDelete} disabled={!canEdit}>
                            <ListItemIcon>
                              <DeleteIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Delete" />
                          </MenuItem>
                        </Menu>
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
                    <Typography sx={{ fontFamily: "Outfit", color: palette.text, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
                      <strong>Created:</strong>{" "}
                      {ticket.createdAt?.seconds
                        ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
                        : "N/A"}
                    </Typography>
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
                            <FilePreview fileUrl={ticket.fileUrl} fileType={ticket.fileType} fileName={ticket.fileName} />
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
                              <strong>Resolution SLA:</strong> {ticket.resolutionTime || "N/A"}
                            </Typography>
                          )}
                          {ticket.assignedAgent && ticket.resolutionTime && (
                            <Typography sx={{ fontFamily: "Outfit", color: palette.accent, fontWeight: 600, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
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
                  const canEdit = ticket.status === "Pending";

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
                          <IconButton
                            onClick={(e) => handleMenuClick(e, ticket)}
                            sx={{ color: palette.accent }}
                            aria-label={`Open menu for ticket ${ticket.ticketId}`}
                          >
                            <MoreVertIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                          </IconButton>
                          <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl) && selectedTicket?.id === ticket.id}
                            onClose={handleMenuClose}
                            PaperProps={{
                              sx: { borderRadius: 2 },
                            }}
                          >
                            <MenuItem onClick={handleEditOpen} disabled={!canEdit}>
                              <ListItemIcon>
                                <EditIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Edit" />
                            </MenuItem>
                            <MenuItem onClick={handleDelete} disabled={!canEdit}>
                              <ListItemIcon>
                                <DeleteIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Delete" />
                            </MenuItem>
                          </Menu>
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
                                  <FilePreview fileUrl={ticket.fileUrl} fileType={ticket.fileType} fileName={ticket.fileName} />
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
                                  <Typography sx={{ fontFamily: "Outfit", color: palette.accent, fontWeight: 600, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                                    <AccessTimeIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                                    {countdown ? formatTimeLeft(countdown.secondsLeft) : "N/A"}
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
        open={editDialogOpen}
        onClose={handleEditClose}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Fade}
        transitionDuration={300}
      >
        <DialogTitle sx={{ fontFamily: "Outfit", color: palette.accent, fontWeight: 600 }}>
          Edit Ticket
          <IconButton
            aria-label="close"
            onClick={handleEditClose}
            sx={{ position: "absolute", right: 8, top: 8, color: palette.accent }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Ticket ID"
              value={editForm.ticketId}
              onChange={(e) => setEditForm({ ...editForm, ticketId: e.target.value })}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ fontFamily: "Outfit" }}
              disabled
            />
            <TextField
              label="Problem Title"
              value={editForm.problem}
              onChange={(e) => setEditForm({ ...editForm, problem: e.target.value })}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ fontFamily: "Outfit" }}
              required
            />
            <TextField
              label="Type"
              value={editForm.type}
              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ fontFamily: "Outfit" }}
              required
            />
            <TextField
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              fullWidth
              variant="outlined"
              size="small"
              multiline
              rows={4}
              sx={{ fontFamily: "Outfit" }}
              required
            />
            <Box>
              <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: "0.9rem", mb: 1 }}>
                Upload File (Optional)
              </Typography>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileChange}
                style={{ display: "block", marginBottom: 8 }}
              />
              <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark, fontSize: "0.8rem" }}>
                Maximum file size allowed: <strong>750KB</strong><br />
                Only PNG, JPG, JPEG, WEBP, and PDF files are supported.
              </Typography>
              {editForm.fileUrl && (
                <FilePreview fileUrl={editForm.fileUrl} fileType={selectedTicket?.fileType} fileName={editForm.fileName} />
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleEditClose}
            sx={{ fontFamily: "Outfit", color: palette.accentDark }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            sx={{
              fontFamily: "Outfit",
              backgroundColor: palette.accent,
              "&:hover": { backgroundColor: palette.accentDark },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewTickets;