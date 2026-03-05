import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress, Chip, Card, CardContent } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useTheme, useMediaQuery } from "@mui/material";

const COLORS = ["#1976D2", "#FF6D00", "#388E3C", "#F50057", "#7C4DFF", "#0288D1", "#C2185B", "#689F38"];

const UserGraph = ({ username }) => {
  const [ticketData, setTicketData] = useState({
    totalTickets: 0,
    ticketsByMonth: [],
    ticketsByDepartment: [],
  });
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!username) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, "tickets"), where("createdBy", "==", username));
        const snapshot = await getDocs(q);
        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Total tickets
        const totalTickets = tickets.length;

        // Tickets by month (for 2025)
        const monthMap = Array.from({ length: 12 }, (_, i) => ({
          name: new Date(2025, i).toLocaleString("default", { month: "short" }),
          tickets: 0,
        }));
        tickets.forEach(ticket => {
          if (ticket.createdAt?.seconds) {
            const date = new Date(ticket.createdAt.seconds * 1000);
            if (date.getFullYear() === 2025) {
              const monthIndex = date.getMonth();
              monthMap[monthIndex].tickets += 1;
            }
          }
        });

        // Tickets by department
        const departmentMap = {};
        tickets.forEach(ticket => {
          const dept = ticket.department || "Unassigned";
          departmentMap[dept] = (departmentMap[dept] || 0) + 1;
        });
        const ticketsByDepartment = Object.entries(departmentMap).map(([name, value]) => ({
          name,
          value,
        }));

        setTicketData({
          totalTickets,
          ticketsByMonth: monthMap,
          ticketsByDepartment,
        });
      } catch (error) {
        console.error("Error fetching ticket data:", error);
        setTicketData({
          totalTickets: 0,
          ticketsByMonth: [],
          ticketsByDepartment: [],
        });
      }
      setLoading(false);
    };
    fetchTicketData();
  }, [username]);

  const chartStyles = {
    fontFamily: "'Inter', sans-serif",
    fontSize: { xs: "0.75rem", sm: "0.85rem" },
    color: "#444",
  };

  return (
    <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1200 }, mx: "auto" }}>
      {loading ? (
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <CircularProgress size={32} color="primary" />
        </Box>
      ) : (
        <Box>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              color: "#123499",
              fontFamily: "'Inter', sans-serif",
              fontSize: { xs: "1rem", sm: "1.2rem" },
              fontWeight: 600,
            }}
          >
            Your Ticket Overview
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: { xs: "0.9rem", sm: "1rem" },
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: "#123499",
              }}
            >
              Total Tickets Raised: <Chip label={ticketData.totalTickets} color="primary" sx={{ fontWeight: 600, fontSize: { xs: "0.8rem", sm: "0.9rem" } }} />
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
            {ticketData.ticketsByDepartment.length > 0 && (
              <Card
                sx={{
                  borderRadius: 4,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  background: "linear-gradient(180deg, #f7faff 0%, #ffffff 100%)",
                  p: { xs: 2, sm: 3 },
                  mb: { xs: 3, md: 0 },
                  flex: { md: 1 },
                  "&:hover": {
                    transform: "scale(1.01)",
                    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <CardContent>
                  <Typography
                    sx={{
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      color: "#123499",
                      mb: 2,
                    }}
                  >
                    Tickets by Department
                  </Typography>
                  <ResponsiveContainer width="100%" height={isSmallScreen ? 200 : 250}>
                    <PieChart>
                      <Pie
                        data={ticketData.ticketsByDepartment}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isSmallScreen ? 60 : 80}
                        fill="#1976D2"
                        label
                      >
                        {ticketData.ticketsByDepartment.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          ...chartStyles,
                          backgroundColor: "#fff",
                          border: "1px solid #dde3ee",
                          borderRadius: 4,
                        }}
                      />
                      <Legend wrapperStyle={chartStyles} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {ticketData.ticketsByMonth.length > 0 && (
              <Card
                sx={{
                  borderRadius: 4,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  background: "linear-gradient(180deg, #f7faff 0%, #ffffff 100%)",
                  p: { xs: 2, sm: 3 },
                  mb: { xs: 3, md: 0 },
                  flex: { md: 1 },
                  "&:hover": {
                    transform: "scale(1.01)",
                    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <CardContent>
                  <Typography
                    sx={{
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      color: "#123499",
                      mb: 2,
                    }}
                  >
                    Tickets Raised by Month (2025)
                  </Typography>
                  <ResponsiveContainer width="100%" height={isSmallScreen ? 200 : 300}>
                    <BarChart data={ticketData.ticketsByMonth}>
                      <XAxis dataKey="name" stroke="#444" style={chartStyles} />
                      <YAxis stroke="#444" style={chartStyles} />
                      <Tooltip
                        contentStyle={{
                          ...chartStyles,
                          backgroundColor: "#fff",
                          border: "1px solid #dde3ee",
                          borderRadius: 4,
                        }}
                      />
                      <Bar dataKey="tickets" fill="#1976D2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </Box>

          {ticketData.totalTickets === 0 && (
            <Typography
              color="text.secondary"
              sx={{
                textAlign: "center",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                fontFamily: "'Inter', sans-serif",
              }}
            >
              No tickets found. Create a ticket to see your stats!
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default UserGraph;