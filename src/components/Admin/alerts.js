import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  Collapse,
  Button,
  ButtonGroup,
  Alert,
} from "@mui/material";
import {
  WarningAmber as WarningIcon,
  Error as ErrorIcon,
  AssignmentInd as UnassignedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { keyframes } from "@mui/system";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import TicketDetails from "./ticketdetails.js"; // Adjust path if needed
import { useNavigate } from "react-router-dom";

dayjs.extend(relativeTime);

// Blinking animation for critical alerts
const blink = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
`;

// Color palette for alerts
const AlertPalette = {
  CRITICAL: { main: "#d32f2f", light: "#ffebee", contrastText: "#fff" }, // Red for overdue/breach
  HIGH: { main: "#f57c00", light: "#fff3e0", contrastText: "#fff" }, // Orange for response breach
  WARNING: { main: "#fbc02d", light: "#fffde7", contrastText: "#000" }, // Yellow for nearing
  LOW: { main: "#388e3c", light: "#e8f5e9", contrastText: "#fff" }, // Green for no alerts
};

/**
 * Normalize organization string for comparison
 */
const normalizeOrg = (org) => (org || "").trim().toLowerCase();

/**
 * Convert Firestore Timestamp or string to milliseconds
 */
const toMs = (val) => {
  if (!val) return null;
  if (typeof val === "number") return val;
  if (val.toDate) return val.toDate().getTime(); // Firestore Timestamp
  if (val.seconds) return val.seconds * 1000; // Firestore timestamp (from snapshot)
  return new Date(val).getTime();
};

/**
 * Parse time strings like "2 hours, 30 minutes" to minutes
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 120; // Default to 2 hours
  if (typeof timeStr === "number") return timeStr;
  let totalMinutes = 0;
  const parts = String(timeStr).toLowerCase().split(",");
  parts.forEach((part) => {
    const value = parseInt(part) || 0;
    if (part.includes("day")) totalMinutes += value * 1440;
    else if (part.includes("hour")) totalMinutes += value * 60;
    else if (part.includes("minute")) totalMinutes += value;
  });
  return totalMinutes || 120;
};

/**
 * Convert minutes to human-readable time
 */
const humanTime = (mins) => {
  if (mins < 1) return "less than a minute";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""}`;
  if (mins < 1440) {
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return `${hours} hour${hours !== 1 ? "s" : ""}${remaining > 0 ? ` ${remaining} minute${remaining !== 1 ? "s" : ""}` : ""}`;
  }
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  return `${days} day${days !== 1 ? "s" : ""}${hours > 0 ? ` ${hours} hour${hours !== 1 ? "s" : ""}` : ""}`;
};

/**
 * Agent Alerts Logic
 */
const getAgentAlerts = (tickets, adminOrg, now = Date.now()) => {
  const alerts = [];
  tickets.forEach((ticket) => {
    const ticketOrg = normalizeOrg(ticket.organization || ticket.orgName || "");
    if (ticketOrg !== adminOrg) return; // Filter by admin's organization

    const id = ticket.ticketId || ticket.id || "Unknown";
    const assignedAgent = (ticket.assignedAgent || "").trim().toLowerCase();
    const status = (ticket.status || "").toLowerCase();
    const isClosed = status === "closed" || status === "resolved";
    if (assignedAgent === "" || assignedAgent === "unassigned" || isClosed) return;

    const assignedTime = toMs(ticket.assignedTime) || toMs(ticket.createdAt);
    const updatedAt = toMs(ticket.updatedAt) || toMs(ticket.createdAt);
    if (!assignedTime || !updatedAt) return;

    const resolutionTime = parseTimeToMinutes(ticket.resolutionTime);
    const responseTime = parseTimeToMinutes(ticket.responseTime);
    const minutesSinceAssigned = (now - assignedTime) / (1000 * 60);
    const minutesSinceUpdate = (now - updatedAt) / (1000 * 60);

    // Resolution Time Overdue
    if (minutesSinceAssigned > resolutionTime) {
      alerts.push({
        type: "RESOLUTION_OVERDUE",
        palette: AlertPalette.CRITICAL,
        icon: <ErrorIcon sx={{ color: AlertPalette.CRITICAL.main, animation: `${blink} 1s infinite` }} />,
        label: "Resolution Time Overdue",
        message: `Assigned for ${humanTime(minutesSinceAssigned)} (SLA: ${humanTime(resolutionTime)})`,
        ticketId: id,
        assignee: assignedAgent,
        createdAt: ticket.createdAt,
        organization: ticket.organization || ticket.orgName || "Unknown",
      });
    } else if (minutesSinceAssigned > 0.85 * resolutionTime) {
      alerts.push({
        type: "RESOLUTION_WARNING",
        palette: AlertPalette.WARNING,
        icon: <WarningIcon sx={{ color: AlertPalette.WARNING.main }} />,
        label: "Resolution SLA Nearing",
        message: `Assigned for ${humanTime(minutesSinceAssigned)}/${humanTime(resolutionTime)}`,
        ticketId: id,
        assignee: assignedAgent,
        createdAt: ticket.createdAt,
        organization: ticket.organization || ticket.orgName || "Unknown",
      });
    }

    // Response Breach (no update since assigned)
    if (minutesSinceUpdate > responseTime) {
      alerts.push({
        type: "RESPONSE_BREACH",
        palette: AlertPalette.HIGH,
        icon: <ErrorIcon sx={{ color: AlertPalette.HIGH.main, animation: `${blink} 1s infinite` }} />,
        label: "No Update Since Assigned",
        message: `No update for ${humanTime(minutesSinceUpdate)} (SLA: ${humanTime(responseTime)})`,
        ticketId: id,
        assignee: assignedAgent,
        createdAt: ticket.createdAt,
        organization: ticket.organization || ticket.orgName || "Unknown",
      });
    } else if (minutesSinceUpdate > 0.85 * responseTime) {
      alerts.push({
        type: "RESPONSE_WARNING",
        palette: AlertPalette.WARNING,
        icon: <WarningIcon sx={{ color: AlertPalette.WARNING.main }} />,
        label: "Response SLA Nearing",
        message: `No update for ${humanTime(minutesSinceUpdate)}/${humanTime(responseTime)}`,
        ticketId: id,
        assignee: assignedAgent,
        createdAt: ticket.createdAt,
        organization: ticket.organization || ticket.orgName || "Unknown",
      });
    }
  });
  return alerts;
};

/**
 * Admin Alerts Logic
 */
const getAdminAlerts = (tickets, adminOrg, now = Date.now()) => {
  const alerts = [];
  tickets.forEach((ticket) => {
    const ticketOrg = normalizeOrg(ticket.organization || ticket.orgName || "");
    if (ticketOrg !== adminOrg) return; // Filter by admin's organization

    const id = ticket.ticketId || ticket.id || "Unknown";
    const assignedAgent = (ticket.assignedAgent || "").trim().toLowerCase();
    const status = (ticket.status || "").toLowerCase();
    const isClosed = status === "closed" || status ==="resolved";
    if (assignedAgent !== "" && assignedAgent !== "unassigned" || isClosed) return;

    const createdAt = toMs(ticket.createdAt);
    if (!createdAt) return;
    const responseTime = parseTimeToMinutes(ticket.responseTime);
    const minutesOpen = (now - createdAt) / (1000 * 60);

    // Assign Agent Overdue
    if (minutesOpen >= responseTime) {
      alerts.push({
        type: "ASSIGN_AGENT_OVERDUE",
        palette: AlertPalette.CRITICAL,
        icon: <UnassignedIcon sx={{ color: AlertPalette.CRITICAL.main, animation: `${blink} 1s infinite` }} />,
        label: "Assign Agent Overdue",
        message: `Assign agent overdue: Ticket unassigned for ${humanTime(minutesOpen)} (SLA: ${humanTime(responseTime)})`,
        ticketId: id,
        assignee: "Unassigned",
        createdAt: ticket.createdAt,
        organization: ticket.organization || ticket.orgName || "Unknown",
      });
    } else if (minutesOpen > 0.85 * responseTime) {
      alerts.push({
        type: "ASSIGN_AGENT_WARNING",
        palette: AlertPalette.WARNING,
        icon: <UnassignedIcon sx={{ color: AlertPalette.WARNING.main }} />,
        label: "Assignment SLA Nearing",
        message: `Unassigned for ${humanTime(minutesOpen)}/${humanTime(responseTime)}`,
        ticketId: id,
        assignee: "Unassigned",
        createdAt: ticket.createdAt,
        organization: ticket.organization || ticket.orgName || "Unknown",
      });
    }
  });
  return alerts;
};

/**
 * EscalationAlert Component
 */
export default function EscalationAlert({ organization }) {
  const [viewMode, setViewMode] = useState("all"); // all, agent, admin
  const [expanded, setExpanded] = useState({ agent: true, admin: true });
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const navigate = useNavigate();
  const now = Date.now();

  // Validate organization prop
  const adminOrg = organization ? normalizeOrg(organization) : null;

  // Fetch tickets from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tickets"), (snapshot) => {
      const ticketData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTickets(ticketData);
    });
    return () => unsubscribe();
  }, []);

  // Handle alert click to open TicketDetails
  const handleAlertClick = (ticketId, organization) => {
    setSelectedTicketId(ticketId);
    setSelectedOrg(organization);
  };

  // Handle closing TicketDetails dialog
  const handleCloseTicketDetails = () => {
    setSelectedTicketId(null);
    setSelectedOrg(null);
  };

  // Render alerts only if adminOrg is set
  const agentAlerts = adminOrg ? getAgentAlerts(tickets, adminOrg, now) : [];
  const adminAlerts = adminOrg ? getAdminAlerts(tickets, adminOrg, now) : [];

  const renderAlerts = (title, alerts, sectionKey, bgGradient, headerColor) => (
    <Box sx={{ mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: bgGradient,
          p: 2,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: headerColor }}>
          {title} ({alerts.length})
        </Typography>
        <IconButton
          size="small"
          onClick={() => setExpanded((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
          sx={{ color: headerColor }}
        >
          {expanded[sectionKey] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded[sectionKey]}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {alerts.map((alert, idx) => (
            <Card
              key={`${sectionKey}-${idx}`}
              onClick={() => handleAlertClick(alert.ticketId, alert.organization)}
              sx={{
                borderLeft: `6px solid ${alert.palette.main}`,
                bgcolor: alert.palette.light,
                borderRadius: 2,
                boxShadow: 2,
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-2px)", cursor: "pointer" },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <Box sx={{ mt: 0.5 }}>{alert.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: alert.palette.main }}>
                        {alert.type.replace(/_/g, " ")}
                      </Typography>
                      <Chip
                        label={alert.label}
                        size="small"
                        sx={{
                          background: alert.palette.main,
                          color: alert.palette.contrastText,
                          fontWeight: 500,
                          borderRadius: 12,
                        }}
                      />
                      {alert.assignee === "Unassigned" && (
                        <Tooltip title="Unassigned ticket">
                          <UnassignedIcon sx={{ color: "#888", fontSize: 18 }} />
                        </Tooltip>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: "text.primary" }}>
                      <strong>#{alert.ticketId}</strong>: {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      Created {dayjs(alert.createdAt).fromNow()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );

  const noAlerts =
    (viewMode === "all" && agentAlerts.length === 0 && adminAlerts.length === 0) ||
    (viewMode === "agent" && agentAlerts.length === 0) ||
    (viewMode === "admin" && adminAlerts.length === 0);

  return (
    <Box sx={{ p: 3, fontFamily: "Arial, sans-serif" }}>
      {!adminOrg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          No organization provided. Please specify an organization.
        </Alert>
      )}
      {adminOrg && (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                borderBottom: 1,
                borderColor: "grey.300",
                pb: 1,
                ...(agentAlerts.length + adminAlerts.length > 0 && {
                  animation: `${blink} 1s infinite`,
                  color: AlertPalette.CRITICAL.main,
                }),
              }}
            >
              Escalation Alerts for {organization}
            </Typography>
            <ButtonGroup variant="contained" size="small">
              <Button onClick={() => setViewMode("all")} color={viewMode === "all" ? "primary" : "inherit"}>
                All Alerts
              </Button>
              <Button onClick={() => setViewMode("agent")} color={viewMode === "agent" ? "primary" : "inherit"}>
                Agent Alerts
              </Button>
              <Button onClick={() => setViewMode("admin")} color={viewMode === "admin" ? "primary" : "inherit"}>
                Admin Alerts
              </Button>
            </ButtonGroup>
          </Box>

          {noAlerts && (
            <Card sx={{ mb: 3, bgcolor: AlertPalette.LOW.light, borderRadius: 2, boxShadow: 1 }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
                <CheckCircleIcon sx={{ color: AlertPalette.LOW.main }} />
                <Typography variant="body1" color={AlertPalette.LOW.main} sx={{ fontWeight: 500 }}>
                  No active alerts at this time
                </Typography>
              </CardContent>
            </Card>
          )}

          {(viewMode === "all" || viewMode === "admin") && adminAlerts.length > 0 &&
            renderAlerts("Admin Escalations", adminAlerts, "admin", "linear-gradient(to right, #ffebee, #fff3e0)", AlertPalette.CRITICAL.main)}

          {(viewMode === "all" || viewMode === "agent") && agentAlerts.length > 0 &&
            renderAlerts("Agent Alerts", agentAlerts, "agent", "linear-gradient(to right, #e1f5fe, #e8f5e9)", AlertPalette.HIGH.main)}
        </>
      )}

      {selectedTicketId && (
        <TicketDetails
          ticketId={selectedTicketId}
          organization={selectedOrg}
          navigate={navigate}
          onClose={handleCloseTicketDetails}
        />
      )}
    </Box>
  );
}