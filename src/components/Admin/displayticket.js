import React, { useMemo } from "react";
import {
  Box, Typography, Card, CardContent, TextField, InputAdornment, Table, TableContainer, TableCell, TableBody, TableHead, TableRow,
  Paper, Button, Chip
} from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import SearchIcon from "@mui/icons-material/Search";
import dayjs from "dayjs";

const DisplayTickets = ({
  tickets,
  search,
  sortOrders,
  setSortOrders,
  statusMapping,
  navigate,
  NAVY,
  WHITE,
  LIGHT_GREY,
  SELECT_BG
}) => {
  const filteredTickets = useMemo(
    () =>
      tickets.filter(t =>
        ["id", "createdBy", "problem", "type", "department"].some(f =>
          t[f].toLowerCase().includes(search.toLowerCase())
        )
      ),
    [tickets, search]
  );
  const groupedTickets = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(statusMapping).map(([k, v]) => [
          k,
          filteredTickets.filter(t => t.status.toLowerCase() === v)
        ])
      ),
    [filteredTickets, statusMapping]
  );
  const sortTickets = (tickets, order) =>
    [...tickets].sort(
      (a, b) =>
        (order === "desc" ? -1 : 1) *
        (new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    );
  const handleTicketSortToggle = status =>
    setSortOrders(s => ({
      ...s,
      [status]: s[status] === "asc" ? "desc" : "asc"
    }));

  const TicketTableRow = ({ ticket, index }) => (
    <TableRow sx={{ backgroundColor: index % 2 === 0 ? LIGHT_GREY : WHITE }}>
      <TableCell sx={{ color: NAVY }}>{ticket.id}</TableCell>
      <TableCell sx={{ color: NAVY }}>{ticket.createdBy}</TableCell>
      <TableCell sx={{ color: NAVY }}>{ticket.problem}</TableCell>
      <TableCell sx={{ color: NAVY }}>{ticket.type}</TableCell>
      <TableCell>
        <Chip
          label={
            ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)
          }
          color={
            {
              open: "warning",
              resolved: "success",
              pending: "primary",
              "in progress": "info"
            }[ticket.status.toLowerCase()] || "default"
          }
          size="small"
        />
      </TableCell>
      <TableCell sx={{ color: NAVY }}>
        {ticket.createdAt
          ? dayjs(
            ticket.createdAt.toDate ? ticket.createdAt.toDate() : ticket.createdAt
          ).format("MMM DD, YYYY")
          : "N/A"}
      </TableCell>
      <TableCell>
        <Chip
          label={
            ticket.agentId?.toLowerCase() !== "unassigned"
              ? "Assigned"
              : "Unassigned"
          }
          color={
            ticket.agentId?.toLowerCase() !== "unassigned" ? "primary" : "default"
          }
          size="small"
        />
      </TableCell>
      <TableCell>
        <Button
          variant="outlined"
          size="small"
          sx={{
            color: NAVY,
            borderColor: NAVY,
            "&:hover": { background: SELECT_BG, color: WHITE, borderColor: WHITE }
          }}
          onClick={() => navigate('/ticketdetails', { state: { ticketId: ticket.id } })}
        >
          View Details
        </Button>
      </TableCell>
    </TableRow>
  );

  return (
    <Box>
      <Typography variant="h5" mb={2} sx={{ color: NAVY, fontSize: "2rem" }}>
        Tickets
      </Typography>
      <TextField
        label="Search Tickets"
        variant="outlined"
        size="small"
        fullWidth
        sx={{
          mb: 3,
          maxWidth: 400,
          "& .MuiInputBase-input": { color: NAVY, fontSize: "1.1rem" },
          "& .MuiInputLabel-root": { color: NAVY, fontSize: "1.1rem" },
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: NAVY },
            "&:hover fieldset": { borderColor: SELECT_BG },
            "&.Mui-focused fieldset": { borderColor: SELECT_BG }
          }
        }}
        value={search}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: NAVY }} />
            </InputAdornment>
          )
        }}
        disabled
      />
      {Object.entries(groupedTickets).map(([status, ticketsByStatus]) => {
        const sortOrder = sortOrders[status] || "desc";
        const sortedTickets = sortTickets(ticketsByStatus, sortOrder);
        return (
          <Card key={status} sx={{ mb: 3, boxShadow: "0 2px 8px 0 #e3f2fd", borderRadius: 3 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1
                }}
              >
                <Typography variant="h6" sx={{ textTransform: "capitalize", fontWeight: "bold", color: NAVY, fontSize: "1.25rem" }}>
                  {status} Tickets ({ticketsByStatus.length})
                </Typography>
                <Button
                  size="small"
                  onClick={() => handleTicketSortToggle(status)}
                  startIcon={<SortIcon sx={{ color: NAVY }} />}
                  sx={{ color: NAVY, fontWeight: 700, border: `1px solid ${NAVY}`, bgcolor: WHITE, "&:hover": { bgcolor: SELECT_BG, color: WHITE } }}
                >
                  Sort by Date ({sortOrder === "asc" ? "Asc" : "Desc"})
                </Button>
              </Box>
              {ticketsByStatus.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ color: NAVY, fontSize: "1.1rem" }}>
                  No tickets in this category.
                </Typography>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small" aria-label={`${status} tickets table`}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: SELECT_BG }}>
                        <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>Ticket ID</TableCell>
                        <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>Created By</TableCell>
                        <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>Problem</TableCell>
                        <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>Type</TableCell>
                        <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>Status</TableCell>
                        <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>Created At</TableCell>
                        <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>Agent Assigned</TableCell>
                        <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.05rem" }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedTickets.map((ticket, i) => (
                        <TicketTableRow key={ticket.id} ticket={ticket} index={i} />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default DisplayTickets;