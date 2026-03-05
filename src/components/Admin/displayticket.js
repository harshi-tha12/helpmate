import React, { useMemo, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Table,
  TableContainer,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import SearchIcon from "@mui/icons-material/Search";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.js";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import TicketDetails from "./ticketdetails.js"; // Import TicketDetails

// Priority color mapping
const priorityColorMap = {
  high: { bg: "#ffebee", color: "#d32f2f" },
  medium: { bg: "#fff8e1", color: "#ff9800" },
  low: { bg: "#e8f5e9", color: "#388e3c" },
  default: { bg: "#e0eafd", color: "#153570" },
};

const DisplayTickets = ({
  search,
  sortOrders,
  setSortOrders,
  statusMapping,
  navigate,
  NAVY,
  WHITE,
  LIGHT_GREY,
  SELECT_BG,
  agentList,
  organization,
}) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePanel, setActivePanel] = useState("assign");
  const [selectedTicketId, setSelectedTicketId] = useState(null); // State to control TicketDetails modal
  const [internalSearch, setInternalSearch] = useState(search || "");
  const [sortOrderPending, setSortOrderPending] = useState("desc");
  const [sortOrderAssigned, setSortOrderAssigned] = useState("desc");
  // Responsive breakpoints
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // <600px
  const isTablet = useMediaQuery(theme.breakpoints.down("md")); // <900px

  useEffect(() => {
    setInternalSearch(search || "");
  }, [search]);

  useEffect(() => {
    if (!organization) {
      setTickets([]);
      setLoading(false);
      setError("No organization specified.");
      return;
    }
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, "tickets"),
          where("organization", "==", organization)
        );
        const ticketsSnapshot = await getDocs(q);
        const ticketsData = ticketsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate()
            : new Date(),
          assignedAgent: doc.data().assignedAgent || "Unassigned",
          status: doc.data().status?.toLowerCase() || "open",
        }));
        setTickets(ticketsData);
        setLoading(false);
      } catch (err) {
        setError("Failed to load tickets. Please try again later.");
        setLoading(false);
      }
    };
    fetchTickets();
  }, [organization]);

  const getPriorityInfo = (priority) => {
    let pri = typeof priority === "object" && priority !== null
      ? priority.priority
      : priority;
    pri = (pri || "").toLowerCase();
    if (!(pri in priorityColorMap)) pri = "default";
    return {
      label: typeof priority === "object" && priority !== null
        ? priority.priority
        : priority || "N/A",
      ...priorityColorMap[pri]
    };
  };

  // SEARCH LOGIC FIXED: can search by ticketId or keyword (problem/type/id/createdBy/department)
  const filteredTickets = useMemo(
    () =>
      tickets.filter((t) => {
        const searchStr = internalSearch.toLowerCase();
        if (!searchStr) return true;
        // Search by ticketId (id)
        if (t.id && t.id.toLowerCase().includes(searchStr)) return true;
        // Search in other fields
        return ["createdBy", "problem", "type", "department"].some((f) =>
          t[f]?.toString().toLowerCase().includes(searchStr)
        );
      }),
    [tickets, internalSearch]
  );

  // Pending: status === "pending"
  const pendingTickets = useMemo(
    () => filteredTickets.filter((t) => t.status === "pending"),
    [filteredTickets]
  );

  // Assigned but not yet updated: status === "open" and assignedAgent is filled
  const assignedUnchangedTickets = useMemo(
    () =>
      filteredTickets.filter(
        (t) =>
          t.status === "open" &&
          t.assignedAgent &&
          t.assignedAgent !== "Unassigned"
      ),
    [filteredTickets]
  );

  // Grouped for status panel
  const groupedTickets = useMemo(() => {
    const nonPending = filteredTickets.filter(
      (t) => t.status !== "pending"
    );
    const groups = {};
    nonPending.forEach((t) => {
      const status = t.status;
      if (!groups[status]) groups[status] = [];
      groups[status].push(t);
    });
    return groups;
  }, [filteredTickets]);

  // SORT
  const sortTickets = (tickets, order) =>
    [...tickets].sort(
      (a, b) =>
        (order === "desc" ? -1 : 1) *
        (new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    );

  const handleTicketSortToggle = (status) =>
    setSortOrders((s) => ({
      ...s,
      [status]: s[status] === "asc" ? "desc" : "asc",
    }));

  const sortedPendingTickets = [...pendingTickets].sort(
    (a, b) =>
      (sortOrderPending === "desc" ? -1 : 1) *
      (new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
  );

  const sortedAssignedUnchangedTickets = [...assignedUnchangedTickets].sort(
    (a, b) =>
      (sortOrderAssigned === "desc" ? -1 : 1) *
      (new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
  );

  // Responsive Table Headings
  const tableHeadings = [
    { label: "Priority", show: true },
    { label: "Ticket ID", show: !isMobile },
    { label: "Created By", show: !isMobile },
    { label: "Problem", show: !isMobile },
    { label: "Type", show: !isMobile },
    { label: "Status", show: true },
    { label: "Created At", show: !isMobile },
    { label: "Agent Assigned", show: !isMobile },
    { label: "Actions", show: true },
  ];

  // Responsive TableRow
  const TicketTableRow = ({ ticket, index }) => {
    const priorityInfo = getPriorityInfo(ticket.priority);

    // Card for Mobile view
    if (isMobile) {
      return (
        <Card
          sx={{
            mb: 2,
            boxShadow: "0 1px 6px 0 #e3f2fd",
            borderRadius: 2,
            background: index % 2 === 0 ? LIGHT_GREY : WHITE,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Box
                sx={{
                  fontWeight: 700,
                  fontFamily: "Outfit",
                  color: priorityInfo.color,
                  bgcolor: priorityInfo.bg,
                  borderRadius: 2,
                  px: 2,
                  py: 0.5,
                  fontSize: "0.97rem",
                  minWidth: 64,
                  textAlign: "center",
                  textTransform: "capitalize",
                  mr: 2,
                }}
              >
                {priorityInfo.label || "N/A"}
              </Box>
              <Chip
                label={ticket.status ? ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1) : ""}
                color={
                  {
                    open: "warning",
                    resolved: "success",
                    pending: "primary",
                    "in progress": "info",
                    closed: "success",
                  }[ticket.status?.toLowerCase()] || "default"
                }
                size="small"
                sx={{ ml: "auto" }}
              />
            </Box>
            <Typography sx={{ color: NAVY, fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
              Ticket ID: <span style={{ fontWeight: 400 }}>{ticket.id}</span>
            </Typography>
            <Typography sx={{ color: NAVY, fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
              Created By: <span style={{ fontWeight: 400 }}>{ticket.createdBy}</span>
            </Typography>
            <Typography sx={{ color: NAVY, fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
              Problem: <span style={{ fontWeight: 400 }}>{ticket.problem}</span>
            </Typography>
            <Typography sx={{ color: NAVY, fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
              Type: <span style={{ fontWeight: 400 }}>{ticket.type}</span>
            </Typography>
            <Typography sx={{ color: NAVY, fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
              Created At: <span style={{ fontWeight: 400 }}>
                {ticket.createdAt
                  ? dayjs(
                    ticket.createdAt.toDate ? ticket.createdAt.toDate() : ticket.createdAt
                  ).format("MMM DD, YYYY")
                  : "N/A"}
              </span>
            </Typography>
            <Typography sx={{ color: NAVY, fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
              Agent Assigned: <span style={{ fontWeight: 400 }}>
                {ticket.assignedAgent !== "Unassigned" ? ticket.assignedAgent : "Unassigned"}
              </span>
            </Typography>
            <Button
              variant="outlined"
              size="small"
              sx={{
                mt: 1,
                color: NAVY,
                borderColor: NAVY,
                "&:hover": { background: SELECT_BG, color: WHITE, borderColor: WHITE },
              }}
              onClick={() => setSelectedTicketId(ticket.id)} // Open modal instead of navigating
              fullWidth
            >
              View Details
            </Button>
          </CardContent>
        </Card>
      );
    }

    // TableRow for Desktop/Tablet
    return (
      <TableRow sx={{ backgroundColor: index % 2 === 0 ? LIGHT_GREY : WHITE }}>
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
              fontSize: "0.97rem",
              display: "inline-block",
              minWidth: 64,
              textAlign: "center",
              textTransform: "capitalize",
            }}
          >
            {priorityInfo.label || "N/A"}
          </Box>
        </TableCell>
        {!isMobile && <TableCell sx={{ color: NAVY }}>{ticket.id}</TableCell>}
        {!isMobile && <TableCell sx={{ color: NAVY }}>{ticket.createdBy}</TableCell>}
        {!isMobile && <TableCell sx={{ color: NAVY }}>{ticket.problem}</TableCell>}
        {!isMobile && <TableCell sx={{ color: NAVY }}>{ticket.type}</TableCell>}
        <TableCell>
          <Chip
            label={ticket.status ? ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1) : ""}
            color={
              {
                open: "warning",
                resolved: "success",
                pending: "primary",
                "in progress": "info",
                closed: "success",
              }[ticket.status?.toLowerCase()] || "default"
            }
            size="small"
          />
        </TableCell>
        {!isMobile && (
          <TableCell sx={{ color: NAVY }}>
            {ticket.createdAt
              ? dayjs(
                ticket.createdAt.toDate ? ticket.createdAt.toDate() : ticket.createdAt
              ).format("MMM DD, YYYY")
              : "N/A"}
          </TableCell>
        )}
        {!isMobile && (
          <TableCell sx={{ color: NAVY }}>
            {ticket.assignedAgent !== "Unassigned" ? ticket.assignedAgent : "Unassigned"}
          </TableCell>
        )}
        <TableCell>
          <Button
            variant="outlined"
            size="small"
            sx={{
              color: NAVY,
              borderColor: NAVY,
              "&:hover": { background: SELECT_BG, color: WHITE, borderColor: WHITE },
            }}
            onClick={() => setSelectedTicketId(ticket.id)} // Open modal instead of navigating
          >
            View Details
          </Button>
        </TableCell>
      </TableRow>
    );
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
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={2}
        mb={3}
        sx={{
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" }
        }}
      >
        <Button
          variant={activePanel === "assign" ? "contained" : "outlined"}
          sx={{
            color: activePanel === "assign" ? WHITE : NAVY,
            bgcolor: activePanel === "assign" ? NAVY : WHITE,
            border: `1px solid ${NAVY}`,
            fontWeight: 700,
            "&:hover": { bgcolor: SELECT_BG, color: WHITE }
          }}
          onClick={() => setActivePanel("assign")}
          fullWidth={isMobile}
        >
          Assign Ticket
        </Button>
        <Button
          variant={activePanel === "status" ? "contained" : "outlined"}
          sx={{
            color: activePanel === "status" ? WHITE : NAVY,
            bgcolor: activePanel === "status" ? NAVY : WHITE,
            border: `1px solid ${NAVY}`,
            fontWeight: 700,
            "&:hover": { bgcolor: SELECT_BG, color: WHITE }
          }}
          onClick={() => setActivePanel("status")}
          fullWidth={isMobile}
        >
          Ticket Status
        </Button>
      </Stack>
      {/* SEARCH BAR FIX */}
      <Box sx={{ mb: 3, maxWidth: isMobile ? "100%" : 400 }}>
        <TextField
          label="Search Tickets"
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            "& .MuiInputBase-input": { color: NAVY, fontSize: "1.1rem" },
            "& .MuiInputLabel-root": { color: NAVY, fontSize: "1.1rem" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: NAVY },
              "&:hover fieldset": { borderColor: SELECT_BG },
              "&.Mui-focused fieldset": { borderColor: SELECT_BG },
            },
          }}
          value={internalSearch}
          onChange={(e) => setInternalSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: NAVY }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {activePanel === "assign" && (
        <Box>
          {/* Pending Tickets */}
          {pendingTickets.length > 0 && (
            <Box>
              {isMobile ? (
                sortedPendingTickets.map((ticket, i) => (
                  <TicketTableRow key={ticket.id} ticket={ticket} index={i} />
                ))
              ) : (
                <Card sx={{ mb: 3, boxShadow: "0 2px 8px 0 #e3f2fd", borderRadius: 3 }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color: NAVY,
                          fontSize: "1.25rem",
                        }}
                      >
                        Pending Tickets ({pendingTickets.length})
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setSortOrderPending(sortOrderPending === "asc" ? "desc" : "asc")}
                        startIcon={<SortIcon sx={{ color: NAVY }} />}
                        sx={{
                          color: NAVY,
                          fontWeight: 700,
                          border: `1px solid ${NAVY}`,
                          bgcolor: WHITE,
                          "&:hover": { bgcolor: SELECT_BG, color: WHITE },
                        }}
                      >
                        Sort by Date ({sortOrderPending === "asc" ? "Asc" : "Desc"})
                      </Button>
                    </Box>
                    <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
                      <Table size="small" aria-label="pending tickets table">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: SELECT_BG }}>
                            {tableHeadings.map(
                              (th, idx) =>
                                th.show && (
                                  <TableCell key={idx} sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>
                                    {th.label}
                                  </TableCell>
                                )
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedPendingTickets.map((ticket, i) => (
                            <TicketTableRow key={ticket.id} ticket={ticket} index={i} />
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* Assigned tickets, status still open */}
          {assignedUnchangedTickets.length > 0 && (
            <Box>
              {isMobile ? (
                sortedAssignedUnchangedTickets.map((ticket, i) => (
                  <TicketTableRow key={ticket.id} ticket={ticket} index={i} />
                ))
              ) : (
                <Card sx={{ mb: 3, boxShadow: "0 2px 8px 0 #e3f2fd", borderRadius: 3 }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color: NAVY,
                          fontSize: "1.25rem",
                        }}
                      >
                        Assigned Tickets (Not Yet Updated) ({assignedUnchangedTickets.length})
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setSortOrderAssigned(sortOrderAssigned === "asc" ? "desc" : "asc")}
                        startIcon={<SortIcon sx={{ color: NAVY }} />}
                        sx={{
                          color: NAVY,
                          fontWeight: 700,
                          border: `1px solid ${NAVY}`,
                          bgcolor: WHITE,
                          "&:hover": { bgcolor: SELECT_BG, color: WHITE },
                        }}
                      >
                        Sort by Date ({sortOrderAssigned === "asc" ? "Asc" : "Desc"})
                      </Button>
                    </Box>
                    <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
                      <Table size="small" aria-label="assigned tickets table">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: SELECT_BG }}>
                            {tableHeadings.map(
                              (th, idx) =>
                                th.show && (
                                  <TableCell key={idx} sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>
                                    {th.label}
                                  </TableCell>
                                )
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedAssignedUnchangedTickets.map((ticket, i) => (
                            <TicketTableRow key={ticket.id} ticket={ticket} index={i} />
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {pendingTickets.length === 0 && assignedUnchangedTickets.length === 0 && (
            <Typography sx={{ color: NAVY, fontSize: "1.1rem" }}>
              No pending or assigned (not updated) tickets found.
            </Typography>
          )}
        </Box>
      )}

      {activePanel === "status" && (
        <Box>
          {Object.entries(groupedTickets)
            .filter(([status, ticketsByStatus]) => ticketsByStatus.length > 0)
            .map(([status, ticketsByStatus]) => {
              const sortOrder = sortOrders[status] || "desc";
              const sortedTickets = sortTickets(ticketsByStatus, sortOrder);
              return (
                <Box key={status}>
                  {isMobile ? (
                    sortedTickets.map((ticket, i) => (
                      <TicketTableRow key={ticket.id} ticket={ticket} index={i} />
                    ))
                  ) : (
                    <Card
                      sx={{ mb: 3, boxShadow: "0 2px 8px 0 #e3f2fd", borderRadius: 3 }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              textTransform: "capitalize",
                              fontWeight: "bold",
                              color: NAVY,
                              fontSize: "1.25rem",
                            }}
                          >
                            {status} Tickets ({ticketsByStatus.length})
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => handleTicketSortToggle(status)}
                            startIcon={<SortIcon sx={{ color: NAVY }} />}
                            sx={{
                              color: NAVY,
                              fontWeight: 700,
                              border: `1px solid ${NAVY}`,
                              bgcolor: WHITE,
                              "&:hover": { bgcolor: SELECT_BG, color: WHITE },
                            }}
                          >
                            Sort by Date ({sortOrder === "asc" ? "Asc" : "Desc"})
                          </Button>
                        </Box>
                        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
                          <Table size="small" aria-label={`${status} tickets table`}>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: SELECT_BG }}>
                                {tableHeadings.map(
                                  (th, idx) =>
                                    th.show && (
                                      <TableCell key={idx} sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>
                                        {th.label}
                                      </TableCell>
                                    )
                                )}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {sortedTickets.map((ticket, i) => (
                                <TicketTableRow key={ticket.id} ticket={ticket} index={i} />
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              );
            })}
          {Object.keys(groupedTickets).filter((k) => groupedTickets[k].length > 0).length === 0 && (
            <Typography sx={{ color: NAVY, fontSize: "1.1rem" }}>
              No tickets found for any status.
            </Typography>
          )}
        </Box>
      )}

      {/* Render TicketDetails as a modal */}
      {selectedTicketId && (
        <TicketDetails
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          organization={organization} // Pass organization if needed
          navigate={navigate}
        />
      )}
    </Box>
  );
};

DisplayTickets.propTypes = {
  search: PropTypes.string.isRequired,
  sortOrders: PropTypes.object.isRequired,
  setSortOrders: PropTypes.func.isRequired,
  statusMapping: PropTypes.object,
  navigate: PropTypes.func.isRequired,
  NAVY: PropTypes.string.isRequired,
  WHITE: PropTypes.string.isRequired,
  LIGHT_GREY: PropTypes.string.isRequired,
  SELECT_BG: PropTypes.string.isRequired,
  agentList: PropTypes.array,
  organization: PropTypes.string.isRequired,
};

export default DisplayTickets;