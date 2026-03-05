import React, { useState, useEffect } from "react";
import {
  Box, Button, Stack, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,FormControlLabel,
  Collapse, IconButton, FormControl, InputLabel, Select, MenuItem, Checkbox
} from "@mui/material";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import Papa from "papaparse";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const NAVY = "#1A2A6C";
const WHITE = "#FFF";
const LIGHT_GREY = "#f4f6f8";
const SELECT_BG = "#28396a";

// Utility function to parse time strings like "5 hours 0 minutes" or "0 days 3 hours 45 minutes" to hours
const parseTimeToHours = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return null;
  const regex = /(\d+)\s*days?\s*(\d+)\s*hours?\s*(\d+)\s*minutes?/i;
  const regexHoursOnly = /(\d+)\s*hours?\s*(\d+)\s*minutes?/i;
  let match = timeString.match(regex);
  if (!match) {
    match = timeString.match(regexHoursOnly);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours + minutes / 60;
  }
  const days = parseInt(match[1], 10);
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  return (days * 24) + hours + (minutes / 60);
};

// Utility function to format resolvedTime or respondedTime
const formatResolvedTime = (timeString) => {
  const hours = parseTimeToHours(timeString);
  return hours !== null ? `${hours.toFixed(2)} hours` : "N/A";
};

// Utility function to format priority
const formatPriority = (priority) => {
  if (!priority) return { priority: "N/A", reason: "N/A" };
  if (typeof priority === 'string') return { priority, reason: "N/A" };
  if (typeof priority === 'object' && priority.priority) {
    return { priority: priority.priority, reason: priority.reason || "N/A" };
  }
  return { priority: "N/A", reason: "N/A" };
};

function savePDF(title, columns, data, reportType, orgName, tickets = []) {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(16);
  doc.text("Helpmate: Ticket Management System", 10, 10);
  doc.setLineWidth(0.5);
  doc.line(10, 12, 100, 12); // Underline
  doc.setFontSize(14);
  doc.text(`${reportType} Report`, 10, 20);
  doc.setFontSize(12);
  doc.text(`Organization: ${orgName || "Unknown Organization"}`, 10, 30);

  if (reportType === "Tickets") {
    // Main table for Tickets Report
    autoTable(doc, {
      head: [columns],
      body: data,
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [26, 42, 108] }, // NAVY
    });

    // Add expanded details for each ticket
    let startY = doc.lastAutoTable.finalY + 10;
    tickets.forEach((ticket, index) => {
      const ticketId = ticket.id || ticket.ticketId || `ticket-${index}`;
      const ticketDetails = tickets.find(t => (t.id || t.ticketId) === ticketId);
      if (ticketDetails) {
        const { priority, reason } = formatPriority(ticketDetails.priority);
        const details = {
          id: ticketDetails.id || ticketDetails.ticketId || "N/A",
          department: ticketDetails.department || "N/A",
          createdBy: ticketDetails.createdBy || "N/A",
          status: ticketDetails.status || "N/A",
          assignedAgent: ticketDetails.assignedAgent || "N/A",
          createdAt: ticketDetails.createdAt?.toDate
            ? dayjs(ticketDetails.createdAt.toDate()).format("YYYY-MM-DD HH:mm")
            : (ticketDetails.createdAt ? dayjs(ticketDetails.createdAt).format("YYYY-MM-DD HH:mm") : "N/A"),
          assignedAt: ticketDetails.assignedTime?.toDate
            ? dayjs(ticketDetails.assignedTime.toDate()).format("YYYY-MM-DD HH:mm")
            : (ticketDetails.assignedTime ? dayjs(ticketDetails.assignedTime).format("YYYY-MM-DD HH:mm") : "N/A"),
          closedAt: ticketDetails.closedTime?.toDate
            ? dayjs(ticketDetails.closedTime.toDate()).format("YYYY-MM-DD HH:mm")
            : (ticketDetails.closedTime ? dayjs(ticketDetails.closedTime).format("YYYY-MM-DD HH:mm") : "N/A"),
          respondedTime: formatResolvedTime(ticketDetails.respondedTime),
          resolvedTime: formatResolvedTime(ticketDetails.resolvedTime),
          description: ticketDetails.description || "N/A",
          priority,
          reason,
          category: ticketDetails.category || "N/A"
        };
        doc.setFontSize(12);
        doc.text(`Ticket ${details.id}`, 10, startY);
        startY += 7;
        autoTable(doc, {
          head: [['Field', 'Value']],
          body: [
            ['Ticket ID', details.id],
            ['Department', details.department],
            ['Raised By', details.createdBy],
            ['Status', details.status],
            ['Assigned Agent', details.assignedAgent],
            ['Created At', details.createdAt],
            ['Assigned At', details.assignedAt],
            ['Closed At', details.closedAt],
            ['Responded Time', details.respondedTime],
            ['Resolved Time', details.resolvedTime],
            ['Description', details.description],
            ['Priority', details.priority],
            ['Priority Reason', details.reason],
            ['Category', details.category],
          ],
          startY,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [26, 42, 108] }, // NAVY
          columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 130 } },
        });
        startY = doc.lastAutoTable.finalY + 10;
      }
    });
  } else {
    // Agents or Organization Report
    autoTable(doc, {
      head: [columns],
      body: data,
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [26, 42, 108] }, // NAVY
    });
  }

  doc.save(`${title.replace(/\s/g, "_")}.pdf`);
}

function saveCSV(title, columns, data) {
  const csv = Papa.unparse({ fields: columns, data: data });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/\s/g, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const Reports = ({ adminData }) => {
  const [activeReport, setActiveReport] = useState("agents");
  const [agents, setAgents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Moved getFullTicketDetails inside Reports to access tickets state
  const getFullTicketDetails = (ticketId) => {
    if (!tickets || !Array.isArray(tickets)) return null;
    const ticket = tickets.find(t => (t.id || t.ticketId) === ticketId);
    if (!ticket) return null;
    const { priority, reason } = formatPriority(ticket.priority);
    return {
      id: ticket.id || ticket.ticketId || "N/A",
      department: ticket.department || "N/A",
      createdBy: ticket.createdBy || "N/A",
      status: ticket.status || "N/A",
      assignedAgent: ticket.assignedAgent || "N/A",
      createdAt: ticket.createdAt?.toDate
        ? dayjs(ticket.createdAt.toDate()).format("YYYY-MM-DD HH:mm")
        : (ticket.createdAt ? dayjs(ticket.createdAt).format("YYYY-MM-DD HH:mm") : "N/A"),
      assignedAt: ticket.assignedTime?.toDate
        ? dayjs(ticket.assignedTime.toDate()).format("YYYY-MM-DD HH:mm")
        : (ticket.assignedTime ? dayjs(ticket.assignedTime).format("YYYY-MM-DD HH:mm") : "N/A"),
      closedAt: ticket.closedTime?.toDate
        ? dayjs(ticket.closedTime.toDate()).format("YYYY-MM-DD HH:mm")
        : (ticket.closedTime ? dayjs(ticket.closedTime).format("YYYY-MM-DD HH:mm") : "N/A"),
      respondedTime: formatResolvedTime(ticket.respondedTime),
      resolvedTime: formatResolvedTime(ticket.resolvedTime),
      description: ticket.description || "N/A",
      priority,
      reason,
      category: ticket.category || "N/A"
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!adminData?.orgName) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const orgName = adminData.orgName;

        const qAgents = query(
          collection(db, "Users"),
          where("role", "==", "agent"),
          where("orgName", "==", orgName)
        );
        const agentsSnap = await getDocs(qAgents);
        const agentsData = agentsSnap.docs.map(doc => ({
          username: doc.id,
          ...doc.data(),
        }));
        setAgents(agentsData);
        console.log("Fetched agents:", agentsData);

        const qUsers = query(
          collection(db, "Users"),
          where("role", "==", "user"),
          where("orgName", "==", orgName)
        );
        const usersSnap = await getDocs(qUsers);
        setUsers(usersSnap.docs.map(doc => ({
          username: doc.id,
          ...doc.data(),
        })));

        const deptSnap = await getDocs(collection(db, "Organizations", orgName, "Departments"));
        setDepartments(deptSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })));

        const qTickets = query(
          collection(db, "tickets"),
          where("organization", "==", orgName)
        );
        const ticketsSnap = await getDocs(qTickets);
        const ticketsData = ticketsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTickets(ticketsData);
        console.log("Fetched tickets:", ticketsData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [adminData?.orgName]);

  const getAgentStats = (agentUsername) => {
    const username = agentUsername?.trim()?.toLowerCase() || "";
    
    const ticketsSolved = tickets.filter(ticket => {
      const assignedAgent = ticket.assignedAgent?.trim()?.toLowerCase() || "";
      const status = ticket.status?.trim()?.toLowerCase() || "";
      return assignedAgent === username && status === "closed";
    }).length;

    const assignedTickets = tickets.filter(ticket => {
      const assignedAgent = ticket.assignedAgent?.trim()?.toLowerCase() || "";
      return assignedAgent === username;
    }).length;

    const totalTicketsAllAgents = tickets?.filter(t => t.assignedAgent)?.length || 0;
    const performance = totalTicketsAllAgents ? (ticketsSolved / totalTicketsAllAgents) * 100 : 0;

    console.log(`Agent: ${username}, Tickets Solved: ${ticketsSolved}, Assigned Tickets: ${assignedTickets}, Performance: ${performance.toFixed(2)}%`);

    return { ticketsSolved, assignedTickets, performance };
  };

  const getAgentTicketDetails = (agentUsername, type) => {
    const username = agentUsername?.trim()?.toLowerCase() || "";
    return tickets.filter(ticket => {
      const assignedAgent = ticket.assignedAgent?.trim()?.toLowerCase() || "";
      if (type === "solved") {
        const status = ticket.status?.trim()?.toLowerCase() || "";
        return assignedAgent === username && status === "closed";
      }
      return assignedAgent === username;
    }).map(ticket => ({
      id: ticket.id || ticket.ticketId || "N/A",
      department: ticket.department || "N/A",
      status: ticket.status || "N/A",
      createdAt: ticket.createdAt?.toDate
        ? dayjs(ticket.createdAt.toDate()).format("YYYY-MM-DD HH:mm")
        : (ticket.createdAt ? dayjs(ticket.createdAt).format("YYYY-MM-DD HH:mm") : "N/A"),
      resolvedTime: formatResolvedTime(ticket.resolvedTime)
    }));
  };

  

  const getWeeklyMonthlyTickets = () => {
    if (!tickets) return { weekly: [], monthly: [] };
    const now = dayjs();
    const weekAgo = now.subtract(7, "day");
    const monthAgo = now.subtract(30, "day");
    return {
      weekly: tickets.filter(t =>
        dayjs(t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt).isAfter(weekAgo)
      ),
      monthly: tickets.filter(t =>
        dayjs(t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt).isAfter(monthAgo)
      )
    };
  };

  const getMonthWiseTickets = () => {
    const currentYear = dayjs().year();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    const currentYearTickets = tickets.filter(t => {
      const ticketDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return dayjs(ticketDate).year() === currentYear;
    });

    const groupedTickets = {};
    monthNames.forEach((month, index) => {
      groupedTickets[month] = currentYearTickets.filter(t => {
        const ticketDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return dayjs(ticketDate).month() === index;
      });
    });

    return groupedTickets;
  };

  const getFilteredTickets = () => {
    const currentYear = dayjs().year();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    if (selectedMonth === "all") {
      return tickets.filter(t => {
        const ticketDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return dayjs(ticketDate).year() === currentYear;
      });
    }

    const monthIndex = monthNames.indexOf(selectedMonth);
    return tickets.filter(t => {
      const ticketDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return dayjs(ticketDate).year() === currentYear && dayjs(ticketDate).month() === monthIndex;
    });
  };

  function prepareAgentsReportTableData() {
    const columns = [
      "Department", "Agent Name", "Username", "Tickets Solved", "Performance (%)"
    ];
    let data = [];
    departments.forEach(dept => {
      const deptAgents = agents.filter(a => a.department === dept.name);
      deptAgents.forEach(agent => {
        const stats = getAgentStats(agent.username);
        data.push([
          dept.name,
          agent.name || agent.username,
          agent.username,
          stats.ticketsSolved.toString(),
          stats.performance.toFixed(2),
        ]);
      });
    });
    return { columns, data };
  }

  function prepareTicketsReportTableData(selected = false) {
    const columns = [
      "Ticket ID", "Department", "Raised By", "Status", "Assigned Agent", "Created", "Responded Time", "Resolved Time", "Priority"
    ];
    let data = [];
    const targetTickets = selected ? tickets.filter(t => selectedTickets.includes(t.id || t.ticketId || `ticket-${tickets.indexOf(t)}`)) : tickets;
    targetTickets?.forEach(t => {
      const { priority } = formatPriority(t.priority);
      data.push([
        t.id || t.ticketId || "N/A",
        t.department || "N/A",
        t.createdBy || "N/A",
        t.status,
        t.assignedAgent || "",
        t.createdAt?.toDate
          ? dayjs(t.createdAt.toDate()).format("YYYY-MM-DD HH:mm")
          : (t.createdAt ? dayjs(t.createdAt).format("YYYY-MM-DD HH:mm") : ""),
        formatResolvedTime(t.respondedTime),
        formatResolvedTime(t.resolvedTime),
        priority
      ]);
    });
    return { columns, data };
  }

  function prepareOrganizationReportTableData() {
    const columns = ["Department", "Total Agents", "Total Tickets"];
    let data = [];
    departments.forEach(dept => {
      data.push([
        dept.name,
        agents.filter(a => a.department === dept.name).length.toString(),
        (tickets?.filter(t => t.department === dept.name).length || 0).toString(),
      ]);
    });
    return { columns, data };
  }

  const handleAgentExpandClick = (username) => {
    setExpandedAgent(expandedAgent === username ? null : username);
  };

  const handleTicketExpandClick = (ticketId) => {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId);
  };

  const handleMonthFilterChange = (event) => {
    setSelectedMonth(event.target.value);
    setSelectedTickets([]); // Reset selected tickets when month changes
    setSelectAll(false);
  };

  const handleTicketSelect = (ticketId) => {
    setSelectedTickets(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTickets([]);
      setSelectAll(false);
    } else {
      const allTicketIds = tickets.map((t, idx) => t.id || t.ticketId || `ticket-${idx}`);
      setSelectedTickets(allTicketIds);
      setSelectAll(true);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: LIGHT_GREY, borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 4 }}>
        {["agents", "tickets", "organization"].map(rep =>
          <Button
            key={rep}
            variant={activeReport === rep ? "contained" : "outlined"}
            onClick={() => setActiveReport(rep)}
            sx={{
              bgcolor: activeReport === rep ? NAVY : WHITE,
              "&:hover": { bgcolor: SELECT_BG, color: WHITE },
              minWidth: 140, p: 2, borderRadius: 12, fontWeight: 600,
              fontSize: { xs: "1rem", sm: "1.1rem" }, textTransform: "none",
              color: activeReport === rep ? WHITE : NAVY,
              border: `1px solid ${NAVY}`
            }}
          >
            {rep.charAt(0).toUpperCase() + rep.slice(1)}
          </Button>
        )}
      </Stack>

      {!loading && (
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mb: 2 }}>
          <Button
            variant="outlined" onClick={() => {
              if (activeReport === "agents") {
                const { columns, data } = prepareAgentsReportTableData();
                savePDF("Agents Report", columns, data, "Agents", adminData?.orgName);
              } else if (activeReport === "tickets") {
                const { columns, data } = prepareTicketsReportTableData();
                savePDF("Tickets Report", columns, data, "Tickets", adminData?.orgName, tickets);
              } else {
                const { columns, data } = prepareOrganizationReportTableData();
                savePDF("Organization Report", columns, data, "Organization", adminData?.orgName);
              }
            }}>Download PDF</Button>
          <Button
            variant="outlined" onClick={() => {
              if (activeReport === "agents") {
                const { columns, data } = prepareAgentsReportTableData();
                saveCSV("Agents Report", columns, data);
              } else if (activeReport === "tickets") {
                const { columns, data } = prepareTicketsReportTableData();
                saveCSV("Tickets Report", columns, data);
              } else {
                const { columns, data } = prepareOrganizationReportTableData();
                saveCSV("Organization Report", columns, data);
              }
            }}>Download CSV</Button>
        </Stack>
      )}

      {loading && (
        <Typography sx={{ color: NAVY, textAlign: "center", mt: 2 }}>Loading data...</Typography>
      )}

      {!loading && activeReport === "agents" && (
        <Box>
          <Typography variant="h6" sx={{ color: NAVY, mb: 2 }}>
            Agents Report for {adminData?.orgName || "Unknown Organization"}
          </Typography>
          <Typography sx={{ color: NAVY, mb: 1 }}>Total Agents: {agents.length}</Typography>
          <Typography sx={{ color: NAVY, mb: 1 }}>Total Departments: {departments.length}</Typography>
          {tickets.length === 0 && (
            <Typography sx={{ color: NAVY, textAlign: "center", mt: 2 }}>
              No tickets found for this organization.
            </Typography>
          )}
          {departments.map(dept => {
            const deptAgents = agents.filter(a => a.department === dept.name);
            if (!deptAgents.length) return null;
            return (
              <Box key={dept.name} sx={{ mb: 3 }}>
                <Typography sx={{ mb: 1, color: NAVY, fontWeight: 600 }}>
                  Department: {dept.name} ({deptAgents.length} agents)
                </Typography>
                <TableContainer component={Paper} sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)", mb: 1 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: NAVY }}>
                      <TableRow>
                        <TableCell sx={{ color: WHITE }} />
                        <TableCell sx={{ color: WHITE }}>Name</TableCell>
                        <TableCell sx={{ color: WHITE }}>Username</TableCell>
                        <TableCell sx={{ color: WHITE }}>Tickets Solved</TableCell>
                        <TableCell sx={{ color: WHITE }}>Performance (%)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deptAgents.map(agent => {
                        const stats = getAgentStats(agent.username);
                        const isExpanded = expandedAgent === agent.username;
                        const solvedTickets = getAgentTicketDetails(agent.username, "solved");
                        const assignedTickets = getAgentTicketDetails(agent.username, "assigned");
                        return (
                          <React.Fragment key={agent.username}>
                            <TableRow
                              sx={{ '&:hover': { bgcolor: '#f5f5f5', cursor: 'pointer' } }}
                              onClick={() => handleAgentExpandClick(agent.username)}
                            >
                              <TableCell>
                                <IconButton size="small">
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              </TableCell>
                              <TableCell>{agent.name || agent.username}</TableCell>
                              <TableCell>{agent.username}</TableCell>
                              <TableCell>{stats.ticketsSolved}</TableCell>
                              <TableCell>{stats.performance.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={5} sx={{ py: 0 }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                                    <Typography sx={{ color: NAVY, fontWeight: 600, mb: 1 }}>
                                      Agent Details
                                    </Typography>
                                    <Typography sx={{ color: NAVY, mb: 1 }}>
                                      Tickets Solved: {stats.ticketsSolved}
                                    </Typography>
                                    <Typography sx={{ color: NAVY, mb: 2 }}>
                                      Total Assigned Tickets: {stats.assignedTickets}
                                    </Typography>
                                    
                                    <Typography sx={{ color: NAVY, fontWeight: 600, mb: 1 }}>
                                      Solved Tickets
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ mb: 2 }}>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Ticket ID</TableCell>
                                            <TableCell>Department</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Created</TableCell>
                                            <TableCell>Resolved Time</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {solvedTickets.length > 0 ? (
                                            solvedTickets.map(ticket => (
                                              <TableRow key={ticket.id}>
                                                <TableCell>{ticket.id}</TableCell>
                                                <TableCell>{ticket.department}</TableCell>
                                                <TableCell>{ticket.status}</TableCell>
                                                <TableCell>{ticket.createdAt}</TableCell>
                                                <TableCell>{ticket.resolvedTime}</TableCell>
                                              </TableRow>
                                            ))
                                          ) : (
                                            <TableRow>
                                              <TableCell colSpan={5} sx={{ textAlign: 'center' }}>
                                                No solved tickets found
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>

                                    <Typography sx={{ color: NAVY, fontWeight: 600, mb: 1 }}>
                                      Assigned Tickets
                                    </Typography>
                                    <TableContainer component={Paper}>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Ticket ID</TableCell>
                                            <TableCell>Department</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Created</TableCell>
                                            <TableCell>Resolved Time</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {assignedTickets.length > 0 ? (
                                            assignedTickets.map(ticket => (
                                              <TableRow key={ticket.id}>
                                                <TableCell>{ticket.id}</TableCell>
                                                <TableCell>{ticket.department}</TableCell>
                                                <TableCell>{ticket.status}</TableCell>
                                                <TableCell>{ticket.createdAt}</TableCell>
                                                <TableCell>{ticket.resolvedTime}</TableCell>
                                              </TableRow>
                                            ))
                                          ) : (
                                            <TableRow>
                                              <TableCell colSpan={5} sx={{ textAlign: 'center' }}>
                                                No assigned tickets found
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            );
          })}
          {agents.length === 0 && (
            <Typography sx={{ color: NAVY, textAlign: "center", mt: 2 }}>
              No agents found for this organization.
            </Typography>
          )}
        </Box>
      )}

      {!loading && activeReport === "tickets" && (
        <Box>
          <Typography variant="h6" sx={{ color: NAVY, mb: 2 }}>
            Tickets Report for {adminData?.orgName || "Unknown Organization"}
          </Typography>
          <Typography sx={{ color: NAVY, mb: 1 }}>
            Total Tickets: {tickets?.length || 0}
          </Typography>
          <Typography sx={{ color: NAVY, mb: 1 }}>
            Tickets Solved: {(tickets?.filter(t => t.status?.toLowerCase() === "closed").length) || 0}
          </Typography>
          <Typography sx={{ color: NAVY, mb: 2 }}>
            Users Raised Tickets: {[...new Set((tickets || []).map(t => t.createdBy))].length}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                const { columns, data } = prepareTicketsReportTableData(true);
                savePDF("Selected_Tickets_Report", columns, data, "Tickets", adminData?.orgName, tickets.filter(t => selectedTickets.includes(t.id || t.ticketId || `ticket-${tickets.indexOf(t)}`)));
              }}
              disabled={selectedTickets.length === 0}
            >
              Download Selected Tickets PDF
            </Button>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              }
              label="Select All"
            />
          </Stack>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead sx={{ bgcolor: NAVY }}>
                <TableRow>
                  <TableCell sx={{ color: WHITE }}>
                    <Checkbox
                      checked={selectAll}
                      onChange={handleSelectAll}
                      indeterminate={selectedTickets.length > 0 && selectedTickets.length < tickets.length}
                    />
                  </TableCell>
                  <TableCell sx={{ color: WHITE }} />
                  <TableCell sx={{ color: WHITE }}>Ticket ID</TableCell>
                  <TableCell sx={{ color: WHITE }}>Department</TableCell>
                  <TableCell sx={{ color: WHITE }}>Raised By</TableCell>
                  <TableCell sx={{ color: WHITE }}>Status</TableCell>
                  <TableCell sx={{ color: WHITE }}>Assigned Agent</TableCell>
                  <TableCell sx={{ color: WHITE }}>Created</TableCell>
                  <TableCell sx={{ color: WHITE }}>Responded Time</TableCell>
                  <TableCell sx={{ color: WHITE }}>Resolved Time</TableCell>
                  <TableCell sx={{ color: WHITE }}>Priority</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets?.map((t, idx) => {
                  const ticketId = t.id || t.ticketId || `ticket-${idx}`;
                  const isExpanded = expandedTicket === ticketId;
                  const ticketDetails = getFullTicketDetails(ticketId);
                  const { priority } = formatPriority(t.priority);
                  return (
                    <React.Fragment key={ticketId}>
                      <TableRow
                        sx={{ '&:hover': { bgcolor: '#f5f5f5', cursor: 'pointer' } }}
                        onClick={() => handleTicketExpandClick(ticketId)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTickets.includes(ticketId)}
                            onChange={() => handleTicketSelect(ticketId)}
                            onClick={e => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{t.id || t.ticketId || "N/A"}</TableCell>
                        <TableCell>{t.department || "N/A"}</TableCell>
                        <TableCell>{t.createdBy || "N/A"}</TableCell>
                        <TableCell>{t.status || "N/A"}</TableCell>
                        <TableCell>{t.assignedAgent || "N/A"}</TableCell>
                        <TableCell>
                          {t.createdAt?.toDate
                            ? dayjs(t.createdAt.toDate()).format("YYYY-MM-DD HH:mm")
                            : (t.createdAt ? dayjs(t.createdAt).format("YYYY-MM-DD HH:mm") : "N/A")
                          }
                        </TableCell>
                        <TableCell>{formatResolvedTime(t.respondedTime)}</TableCell>
                        <TableCell>{formatResolvedTime(t.resolvedTime)}</TableCell>
                        <TableCell>{priority}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={11} sx={{ py: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                              <Typography sx={{ color: NAVY, fontWeight: 600, mb: 1 }}>
                                Ticket Details
                              </Typography>
                              {ticketDetails ? (
                                <Box>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Ticket ID:</strong> {ticketDetails.id}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Department:</strong> {ticketDetails.department}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Raised By:</strong> {ticketDetails.createdBy}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Status:</strong> {ticketDetails.status}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Assigned Agent:</strong> {ticketDetails.assignedAgent}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Created At:</strong> {ticketDetails.createdAt}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Assigned At:</strong> {ticketDetails.assignedAt}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Closed At:</strong> {ticketDetails.closedAt}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Responded Time:</strong> {ticketDetails.respondedTime}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Resolved Time:</strong> {ticketDetails.resolvedTime}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Description:</strong> {ticketDetails.description}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Priority:</strong> {ticketDetails.priority}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Priority Reason:</strong> {ticketDetails.reason}
                                  </Typography>
                                  <Typography sx={{ color: NAVY, mb: 0.5 }}>
                                    <strong>Category:</strong> {ticketDetails.category}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography sx={{ color: NAVY, textAlign: 'center' }}>
                                  No details available for this ticket.
                                </Typography>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {tickets?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} sx={{ textAlign: 'center' }}>
                      No tickets found for this organization.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {!loading && activeReport === "organization" && (
        <Box>
          <Typography variant="h6" sx={{ color: NAVY, mb: 2 }}>
            Organization Report: {adminData?.orgName || "Unknown Organization"}
          </Typography>
          <Typography sx={{ color: NAVY, mb: 1 }}>
            Users: {users.length}, Agents: {agents.length}, Departments: {departments.length}
          </Typography>
          <Typography sx={{ color: NAVY, mb: 1 }}>
            Total Services/Departments: {departments.map(d => d.name).join(", ") || "N/A"}
          </Typography>
          <Typography sx={{ color: NAVY, mb: 1 }}>
            Total Tickets: {tickets?.length || 0}
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: NAVY, fontWeight: 600, mb: 1 }}>
              Department-wise Summary
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ bgcolor: NAVY }}>
                  <TableRow>
                    <TableCell sx={{ color: WHITE }}>Department</TableCell>
                    <TableCell sx={{ color: WHITE }}>Total Agents</TableCell>
                    <TableCell sx={{ color: WHITE }}>Total Tickets</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.map(dept => (
                    <TableRow key={dept.name}>
                      <TableCell>{dept.name}</TableCell>
                      <TableCell>{agents.filter(a => a.department === dept.name).length}</TableCell>
                      <TableCell>{tickets?.filter(t => t.department === dept.name).length || 0}</TableCell>
                    </TableRow>
                  ))}
                  {departments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ textAlign: 'center' }}>
                        No departments found for this organization.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: NAVY, fontWeight: 600, mb: 1 }}>
              Tickets Summary
            </Typography>
            {(() => {
              const { weekly, monthly } = getWeeklyMonthlyTickets();
              return (
                <>
                  <Typography sx={{ color: NAVY, mb: 1 }}>
                    Weekly Tickets: {weekly.length}
                  </Typography>
                  <Typography sx={{ color: NAVY, mb: 2 }}>
                    Monthly Tickets: {monthly.length}
                  </Typography>
                </>
              );
            })()}
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: NAVY, fontWeight: 600, mb: 1 }}>
              Ticket Details
            </Typography>
            <FormControl sx={{ mb: 2, minWidth: 200 }}>
              <InputLabel>Filter by Month</InputLabel>
              <Select
                value={selectedMonth}
                onChange={handleMonthFilterChange}
                label="Filter by Month"
              >
                <MenuItem value="all">All</MenuItem>
                {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"
                ].map(month => (
                  <MenuItem key={month} value={month}>{month}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ bgcolor: NAVY }}>
                  <TableRow>
                    <TableCell sx={{ color: WHITE }}>Ticket ID</TableCell>
                    <TableCell sx={{ color: WHITE }}>Department</TableCell>
                    <TableCell sx={{ color: WHITE }}>Raised By</TableCell>
                    <TableCell sx={{ color: WHITE }}>Status</TableCell>
                    <TableCell sx={{ color: WHITE }}>Assigned Agent</TableCell>
                    <TableCell sx={{ color: WHITE }}>Created</TableCell>
                    <TableCell sx={{ color: WHITE }}>Responded Time</TableCell>
                    <TableCell sx={{ color: WHITE }}>Resolved Time</TableCell>
                    <TableCell sx={{ color: WHITE }}>Priority</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedMonth === "all" ? (
                    Object.entries(getMonthWiseTickets()).map(([month, monthTickets]) => (
                      monthTickets.length > 0 && (
                        <React.Fragment key={month}>
                          <TableRow>
                            <TableCell colSpan={9} sx={{ bgcolor: '#e0e0e0', fontWeight: 600 }}>
                              {month} {dayjs().year()}
                            </TableCell>
                          </TableRow>
                          {monthTickets.map((t, idx) => {
                            const ticketId = t.id || t.ticketId || `ticket-${idx}`;
                            const { priority } = formatPriority(t.priority);
                            return (
                              <TableRow key={ticketId}>
                                <TableCell>{t.id || t.ticketId || "N/A"}</TableCell>
                                <TableCell>{t.department || "N/A"}</TableCell>
                                <TableCell>{t.createdBy || "N/A"}</TableCell>
                                <TableCell>{t.status || "N/A"}</TableCell>
                                <TableCell>{t.assignedAgent || "N/A"}</TableCell>
                                <TableCell>
                                  {t.createdAt?.toDate
                                    ? dayjs(t.createdAt.toDate()).format("YYYY-MM-DD HH:mm")
                                    : (t.createdAt ? dayjs(t.createdAt).format("YYYY-MM-DD HH:mm") : "N/A")
                                  }
                                </TableCell>
                                <TableCell>{formatResolvedTime(t.respondedTime)}</TableCell>
                                <TableCell>{formatResolvedTime(t.resolvedTime)}</TableCell>
                                <TableCell>{priority}</TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      )
                    ))
                  ) : (
                    getFilteredTickets().map((t, idx) => {
                      const ticketId = t.id || t.ticketId || `ticket-${idx}`;
                      const { priority } = formatPriority(t.priority);
                      return (
                        <TableRow key={ticketId}>
                          <TableCell>{t.id || t.ticketId || "N/A"}</TableCell>
                          <TableCell>{t.department || "N/A"}</TableCell>
                          <TableCell>{t.createdBy || "N/A"}</TableCell>
                          <TableCell>{t.status || "N/A"}</TableCell>
                          <TableCell>{t.assignedAgent || "N/A"}</TableCell>
                          <TableCell>
                            {t.createdAt?.toDate
                              ? dayjs(t.createdAt.toDate()).format("YYYY-MM-DD HH:mm")
                              : (t.createdAt ? dayjs(t.createdAt).format("YYYY-MM-DD HH:mm") : "N/A")
                            }
                          </TableCell>
                          <TableCell>{formatResolvedTime(t.respondedTime)}</TableCell>
                          <TableCell>{formatResolvedTime(t.resolvedTime)}</TableCell>
                          <TableCell>{priority}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  {getFilteredTickets().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: 'center' }}>
                        No tickets found for {selectedMonth === "all" ? "this year" : selectedMonth}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Reports;