// BLUE THEME VERSION

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  Typography,
  Box,
  Stack,
  CircularProgress,
  IconButton,
  TextField,
  MenuItem,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Fade,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Collapse,
  Paper,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
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
  statusPendingText: "#1e4c93",
  statusInProgressText: "#1976d2",
  statusResolvedText: "#1e8833",
  statusClosedText: "#293e79",
  statusOpenText: "#0a5366",
};

const sortOptions = [
  { label: "Newest First", value: "newToOld" },
  { label: "Oldest First", value: "oldToNew" },
  { label: "Pending", value: "Pending" },
  { label: "In Progress", value: "In Progress" },
  { label: "Open", value: "Open" },
  { label: "Resolved", value: "Resolved" },
  { label: "Closed", value: "Closed" },
];

const statusColorMap = {
  "Pending": { bg: palette.statusPending, color: palette.statusPendingText },
  "In Progress": { bg: palette.statusInProgress, color: palette.statusInProgressText },
  "Resolved": { bg: palette.statusResolved, color: palette.statusResolvedText },
  "Closed": { bg: palette.statusClosed, color: palette.statusClosedText },
  "Open": { bg: palette.statusOpen, color: palette.statusOpenText },
};

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

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line
  }, [username]);

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
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/pdf",
      ];
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

    try {
      let fileUrl = editForm.fileUrl;

      if (editForm.file) {
        const formData = new FormData();
        formData.append("file", editForm.file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("resource_type", "auto");

        const uploadResponse = await axios.post(CLOUDINARY_URL, formData, {
          timeout: 30000,
        });
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

  // SEARCH, FILTER, SORT
  let filteredTickets = tickets.filter((ticket) => {
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

  // Apply sort/filter
  if (sortBy === "newToOld") {
    filteredTickets = filteredTickets
      .slice()
      .sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
  } else if (sortBy === "oldToNew") {
    filteredTickets = filteredTickets
      .slice()
      .sort(
        (a, b) =>
          (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
      );
  } else if (
    ["Pending", "In Progress", "Open", "Resolved", "Closed"].includes(sortBy)
  ) {
    filteredTickets = filteredTickets
      .filter((ticket) => ticket.status === sortBy)
      .slice()
      .sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
  }

  return (
    <Box sx={{ p: { xs: 0, md: 2 }, background: palette.mainBg, minHeight: "100vh" }}>
      <Typography
        variant="h4"
        mb={2}
        sx={{
          fontFamily: "PT Serif",
          color: palette.accent,
          fontWeight: "bold",
          letterSpacing: 1,
        }}
      >
        Your Submitted Tickets
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, alignItems: "center" }}>
        <TextField
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ maxWidth: 340, background: "#fff" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: palette.accent }} />
              </InputAdornment>
            ),
            sx: {
              fontFamily: "Outfit",
              background: "#fff",
              borderRadius: 2,
              color: palette.accent,
              borderColor: palette.border,
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="sort-label" sx={{ fontFamily: "Outfit", color: palette.accent }}>Sort By</InputLabel>
          <Select
            labelId="sort-label"
            value={sortBy}
            label="Sort By"
            onChange={e => setSortBy(e.target.value)}
            sx={{
              fontFamily: "Outfit",
              background: "#fff",
              borderRadius: 2,
              color: palette.accent,
              borderColor: palette.border,
            }}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ fontFamily: "Outfit" }}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, fontFamily: "Outfit", background: "#e3f6ff", color: palette.accent }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, fontFamily: "Outfit", background: "#e3e7ff", color: palette.accentDark }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress sx={{ color: palette.accent }} />
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
          }}
        >
          <ErrorOutlineIcon />
          No tickets found. You haven't submitted any yet.
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: "0 4px 24px #b0c4e7" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: palette.headerBg }}>
                <TableCell />
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent }}>Ticket ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent }}>Problem Title</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent }}>Created At</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Outfit", color: palette.accent }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: palette.accent, fontFamily: "Outfit", fontStyle: "italic" }}>
                    No tickets match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => {
                  const statusPalette = statusColorMap[ticket.status] || { bg: palette.statusPending, color: palette.statusPendingText };
                  return (
                    <React.Fragment key={ticket.id}>
                      <TableRow
                        hover
                        sx={{
                          "&:nth-of-type(even)": { backgroundColor: palette.accentLight },
                          "&:nth-of-type(odd)": { backgroundColor: "#fff" },
                          transition: "background 0.15s",
                        }}
                      >
                        <TableCell>
                          <IconButton onClick={() => handleToggle(ticket.id)} size="small" sx={{ color: palette.accent }}>
                            {expandedTicketId === ticket.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontFamily: "Outfit", fontSize: "1rem", color: palette.text }}>
                          {ticket.ticketId}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "Outfit", fontSize: "1rem", color: palette.text }}>
                          {ticket.problem}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "Outfit", fontSize: "1rem" }}>
                          <Box
                            sx={{
                              display: "inline-block",
                              px: 2,
                              py: 0.5,
                              borderRadius: 2,
                              bgcolor: statusPalette.bg,
                              color: statusPalette.color,
                              fontWeight: 600,
                              fontSize: "0.95rem",
                              letterSpacing: 0.3,
                              fontFamily: "Outfit",
                            }}
                          >
                            {ticket.status}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: "Outfit", fontSize: "1rem", color: palette.text }}>
                          {ticket.createdAt?.seconds
                            ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {ticket.status === "Pending" && (
                            <Tooltip title="Edit">
                              <IconButton
                                onClick={() => handleEdit(ticket)}
                                sx={{ color: palette.accent }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ padding: 0 }} colSpan={6}>
                          <Collapse in={expandedTicketId === ticket.id} timeout="auto" unmountOnExit>
                            <Box sx={{ m: 0, p: 3, background: "#f0f6ff", borderRadius: 2 }}>
                              <Stack spacing={1}>
                                <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark }}>
                                  <strong>Type:</strong> {ticket.type}
                                </Typography>
                                <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark }}>
                                  <strong>Department:</strong> {ticket.department}
                                </Typography>
                                <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark }}>
                                  <strong>Description:</strong> {ticket.description}
                                </Typography>
                                {ticket.fileUrl && (
                                  <Box>
                                    <Typography sx={{ fontFamily: "Outfit", color: palette.accentDark }}>
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
                                  </Box>
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
          },
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "Outfit",
            color: palette.accent,
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: palette.headerBg,
            borderRadius: "16px 16px 0 0",
          }}
        >
          Edit Ticket
          <IconButton onClick={handleCancelEdit} sx={{ color: palette.accent }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <form onSubmit={handleEditSubmit}>
            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark }}>
              Ticket ID
            </Typography>
            <TextField
              value={editForm.ticketId}
              disabled
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{ sx: { fontFamily: "Outfit", color: palette.accentDark } }}
              variant="outlined"
            />

            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark }}>
              Problem Title
            </Typography>
            <TextField
              value={editForm.problem}
              onChange={(e) => handleEditFormChange("problem", e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{ sx: { fontFamily: "Outfit", color: palette.accentDark } }}
              variant="outlined"
            />

            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark }}>
              Type of Problem
            </Typography>
            <TextField
              select
              value={editForm.type}
              onChange={(e) => handleEditFormChange("type", e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{ sx: { fontFamily: "Outfit", color: palette.accentDark } }}
              variant="outlined"
            >
              <MenuItem value="Software">Software</MenuItem>
              <MenuItem value="Hardware">Hardware</MenuItem>
            </TextField>

            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark }}>
              Department
            </Typography>
            <TextField
              value={editForm.department}
              onChange={(e) => handleEditFormChange("department", e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{ sx: { fontFamily: "Outfit", color: palette.accentDark } }}
              variant="outlined"
            />

            <Typography sx={{ mb: 0.5, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark }}>
              Description
            </Typography>
            <TextField
              value={editForm.description}
              onChange={(e) => handleEditFormChange("description", e.target.value)}
              multiline
              rows={4}
              fullWidth
              required
              sx={{ mb: 2 }}
              InputProps={{ sx: { fontFamily: "Outfit", color: palette.accentDark } }}
              variant="outlined"
            />

            <Typography sx={{ mb: 1, fontWeight: 500, fontFamily: "Outfit", color: palette.accentDark }}>
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
                px: 2,
                mb: 2,
                "&:hover": {
                  borderColor: palette.accentDark,
                  bgcolor: palette.headerBg,
                },
              }}
            >
              {editForm.file ? editForm.file.name : "Choose File"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            {editForm.fileUrl && (
              <Typography sx={{ mb: 2, fontFamily: "Outfit", color: palette.accent }}>
                Current file:{" "}
                <a
                  href={editForm.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: palette.accentDark }}
                >
                  View Current File {getFileTypeLabel(editForm.fileUrl)}
                </a>
              </Typography>
            )}

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2, fontFamily: "Outfit", borderRadius: "8px", bgcolor: "#e3e7ff", color: palette.accentDark }}
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
                  px: 4,
                  py: 1,
                  boxShadow: "none",
                  "&:hover": { backgroundColor: palette.accentDark },
                }}
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
                  px: 4,
                  py: 1,
                  "&:hover": { borderColor: palette.accentDark, bgcolor: palette.headerBg },
                }}
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