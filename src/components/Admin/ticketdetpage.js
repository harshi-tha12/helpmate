import React, { useEffect, useState } from "react";
import {
  setDoc,
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Link,
  Card,
  CardContent,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useParams } from "react-router-dom";
import { db } from "../../firebase.js";
import dayjs from "dayjs";

const normalizeOrg = (org) => (org || "").trim().toLowerCase();

const TicketDetailsPage = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAgents, setShowAgents] = useState(false);
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignedDialogOpen, setAssignedDialogOpen] = useState(false);
  const [assignedAgentInfo, setAssignedAgentInfo] = useState(null);
  const [assignedCount, setAssignedCount] = useState(0);

  // 1. Fetch ticket, always normalize organization
  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) {
        setError("No ticket ID provided in URL.");
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, "tickets", ticketId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const ticketData = {
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          };

          // Get org from ticket, fallback to user if needed, always normalize
          let org = ticketData.organization || ticketData.orgName;
          if (!org && ticketData.createdBy) {
            const userDoc = await getDoc(doc(db, "Users", ticketData.createdBy));
            if (userDoc.exists()) {
              org = userDoc.data().organization || userDoc.data().orgName;
            }
          }
          ticketData.organization = normalizeOrg(org);
          setTicket(ticketData);
        } else {
          setError("Ticket not found in database.");
        }
      } catch (err) {
        setError(`Failed to load ticket. Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId]);

  // 2. Fetch agents for this org, regardless of orgName/organization and case
  const fetchAgents = async () => {
    if (!ticket || !ticket.organization) {
      setError("Ticket organization not found. Unable to fetch agents.");
      return;
    }
    try {
      const usersRef = collection(db, "Users");
      // Get all agents, then filter in JS for robust matching
      const q = query(usersRef, where("role", "==", "agent"));
      const snapshot = await getDocs(q);
      const agentsList = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          // Support both orgName and organization fields, normalize
          const agentOrg =
            normalizeOrg(data.orgName) || normalizeOrg(data.organization);
          return {
            id: doc.id,
            ...data,
            organization: agentOrg,
          };
        })
        .filter(
          (agent) => agent.organization === ticket.organization
        );

      setAgents(agentsList);
      setFilteredAgents(agentsList);

      if (agentsList.length === 0) {
        setError(
          `No agents found for organization: ${ticket.organization}`
        );
      }
    } catch (err) {
      setError(`Failed to load agents. Error: ${err.message}`);
      console.error("Error fetching agents:", err);
    }
  };

  const handleAssignClick = () => {
    setError(null);
    setShowAgents(true);
    fetchAgents();
  };

  const handleSearchChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);
    setFilteredAgents(
      agents.filter(
        (agent) =>
          (agent.department?.toLowerCase().includes(value) ?? false) ||
          (agent.username?.toLowerCase().includes(value) ?? false)
      )
    );
  };

  const handleCloseModal = () => {
    setShowAgents(false);
    setSearchTerm("");
    setFilteredAgents(agents);
  };

  const assignAgent = async (agent) => {
    if (!ticket) {
      setError("No ticket data available to assign.");
      return;
    }
    try {
      await updateDoc(doc(db, "tickets", ticket.id), {
        assignedAgent: agent.username,
        status: "Assigned",
      });

      await setDoc(
        doc(db, "agent", agent.username, "assignedTickets", ticket.id),
        {
          ...ticket,
          assignedAgent: agent.username,
          status: "Assigned",
        }
      );

      const allTickets = await getDocs(collection(db, "tickets"));
      const assignedTickets = allTickets.docs.filter(
        (doc) => doc.data().assignedAgent === agent.username
      );

      setAssignedCount(assignedTickets.length);
      setAssignedAgentInfo(agent);
      setAssignedDialogOpen(true);
      handleCloseModal();

      const updatedDoc = await getDoc(doc(db, "tickets", ticket.id));
      if (updatedDoc.exists()) {
        setTicket({
          id: updatedDoc.id,
          ...updatedDoc.data(),
          createdAt: updatedDoc.data().createdAt?.toDate() || new Date(),
        });
      }
    } catch (err) {
      setError(`Failed to assign agent. Error: ${err.message}`);
    }
  };

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
        <Button
          variant="contained"
          sx={{ mt: 2, bgcolor: "#6A0DAD", color: "white" }}
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 4,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      {showAgents && (
        <Paper
          elevation={5}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 600,
            maxHeight: "80vh",
            overflowY: "auto",
            backgroundColor: "#fff",
            zIndex: 10,
            p: 3,
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6">Assign to Agent</Typography>
            <IconButton onClick={handleCloseModal}>
              <CloseIcon />
            </IconButton>
          </Box>

          <TextField
            fullWidth
            label="Search by Department or Username"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ mb: 2 }}
          />
          <List>
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <React.Fragment key={agent.id}>
                  <ListItem
                    secondaryAction={
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => assignAgent(agent)}
                      >
                        Assign
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`Username: ${agent.username}`}
                      secondary={`Department: ${agent.department}`}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            ) : (
              <Typography sx={{ mt: 1 }}>
                No agents found for this organization: {ticket.organization}
              </Typography>
            )}
          </List>
        </Paper>
      )}

      <Card
        sx={{
          width: "100%",
          maxWidth: 800,
          backgroundColor: "#F9FAFB",
          borderRadius: "16px",
          boxShadow: 3,
          p: 2,
          filter: showAgents ? "blur(4px)" : "none",
          transition: "filter 0.3s ease",
        }}
      >
        <CardContent>
          <Typography
            variant="h4"
            sx={{ fontFamily: "PT Serif", color: "#1A43BF", mb: 2 }}
          >
            Ticket ID: {ticket.id}
          </Typography>

          <Typography>
            <strong>Created By:</strong> {ticket.createdBy}
          </Typography>
          <Typography>
            <strong>Assigned Agent:</strong>{" "}
            {ticket.assignedAgent || "Unassigned"}
          </Typography>
          <Typography>
            <strong>Created At:</strong>{" "}
            {dayjs(ticket.createdAt).format("YYYY-MM-DD hh:mm A")}
          </Typography>
          <Typography>
            <strong>Organization:</strong> {ticket.organization}
          </Typography>
          <Typography>
            <strong>Problem:</strong> {ticket.problem}
          </Typography>
          <Typography>
            <strong>Type:</strong> {ticket.type}
          </Typography>
          <Typography>
            <strong>Department:</strong> {ticket.department}
          </Typography>

          <Typography sx={{ mt: 2 }}>
            <strong>Description:</strong>
          </Typography>
          <Typography sx={{ mb: 2 }}>{ticket.description}</Typography>

          <Typography>
            <strong>Attached File:</strong>{" "}
            {ticket.fileUrl ? (
              <Link href={ticket.fileUrl} target="_blank" rel="noopener">
                View File
              </Link>
            ) : (
              "No file attached"
            )}
          </Typography>

          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 3 }}
            onClick={handleAssignClick}
          >
            Assign
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={assignedDialogOpen}
        onClose={() => setAssignedDialogOpen(false)}
      >
        <DialogTitle>Agent Assigned Successfully</DialogTitle>
        <DialogContent dividers>
          <Typography>
            <strong>Ticket ID:</strong> {ticket?.id}
          </Typography>
          <Typography>
            <strong>Assigned To:</strong> {assignedAgentInfo?.username}
          </Typography>
          <Typography>
            <strong>Department:</strong> {assignedAgentInfo?.department}
          </Typography>
          <Typography>
            <strong>Total Tickets Assigned to This Agent:</strong>{" "}
            {assignedCount}
          </Typography>
          <Typography sx={{ mt: 1 }}>
            <strong>Problem:</strong> {ticket?.problem}
          </Typography>
          <Typography>
            <strong>Description:</strong> {ticket?.description}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignedDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TicketDetailsPage;