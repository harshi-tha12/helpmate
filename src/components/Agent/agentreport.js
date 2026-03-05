import React, { useEffect, useState } from "react";
import {
  Box, Typography, Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Chip, CircularProgress,
  IconButton, Menu, MenuItem, Tooltip, Paper,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import jsPDF from "jspdf";

const tableHeaderStyles = {
  fontWeight: 700,
  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
  color: "#fff",
  backgroundColor: "#1976D2",
  fontFamily: "'Inter', sans-serif",
};

const cellStyles = {
  fontSize: { xs: "0.75rem", sm: "0.85rem", md: "0.95rem" },
  color: "#123499",
  fontFamily: "'Inter', sans-serif",
  borderBottom: "1px solid #e0e0e0",
};

const chipStyles = {
  fontSize: { xs: "0.7rem", sm: "0.8rem" },
  height: { xs: 24, sm: 28 },
  fontFamily: "'Inter', sans-serif",
};

const statusColorMap = {
  closed: "success",
  open: "warning",
  pending: "info",
};

const AgentReport = ({ username, orgName, department }) => {  // ✅ Added department
  const [closedTickets, setClosedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTicketForDownload, setSelectedTicketForDownload] = useState(null);

  // Fetch closed tickets for the agent
  useEffect(() => {
    const fetchClosedTickets = async () => {
      try {
        setLoading(true);
        
        console.log("Fetching closed tickets with:", {
          orgName,
          username,
          department,
        });

        // ✅ Build dynamic query conditions
        const conditions = [
          where("status", "==", "closed"),
          where("assignedAgent", "==", username),
        ];

        // Only add orgName if it exists and is not "Not Assigned"
        if (orgName && orgName !== "Not Assigned") {
          conditions.push(where("orgName", "==", orgName));
        }

        const q = query(collection(db, "Tickets"), ...conditions);
        
        const snapshot = await getDocs(q);
        const tickets = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Fetched tickets:", tickets);

        setClosedTickets(tickets);
        setError("");
      } catch (err) {
        console.error("Error fetching closed tickets:", err);
        setError(`Failed to fetch closed tickets: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have the required data
    if (username && orgName) {
      fetchClosedTickets();
    } else {
      setLoading(false);
      setError("Missing username or organization information");
    }
  }, [username, orgName]); // Removed department as it's not used in query

  // Handle download menu
  const handleDownloadClick = (event, ticket) => {
    setAnchorEl(event.currentTarget);
    setSelectedTicketForDownload(ticket);
  };

  const handleDownloadClose = () => {
    setAnchorEl(null);
    setSelectedTicketForDownload(null);
  };

  // Generate CSV content
  const generateCSV = (ticket) => {
    const headers = ["Ticket ID", "Problem", "Department", "Created At", "Closed At", "Status", "Remarks"];
    const remarksText = Array.isArray(ticket.remarks)
      ? ticket.remarks.map((r) => `Status: ${r.status}, By: ${r.by}, At: ${new Date(r.at).toLocaleString()}, Text: ${r.text}`).join("; ")
      : "No remarks";
    const row = [
      ticket.id,
      ticket.problem || "N/A",
      ticket.department || "N/A",
      ticket.createdAt?.seconds ? new Date(ticket.createdAt.seconds * 1000).toLocaleString() : "N/A",
      ticket.closedAt?.seconds ? new Date(ticket.closedAt.seconds * 1000).toLocaleString() : "N/A",
      ticket.status,
      remarksText,
    ].map((field) => `"${String(field).replace(/"/g, '""')}"`);
    return [headers.join(","), row.join(",")].join("\n");
  };

  // Download CSV
  const handleDownloadCSVOption = () => {
    if (selectedTicketForDownload) {
      const csvContent = generateCSV(selectedTicketForDownload);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ticket_${selectedTicketForDownload.id}.csv`;
      link.click();
    }
    handleDownloadClose();
  };

  // Generate LaTeX content for PDF
  

  // Download PDF
  const handleDownloadPDFOption = () => {
    if (selectedTicketForDownload) {
      const doc = new jsPDF();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Closed Ticket Report - Ticket ID: ${selectedTicketForDownload.id}`, 10, 10);
      doc.text(`Agent: ${username}`, 10, 20);
      doc.text(`Problem: ${selectedTicketForDownload.problem || "N/A"}`, 10, 30);
      doc.text(`Department: ${selectedTicketForDownload.department || "N/A"}`, 10, 40);
      doc.text(
        `Created At: ${selectedTicketForDownload.createdAt?.seconds ? new Date(selectedTicketForDownload.createdAt.seconds * 1000).toLocaleString() : "N/A"}`,
        10,
        50
      );
      doc.text(
        `Closed At: ${selectedTicketForDownload.closedAt?.seconds ? new Date(selectedTicketForDownload.closedAt.seconds * 1000).toLocaleString() : "N/A"}`,
        10,
        60
      );
      doc.text(`Status: ${selectedTicketForDownload.status}`, 10, 70);
      doc.text("Remarks:", 10, 80);
      let y = 90;
      if (Array.isArray(selectedTicketForDownload.remarks) && selectedTicketForDownload.remarks.length > 0) {
        selectedTicketForDownload.remarks.forEach((remark, idx) => {
          doc.text(`${idx + 1}. Status: ${remark.status}, By: ${remark.by}, At: ${new Date(remark.at).toLocaleString()}, Text: ${remark.text}`, 10, y);
          y += 10;
        });
      } else {
        doc.text("No remarks", 10, y);
      }
      doc.save(`ticket_${selectedTicketForDownload.id}.pdf`);
    }
    handleDownloadClose();
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
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
        Closed Ticket Reports for {username}
      </Typography>
      {error && (
        <Typography
          color="error"
          sx={{ mb: 2, fontSize: { xs: "0.85rem", sm: "0.95rem" }, fontFamily: "'Inter', sans-serif" }}
        >
          {error}
        </Typography>
      )}
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
        <Table size="small" aria-label="Closed Tickets Report Table">
          <TableHead>
            <TableRow>
              {["Ticket ID", "Problem", "Department", "Created At", "Closed At", "Status", "Remarks", "Actions"].map(
                (header) => (
                  <TableCell key={header} sx={tableHeaderStyles} scope="col">
                    {header}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={28} color="primary" />
                </TableCell>
              </TableRow>
            ) : closedTickets.length === 0 ? (
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
            ) : (
              closedTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
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
                        sx={{ ...chipStyles, fontFamily: "monospace", bgcolor: "#eef4fe" }}
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
                      : "N/A"}
                  </TableCell>
                  <TableCell sx={cellStyles}>
                    {ticket.closedAt?.seconds
                      ? new Date(ticket.closedAt.seconds * 1000).toLocaleString()
                      : Array.isArray(ticket.remarks) && ticket.remarks.length > 0
                        ? new Date(ticket.remarks[ticket.remarks.length - 1].at).toLocaleString()
                        : "N/A"}
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
                    {Array.isArray(ticket.remarks) && ticket.remarks.length > 0 ? (
                      ticket.remarks.slice(0, 2).map((remark, idx) => (
                        <Box
                          key={idx}
                          sx={{ mb: 1, pl: 1, borderLeft: "2px solid #1976D2" }}
                        >
                          <Typography sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" }, fontFamily: "'Inter', sans-serif" }}>
                            <b>Status:</b> {remark.status}
                          </Typography>
                          <Typography sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" }, fontFamily: "'Inter', sans-serif" }}>
                            <b>By:</b> {remark.by} <b>At:</b> {new Date(remark.at).toLocaleString()}
                          </Typography>
                          <Typography sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" }, fontFamily: "'Inter', sans-serif" }}>
                            <b>Remarks:</b> {remark.text}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontFamily: "'Inter', sans-serif", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
                      >
                        No remarks
                      </Typography>
                    )}
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
                      open={Boolean(anchorEl) && selectedTicketForDownload?.id === ticket.id}
                      onClose={handleDownloadClose}
                      MenuListProps={{ "aria-labelledby": `download-button-${ticket.id}` }}
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AgentReport;