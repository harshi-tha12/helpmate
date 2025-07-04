import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Divider,
  TextField
} from "@mui/material";
import { db } from "../../firebase";
import { collection, getDocs, query, where, updateDoc, doc, getDoc } from "firebase/firestore";

const statusOrder = ["Open", "In Progress", "Resolved", "Closed"];
const statusColor = {
  "Open": "info",
  "In Progress": "warning",
  "Resolved": "success",
  "Closed": "default"
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

  const username = sessionStorage.getItem("username");

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

  // Fetch tickets assigned to agent
  const fetchTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "tickets"), where("assignedAgent", "==", username));
      const querySnapshot = await getDocs(q);
      const allTickets = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const grouped = {};
      statusOrder.forEach((status) => (grouped[status] = []));
      allTickets.forEach((ticket) => {
        const status = statusOrder.includes(ticket.status) ? ticket.status : "Open";
        grouped[status].push(ticket);
      });

      setTicketsByStatus(grouped);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to fetch tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line
  }, [username]);

  // For status change: open remarks dialog only for "Closed", otherwise just update
  const handleStatusChange = (ticketId, newStatus, ticket) => {
    setError("");
    if (newStatus === "Closed") {
      setStatusChange({ open: true, ticket, newStatus, remarks: "" });
    } else {
      // Directly update status for other statuses
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
      // Store remarks in a "remarks" array
      let newRemarkEntry = {
        by: username,
        status: newStatus,
        text: remarks,
        at: new Date().toISOString()
      };

      // Fetch current remarks if any
      const ticketSnap = await getDoc(ticketRef);
      let currentRemarks = [];
      if (ticketSnap.exists() && Array.isArray(ticketSnap.data().remarks)) {
        currentRemarks = ticketSnap.data().remarks;
      }

      await updateDoc(ticketRef, {
        status: newStatus,
        remarks: [...currentRemarks, newRemarkEntry]
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
  };

  const handleCloseDialog = () => {
    setSelectedTicket(null);
    setUserDetails({});
    setLoadingUser(false);
  };

  // Table styles
  const tableStyles = {
    borderRadius: 3,
    boxShadow: "0 2px 12px rgba(25, 118, 210, 0.07)",
    border: "1px solid #e3e6f0",
    background: "#fff",
    minWidth: 1200,
    width: "100%",
  };

  const cellStyles = {
    fontSize: 15,
    color: "#263238",
    borderBottom: "1px solid #f3f3f3",
    cursor: "pointer"
  };

  const headerCellStyles = {
    ...cellStyles,
    fontWeight: "bold",
    background: "#f7fbff",
    color: "#1976d2",
    borderBottom: "2px solid #e3e6f0",
    cursor: "default"
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h4" sx={{ color: "#1976d2", mb: 4, fontWeight: 700, letterSpacing: 1 }}>
        Assigned Tickets
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        statusOrder.map((status) =>
          (ticketsByStatus[status] || []).length > 0 ? (
            <Box key={status} sx={{ mb: 5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={status}
                  color={statusColor[status]}
                  variant="filled"
                  sx={{ fontWeight: 600, fontSize: 16, height: 32 }}
                />
                <Typography variant="subtitle1" sx={{ color: "#1976d2", fontWeight: 500 }}>
                  {ticketsByStatus[status].length} ticket{ticketsByStatus[status].length > 1 ? "s" : ""}
                </Typography>
              </Stack>
              <TableContainer component={Paper} sx={tableStyles}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headerCellStyles}>Ticket ID</TableCell>
                      <TableCell sx={headerCellStyles}>Problem</TableCell>
                      <TableCell sx={headerCellStyles}>Department</TableCell>
                      <TableCell sx={headerCellStyles}>Description</TableCell>
                      <TableCell sx={headerCellStyles}>Created By</TableCell>
                      <TableCell sx={headerCellStyles}>Created At</TableCell>
                      <TableCell sx={headerCellStyles}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(ticketsByStatus[status] || []).map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        sx={{
                          transition: "background 0.2s",
                          "&:hover": { background: "#e8f3fc" }
                        }}
                        onClick={() => handleRowClick(ticket)}
                      >
                        <TableCell sx={cellStyles}>
                          <Chip
                            label={ticket.id}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: "monospace", fontWeight: 500 }}
                            onClick={e => { e.stopPropagation(); handleRowClick(ticket); }}
                          />
                        </TableCell>
                        <TableCell sx={cellStyles}>{ticket.problem || <i>N/A</i>}</TableCell>
                        <TableCell sx={cellStyles}>{ticket.department || <i>N/A</i>}</TableCell>
                        <TableCell sx={cellStyles} title={ticket.description}>
                          <Box
                            sx={{
                              maxWidth: 400,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "inline-block"
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
                            onClick={e => { e.stopPropagation(); handleRowClick(ticket); }}
                          />
                        </TableCell>
                        <TableCell sx={cellStyles}>
                          {ticket.createdAt?.seconds
                            ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
                            : <i>N/A</i>}
                        </TableCell>
                        <TableCell sx={cellStyles}>
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
                              "& .MuiSelect-select": { py: 1.2 }
                            }}
                            onClick={e => e.stopPropagation()}
                          >
                            {statusOrder.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null
        )
      )}
      {!loading && statusOrder.every(st => (ticketsByStatus[st] || []).length === 0) && (
        <Alert severity="info" sx={{ mt: 4 }}>
          No assigned tickets found.
        </Alert>
      )}

      {/* Ticket Details Dialog */}
      <Dialog
        open={!!selectedTicket}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Ticket Details
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedTicket && (
            <>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#1976d2" }}>Ticket ID:</Typography>
                  <Typography fontWeight={500}>{selectedTicket.id}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#1976d2" }}>Problem:</Typography>
                  <Typography>{selectedTicket.problem || <i>N/A</i>}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#1976d2" }}>Department:</Typography>
                  <Typography>{selectedTicket.department || <i>N/A</i>}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#1976d2" }}>Description:</Typography>
                  <Typography whiteSpace="pre-line">{selectedTicket.description || <i>N/A</i>}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#1976d2" }}>Created At:</Typography>
                  <Typography>
                    {selectedTicket.createdAt?.seconds
                      ? new Date(selectedTicket.createdAt.seconds * 1000).toLocaleString()
                      : <i>N/A</i>}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#1976d2" }}>Status:</Typography>
                  <Chip
                    label={selectedTicket.status}
                    color={statusColor[selectedTicket.status]}
                    sx={{ fontWeight: 600, fontSize: 16, height: 28 }}
                  />
                </Box>
                {/* Show remarks history */}
                {Array.isArray(selectedTicket.remarks) && selectedTicket.remarks.length > 0 && (
                  <Box>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ color: "#1976d2" }}>Remarks History:</Typography>
                    <Box sx={{ mt: 1 }}>
                      {selectedTicket.remarks.map((remark, idx) => (
                        <Box key={idx} sx={{ mb: 1, pl: 1, borderLeft: "2px solid #1976d2" }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            <b>Status:</b> {remark.status}
                          </Typography>
                          <Typography variant="body2">
                            <b>By:</b> {remark.by} <b>At:</b> {new Date(remark.at).toLocaleString()}
                          </Typography>
                          <Typography variant="body2">
                            <b>Remarks:</b> {remark.text}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#1976d2" }}>User Name:</Typography>
                  <Typography fontWeight={500}>
                    {selectedTicket.createdBy || <i>N/A</i>}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mt: 2, color: "#1976d2" }}>User Details:</Typography>
                  {loadingUser ? (
                    <CircularProgress size={18} />
                  ) : (
                    userDetails && Object.keys(userDetails).length > 0 ? (
                      <Box sx={{ mt: 1 }}>
                        {userDetails.displayName && (
                          <Typography>
                            <b>Name:</b> {userDetails.displayName}
                          </Typography>
                        )}
                        {userDetails.email && (
                          <Typography>
                            <b>Email:</b> {userDetails.email}
                          </Typography>
                        )}
                        {/* Add more fields as needed */}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No user details found.
                      </Typography>
                    )
                  )}
                </Box>
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Remarks Dialog, only on closing */}
      <Dialog open={statusChange.open} onClose={() => setStatusChange({ open: false, ticket: null, newStatus: "", remarks: "" })} maxWidth="sm" fullWidth>
        <DialogTitle>Add Remarks for Closing Ticket</DialogTitle>
        <DialogContent>
          <DialogContentText>
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
            onChange={e => setStatusChange({ ...statusChange, remarks: e.target.value })}
            disabled={remarksLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusChange({ open: false, ticket: null, newStatus: "", remarks: "" })} disabled={remarksLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRemarksSubmit}
            disabled={remarksLoading || !statusChange.remarks.trim()}
          >
            {remarksLoading ? <CircularProgress size={18} /> : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssignedTickets;