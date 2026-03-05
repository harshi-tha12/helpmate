import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  IconButton,
  useMediaQuery,
  TextField,
  Grid,
  Slider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { db } from "../../firebase.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import dayjs from "dayjs";

// Blue palette (consistent with ViewTickets.jsx)
const palette = {
  accent: "#1976d2",
  accentDark: "#115293",
  accentLight: "#e3f2fd",
  border: "#b3c7e6",
};

const normalizeOrg = (org) => (org || "").trim().toLowerCase();

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

const TicketDetails = ({ ticketId, onClose, organization, navigate }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignFormOpen, setAssignFormOpen] = useState(false);
  const [invalidConfirmOpen, setInvalidConfirmOpen] = useState(false);

  // For department dropdown
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // For agents dropdown
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");

  // Response/Resolution time control
  const [responseTime, setResponseTime] = useState("");
  const [resolutionDays, setResolutionDays] = useState("");
  const [resolutionHours, setResolutionHours] = useState("");
  const [resolutionMinutes, setResolutionMinutes] = useState("");
  const initialResolutionTimeRef = useRef(""); // <--- NEW

  // Assignment state
  const [assignedDialogOpen, setAssignedDialogOpen] = useState(false);
  const [assignedAgentInfo, setAssignedAgentInfo] = useState(null);
  const [assignedCount, setAssignedCount] = useState(0);

  // Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Generate options for days, hours, minutes
  const daysOptions = Array.from({ length: 11 }, (_, i) => i);
  const hoursOptions = Array.from({ length: 24 }, (_, i) => i);
  const minutesOptions = Array.from({ length: 60 }, (_, i) => i);

  // Whenever assign dialog opens, parse stored resolutionTime into dropdowns
  useEffect(() => {
    if (assignFormOpen && ticket?.resolutionTime) {
      const regex = /(\d+)\s*days?\s*(\d+)?\s*hours?\s*(\d+)?\s*minutes?/i;
      const match = ticket.resolutionTime.match(regex);
      if (match) {
        setResolutionDays(match[1] || "0");
        setResolutionHours(match[2] || "0");
        setResolutionMinutes(match[3] || "0");
        initialResolutionTimeRef.current = `${match[1] || "0"} days ${match[2] || "0"} hours ${match[3] || "0"} minutes`;
      } else {
        setResolutionDays("0");
        setResolutionHours("0");
        setResolutionMinutes("0");
        initialResolutionTimeRef.current = "0 days 0 hours 0 minutes";
      }
    }
  }, [assignFormOpen, ticket]);

  // Handle marking ticket as invalid
  const handleMarkInvalid = async () => {
    try {
      await updateDoc(doc(db, "tickets", ticket.id), {
        status: "Invalid",
        updatedAt: new Date(), // Update timestamp
      });
      setTicket((prev) => ({
        ...prev,
        status: "Invalid",
        updatedAt: new Date(),
      }));
      setInvalidConfirmOpen(false);
    } catch (err) {
      setError(`Failed to mark ticket as invalid. Error: ${err.message}`);
    }
  };

  const handleAssignSubmit = async () => {
    if (!ticket) {
      setError("No ticket data available to assign.");
      return;
    }
    if (!selectedDepartment) {
      setError("Please select a department.");
      return;
    }
    if (!selectedAgent) {
      setError("Please select an agent.");
      return;
    }
    try {
      const agent = agents.find((a) => a.username === selectedAgent);
      if (!agent) {
        setError("Selected agent not found.");
        return;
      }

      const assignedTime = Timestamp.fromDate(new Date());
      const createdAt = ticket.createdAt && ticket.createdAt.seconds
        ? new Date(ticket.createdAt.seconds * 1000)
        : null;
      let respondedTime = "";
      if (createdAt) {
        const diffInMs = assignedTime.toDate() - createdAt;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const days = Math.floor(diffInMinutes / (24 * 60));
        const hours = Math.floor((diffInMinutes % (24 * 60)) / 60);
        const minutes = diffInMinutes % 60;
        respondedTime = `${days} days ${hours} hours ${minutes} minutes`;
      }

      // Compute the new resolutionTime string
      const editedResolutionTime = `${resolutionDays} days ${resolutionHours} hours ${resolutionMinutes} minutes`;
      // If admin did NOT edit dropdowns, use ticket.resolutionTime as it was!
      let resolutionTimeToStore = editedResolutionTime;
      if (
        editedResolutionTime === initialResolutionTimeRef.current
        || (
          // fallback: if dropdowns match what's in tickets
          ticket.resolutionTime &&
          editedResolutionTime === ticket.resolutionTime
        )
      ) {
        resolutionTimeToStore = ticket.resolutionTime;
      }

      await updateDoc(doc(db, "tickets", ticket.id), {
        assignedAgent: selectedAgent,
        status: "Assigned",
        department: selectedDepartment,
        responseTime: responseTime,
        resolutionTime: resolutionTimeToStore,
        assignedTime: assignedTime,
        respondedTime: respondedTime,
        updatedAt: new Date(),
      });

      const allTickets = await getDocs(collection(db, "tickets"));
      const assignedTickets = allTickets.docs.filter(
        (docu) => docu.data().assignedAgent === selectedAgent
      );
      const assignedCountValue = assignedTickets.length;

      setAssignedAgentInfo(agent);
      setAssignedCount(assignedCountValue);
      setAssignedDialogOpen(true);
      setAssignFormOpen(false);

      const updatedDoc = await getDoc(doc(db, "tickets", ticket.id));
      if (updatedDoc.exists()) {
        const data = updatedDoc.data();
        setTicket({
          ...ticket,
          assignedAgent: data.assignedAgent || "Unassigned",
          status: data.status,
          department: data.department || "N/A",
          responseTime: data.responseTime,
          resolutionTime: data.resolutionTime,
          assignedTime: data.assignedTime,
          respondedTime: data.respondedTime,
          updatedAt: data.updatedAt,
        });
        setResponseTime(data.responseTime);
      }
    } catch (err) {
      setError(`Failed to assign agent. Error: ${err.message}`);
    }
  };

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) {
        setError("No ticket ID provided.");
        setLoading(false);
        return;
      }
      try {
        const ticketDoc = await getDoc(doc(db, "tickets", ticketId));
        if (ticketDoc.exists()) {
          const data = ticketDoc.data();
          let org = data.organization || data.orgName || organization;
          if (!org && data.createdBy) {
            const userDoc = await getDoc(doc(db, "Users", data.createdBy));
            if (userDoc.exists()) {
              org = userDoc.data().organization || userDoc.data().orgName;
            }
          }
          const ticketData = {
            id: ticketId,
            organization: normalizeOrg(org),
            ...data,
          };
          setTicket(ticketData);
          setResponseTime(data.responseTime ?? "");
        } else {
          setError("Ticket not found.");
        }
      } catch (error) {
        setError("Failed to load ticket. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId, organization]);

  const fetchDepartments = async () => {
    if (!ticket || !ticket.organization) {
      setError("Ticket organization not found. Unable to fetch departments.");
      return;
    }
    try {
      const deptRef = collection(db, "Departments");
      const q = query(deptRef, where("orgName", "==", ticket.organization));
      const deptSnapshot = await getDocs(q);
      const deptList = deptSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || doc.id,
          services: Array.isArray(data.services)
            ? data.services
            : typeof data.services === "string"
              ? data.services.split(",").map((s) => s.trim())
              : [],
        };
      });
      setDepartments(deptList);
    } catch (err) {
      setError(`Failed to load departments. Error: ${err.message}`);
    }
  };

  useEffect(() => {
    const fetchAgents = async () => {
      if (!selectedDepartment || !ticket || !ticket.organization) {
        setAgents([]);
        return;
      }
      try {
        const usersRef = collection(db, "Users");
        const q = query(
          usersRef,
          where("role", "==", "agent"),
          where("department", "==", selectedDepartment),
          where("orgName", "==", ticket.organization)
        );
        const snapshot = await getDocs(q);
        const agentList = snapshot.docs.map((doc) => ({
          id: doc.id,
          username: doc.data().username || doc.id,
          department: doc.data().department || "",
          orgName: doc.data().orgName || "",
        }));
        setAgents(agentList);
      } catch (err) {
        setError(`Failed to load agents. Error: ${err.message}`);
      }
    };

    fetchAgents();
  }, [selectedDepartment, ticket]);

  const handleAssignClick = () => {
    setError(null);
    setAssignFormOpen(true);
    setSelectedDepartment("");
    setSelectedAgent("");
    fetchDepartments();
  };

  const safeField = (field, fallback = "") => {
    if (field === null || field === undefined) return fallback;
    if (typeof field === "object") {
      if (field.priority) return field.priority;
      return JSON.stringify(field);
    }
    return field;
  };

  return (
    <Dialog
      open={!!ticketId}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-paper": {
          p: isMobile ? 1 : 2,
          borderRadius: 3,
          backgroundColor: "#fff",
        },
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(5px)",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        },
      }}
    >
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : ticket && (
        <Card
          sx={{
            maxWidth: 600,
            width: "100%",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            borderRadius: 2,
            px: isMobile ? 1 : 3,
            py: isMobile ? 1 : 2,
            bgcolor: "#fff",
            mb: 0,
            margin: "0 auto",
          }}
        >
          <CardContent sx={{ maxHeight: isMobile ? "70vh" : "80vh", overflowY: "auto" }}>
            <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", mb: 2 }}>
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontFamily: "PT Serif", color: "#1A43BF", wordBreak: "break-all" }}>
                Ticket {safeField(ticket.id)}
              </Typography>
              <IconButton onClick={onClose} sx={{ alignSelf: isMobile ? "flex-end" : "center", mt: isMobile ? 1 : 0 }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Created By:</strong> {safeField(ticket.createdBy)}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Created At:</strong> {ticket.createdAt && ticket.createdAt.seconds
                ? dayjs(new Date(ticket.createdAt.seconds * 1000)).format("YYYY-MM-DD hh:mm A")
                : "N/A"}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Assigned At:</strong> {ticket.assignedTime && ticket.assignedTime.toDate
                ? dayjs(ticket.assignedTime.toDate()).format("YYYY-MM-DD hh:mm A")
                : "N/A"}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Responded Time:</strong> {safeField(ticket.respondedTime, "N/A")}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Problem:</strong> {safeField(ticket.problem)}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Type:</strong> {safeField(ticket.type)}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Description:</strong> {safeField(ticket.description)}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Priority:</strong> {safeField(ticket.priority)}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Response Time:</strong> {safeField(ticket.responseTime)}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Resolution Time:</strong> {safeField(ticket.resolutionTime)}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Department:</strong> {safeField(ticket.department)}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>Status:</strong> {safeField(ticket.status)}
            </Typography>
            {ticket.fileUrl && (
              <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
                <strong>File:</strong>{" "}
                <FilePreview fileUrl={ticket.fileUrl} fileType={ticket.fileType} fileName={ticket.fileName} />
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 2, mt: 2, flexDirection: isMobile ? "column" : "row" }}>
              <Button
                variant="contained"
                sx={{
                  bgcolor: "#6A0DAD",
                  color: "white",
                  width: isMobile ? "100%" : "auto",
                }}
                onClick={handleAssignClick}
                disabled={ticket.status === "Closed" || ticket.status === "Invalid"}
              >
                Assign Ticket
              </Button>
              <Button
                variant="contained"
                sx={{
                  bgcolor: "#d32f2f",
                  color: "white",
                  width: isMobile ? "100%" : "auto",
                }}
                onClick={() => setInvalidConfirmOpen(true)}
                disabled={ticket.status === "Closed" || ticket.status === "Invalid"}
              >
                Mark as Invalid
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {assignFormOpen && (
        <Dialog
          open={assignFormOpen}
          onClose={() => setAssignFormOpen(false)}
          fullWidth
          maxWidth="sm"
          sx={{
            "& .MuiDialog-paper": {
              p: isMobile ? 2 : 3,
              borderRadius: 3,
              backgroundColor: "#fff",
            },
          }}
        >
          <DialogTitle sx={{ fontFamily: "PT Serif", color: "#1A43BF" }}>
            Assign Ticket {ticket?.id}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="department-select-label">Select Department</InputLabel>
              <Select
                labelId="department-select-label"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="Select Department"
                size={isMobile ? "small" : "medium"}
              >
                <MenuItem value="">
                  <em>Select a department</em>
                </MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name} ({dept.services.join(", ")})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }} disabled={!selectedDepartment}>
              <InputLabel id="agent-select-label">Select Agent</InputLabel>
              <Select
                labelId="agent-select-label"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                label="Select Agent"
                size={isMobile ? "small" : "medium"}
              >
                <MenuItem value="">
                  <em>Select an agent</em>
                </MenuItem>
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.username}>
                    {agent.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Response Time"
              value={responseTime}
              fullWidth
              disabled
              sx={{ mb: 2 }}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Resolution Time"
              value={safeField(ticket?.resolutionTime, "N/A")}
              fullWidth
              disabled
              sx={{ mb: 2 }}
              size={isMobile ? "small" : "medium"}
            />
            <Typography variant="subtitle1" sx={{ mb: 1, color: "#333" }}>
              Edit Resolution Time
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel id="resolution-days-label">Days</InputLabel>
                  <Select
                    labelId="resolution-days-label"
                    value={resolutionDays}
                    onChange={(e) => setResolutionDays(e.target.value)}
                    label="Days"
                    size={isMobile ? "small" : "medium"}
                  >
                    {daysOptions.map((day) => (
                      <MenuItem key={day} value={day}>
                        {day}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel id="resolution-hours-label">Hours</InputLabel>
                  <Select
                    labelId="resolution-hours-label"
                    value={resolutionHours}
                    onChange={(e) => setResolutionHours(e.target.value)}
                    label="Hours"
                    size={isMobile ? "small" : "medium"}
                  >
                    {hoursOptions.map((hour) => (
                      <MenuItem key={hour} value={hour}>
                        {hour}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel id="resolution-minutes-label">Minutes</InputLabel>
                  <Select
                    labelId="resolution-minutes-label"
                    value={resolutionMinutes}
                    onChange={(e) => setResolutionMinutes(e.target.value)}
                    label="Minutes"
                    size={isMobile ? "small" : "medium"}
                  >
                    {minutesOptions.map((minute) => (
                      <MenuItem key={minute} value={minute}>
                        {minute}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setAssignFormOpen(false)}
              sx={{ width: isMobile ? "100%" : "auto" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAssignSubmit}
              sx={{ bgcolor: "#6A0DAD", color: "white", width: isMobile ? "100%" : "auto" }}
              disabled={!selectedDepartment || !selectedAgent}
            >
              Assign
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Dialog
        open={assignedDialogOpen}
        onClose={() => {
          setAssignedDialogOpen(false);
        }}
        fullWidth
        maxWidth="xs"
        sx={{
          "& .MuiDialog-paper": {
            p: isMobile ? 1 : 2,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle>Agent Assigned Successfully</DialogTitle>
        <DialogContent dividers>
          <Typography>
            <strong>Ticket ID:</strong> {ticket?.id}
          </Typography>
          <Typography>
            <strong>Problem:</strong> {safeField(ticket?.problem)}
          </Typography>
          <Typography>
            <strong>Assigned To:</strong> {assignedAgentInfo?.username}
          </Typography>
          <Typography>
            <strong>Department:</strong> {assignedAgentInfo?.department || "N/A"}
          </Typography>
          <Typography>
            <strong>Total Tickets Assigned to This Agent:</strong> {assignedCount}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAssignedDialogOpen(false);
            }}
            sx={{ width: isMobile ? "100%" : "auto" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* New Confirmation Dialog for Marking Invalid */}
      <Dialog
        open={invalidConfirmOpen}
        onClose={() => setInvalidConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
        sx={{
          "& .MuiDialog-paper": {
            p: isMobile ? 1 : 2,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle>Confirm Mark as Invalid</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to mark ticket <strong>{ticket?.id}</strong> as invalid? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setInvalidConfirmOpen(false)}
            sx={{ width: isMobile ? "100%" : "auto" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleMarkInvalid}
            sx={{ bgcolor: "#d32f2f", color: "white", width: isMobile ? "100%" : "auto" }}
          >
            Mark as Invalid
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default TicketDetails;