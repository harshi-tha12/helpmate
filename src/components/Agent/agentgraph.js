import React, { useState, useEffect } from "react";
import { Box, Typography, Card, Grid, useTheme, useMediaQuery } from "@mui/material";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.js";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import dayjs from "dayjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const parseDate = (val) => {
  if (!val) return null;
  if (val.toDate) return dayjs(val.toDate()); // Firestore Timestamp
  let parsed = dayjs(val);
  return parsed.isValid() ? parsed : null;
};

const AgentGraph = ({ username, orgName, department }) => {
  const [ticketData, setTicketData] = useState({
    solvedCount: 0,
    assignedCount: 0,
    solvedByMonth: Array(12).fill(0),
    assignedByMonth: Array(12).fill(0)
  });
  const [loading, setLoading] = useState(true);
  

  // Responsive helpers
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      if (!username || !orgName) {
        setTicketData({
          solvedCount: 0,
          assignedCount: 0,
          solvedByMonth: Array(12).fill(0),
          assignedByMonth: Array(12).fill(0)
        });
        setLoading(false);
        return;
      }

      try {
        const ticketsQuery = query(
          collection(db, "tickets"),
          where("assignedAgent", "==", username),
          where("organization", "==", orgName)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);

        let solvedCount = 0, assignedCount = 0;
        const solvedByMonth = Array(12).fill(0);
        const assignedByMonth = Array(12).fill(0);

        ticketsSnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = parseDate(data.createdAt);
          const closedTime = parseDate(data.closedTime);

          if (!createdAt) return;

          const month = createdAt.month();

          assignedCount++;
          assignedByMonth[month]++;

          if (data.status && data.status.toLowerCase().trim() === "closed") {
            solvedCount++;
            // If closedTime exists, count in that month, else fallback to createdAt month
            const solvedMonth = closedTime ? closedTime.month() : month;
            solvedByMonth[solvedMonth]++;
          }
        });

        setTicketData({
          solvedCount,
          assignedCount,
          solvedByMonth,
          assignedByMonth
        });
      } catch (err) {
        console.error("Error fetching tickets:", err);
        setTicketData({
          solvedCount: 0,
          assignedCount: 0,
          solvedByMonth: Array(12).fill(0),
          assignedByMonth: Array(12).fill(0)
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [username, orgName]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
    },
    scales: {
      x: { title: { display: true, text: "Month" } },
      y: { beginAtZero: true, stepSize: 1 }
    }
  };

  const solvedChartData = {
    labels: months,
    datasets: [
      {
        label: "Solved Tickets",
        data: ticketData.solvedByMonth,
        backgroundColor: "#0088FE",
        borderRadius: 10
      }
    ]
  };

  const assignedChartData = {
    labels: months,
    datasets: [
      {
        label: "Assigned Tickets",
        data: ticketData.assignedByMonth,
        backgroundColor: "#FF8042",
        borderRadius: 10
      }
    ]
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2 },
        maxWidth: 1200,
        mx: "auto"
      }}
    >
      {/* Welcome Card */}
      <Card
        elevation={8}
        sx={{
          mb: 4,
          background: "linear-gradient(110deg, #f8fafb 60%, #e2f0fb 100%)",
          borderRadius: 4,
          boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
          px: { xs: 2, sm: 5 },
          py: { xs: 3, sm: 4 },
          textAlign: "center",
          border: "1.5px solid #b6e0ff",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontFamily: "'PT Serif', serif",
            fontWeight: "bold",
            color: "#0A2472",
            mb: 1.5,
            letterSpacing: 1,
            textShadow: "1px 1px 6px #e9f5fb",
          }}
        >
          Welcome,
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontFamily: "'PT Serif', serif",
            fontWeight: "bold",
            color: "#0077B6",
            mb: 1,
            letterSpacing: 1.5,
            textShadow: "2px 2px 8px #cce6fa",
            wordBreak: "break-all"
          }}
        >
          {username || "Agent"}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontFamily: "'PT Serif', serif",
            color: "#FF8042",
            mb: 0.5,
            fontWeight: 500,
            textShadow: "1px 1px 6px #fff1e6",
            wordBreak: "break-all"
          }}
        >
          {orgName}
        </Typography>
        {department && (
          <Typography
            variant="body1"
            sx={{
              fontFamily: "'PT Serif', serif",
              color: "#0A2472",
              mb: 0.5,
              fontWeight: 500,
            }}
          >
            Department: {department}
          </Typography>
        )}
      </Card>

      {loading ? (
        <Typography align="center" sx={{ mt: 5, mb: 3 }}>Loading ticket statistics...</Typography>
      ) : (
        <Box>
          {/* Stats Card */}
          <Card
            elevation={7}
            sx={{
              mb: 4,
              width: "100%",
              maxWidth: 700,
              mx: "auto",
              borderRadius: 4,
              boxShadow: "0 2px 16px 0 rgba(0,0,0,0.11)",
              px: { xs: 3, sm: 6 },
              py: { xs: 3, sm: 4 },
              textAlign: "center",
              background: "linear-gradient(90deg, #f6f9fc 70%, #ffe5d3 100%)"
            }}
          >
            <Grid container spacing={isXs ? 2 : 6} alignItems="center" justifyContent="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" color="primary" sx={{ fontFamily: "'PT Serif', serif", fontWeight: 600 }}>
                  Total Tickets Solved
                </Typography>
                <Typography variant="h2" color="success.main" sx={{ fontWeight: "bold" }}>
                  {ticketData.solvedCount}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" color="warning.main" sx={{ fontFamily: "'PT Serif', serif", fontWeight: 600 }}>
                  Total Tickets Assigned
                </Typography>
                <Typography variant="h2" color="warning.main" sx={{ fontWeight: "bold" }}>
                  {ticketData.assignedCount}
                </Typography>
              </Grid>
            </Grid>
          </Card>

          {/* Graph Cards */}
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
            <Card
              elevation={6}
              sx={{
                mb: { xs: 4, md: 2 },
                width: "100%",
                maxWidth: { xs: 900, md: "100%" },
                mx: "auto",
                borderRadius: 4,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.09)",
                p: { xs: 2, sm: 4 },
                background: "linear-gradient(90deg, #e8f7fa 60%, #fdf6e3 100%)",
                flex: { md: 1 }
              }}
            >
              <Typography
                variant="h6"
                color="primary"
                sx={{
                  mb: 2,
                  fontFamily: "'PT Serif', serif",
                  fontWeight: 600,
                  textAlign: "center"
                }}
              >
                Tickets Solved by Month
              </Typography>
              <Box sx={{ height: { xs: 250, sm: 350 }, width: "100%" }}>
                <Bar data={solvedChartData} options={chartOptions} />
              </Box>
            </Card>

            <Card
              elevation={6}
              sx={{
                mb: 2,
                width: "100%",
                maxWidth: { xs: 900, md: "100%" },
                mx: "auto",
                borderRadius: 4,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.09)",
                p: { xs: 2, sm: 4 },
                background: "linear-gradient(90deg, #fff6e5 30%, #e5f5ff 100%)",
                flex: { md: 1 }
              }}
            >
              <Typography
                variant="h6"
                color="warning.main"
                sx={{
                  mb: 2,
                  fontFamily: "'PT Serif', serif",
                  fontWeight: 600,
                  textAlign: "center"
                }}
              >
                Tickets Assigned by Month
              </Typography>
              <Box sx={{ height: { xs: 250, sm: 350 }, width: "100%" }}>
                <Bar data={assignedChartData} options={chartOptions} />
              </Box>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AgentGraph;