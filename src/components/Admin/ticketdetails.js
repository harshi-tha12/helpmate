import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { db } from "../../firebase.js";
import { doc, getDoc } from "firebase/firestore";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";

const TicketDetails = () => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { state } = useLocation();
  const ticketId = state?.ticketId;
  const navigate = useNavigate();

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
          setTicket({
            id: ticketId,
            createdBy: data.createdBy || "N/A",
            assignedAgent: data.assignedAgent || "Unassigned",
            createdAt: data.createdAt?.toDate() || new Date(),
            problem: data.problem || "N/A",
            type: data.type || "N/A",
            department: data.department || "N/A",
            description: data.description || "N/A",
            status: data.status || "Open",
            fileUrl: data.fileUrl || null,
          });
        } else {
          setError("Ticket not found.");
        }
      } catch (error) {
        console.error("Error fetching ticket:", error);
        setError("Failed to load ticket. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>No ticket data available.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: "100%", overflowX: "auto" }}>
      <Card sx={{ mb: 3, boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", borderRadius: 2 }}>
        <CardContent>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ fontFamily: "PT Serif", color: "#1A43BF", mb: 2 }}
          >
            Ticket {ticket.id}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
            <strong>Created By:</strong> {ticket.createdBy}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
            <strong>Assigned Agent:</strong> {ticket.assignedAgent}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
            <strong>Created At:</strong> {dayjs(ticket.createdAt).format("YYYY-MM-DD hh:mm A")}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
            <strong>Problem:</strong> {ticket.problem}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
            <strong>Type:</strong> {ticket.type}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
            <strong>Department:</strong> {ticket.department}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
            <strong>Description:</strong> {ticket.description}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
            <strong>Status:</strong> {ticket.status}
          </Typography>
          {ticket.fileUrl && (
            <Typography variant="subtitle1" sx={{ color: "#333", mb: 1 }}>
              <strong>File:</strong>{" "}
              <a href={ticket.fileUrl} target="_blank" rel="noopener noreferrer">
                View File
              </a>
            </Typography>
          )}
        </CardContent>
      </Card>
      <Button
        variant="contained"
        sx={{ mt: 2, bgcolor: "#6A0DAD", color: "white" }}
        onClick={() => navigate(`/ticketassignpage/${ticket.id}`)}
      >
        Assign Ticket
      </Button>
    </Box>
  );
};

export default TicketDetails;