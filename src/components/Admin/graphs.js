import React, { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Box, Typography, Card, CardContent, Grid } from "@mui/material";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import dayjs from "dayjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const colorPalette = [
  "#1A2A6C", "#FDCB1D", "#FF6384", "#36A2EB", "#FFCE56",
  "#4BC0C0", "#9966FF", "#FF8C42", "#3B6BFF", "#6BFFB3", "#FF6B97"
];
const borderColorPalette = colorPalette.map(c => c);

const Admingraph = ({ orgName }) => {
  const [ticketsData, setTicketsData] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [setDepartmentIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Fetch Users and Agents filtered by orgName
        const usersSnapshot = await getDocs(collection(db, "Users"));
        const filteredUsers = usersSnapshot.docs
          .map(doc => ({
            role: doc.data().role || "user",
            orgName: doc.data().orgName || "Not Assigned",
          }))
          .filter(u => (u.orgName || "").toLowerCase() === orgName.toLowerCase());

        setUserCount(filteredUsers.filter(u => u.role === "user").length);
        setAgentCount(filteredUsers.filter(u => u.role === "agent").length);

        // Fetch departments from Departments collection filtered by orgName
        const departmentsQuery = query(
          collection(db, "Departments"),
          where("orgName", "==", orgName)
        );
        const departmentsSnapshot = await getDocs(departmentsQuery);
        const deptIds = departmentsSnapshot.docs.map(doc => doc.data().departmentId);
        setDepartmentCount(departmentsSnapshot.docs.length);
        setDepartmentIds(deptIds);

        // Fetch Tickets filtered by orgName (case insensitive)
        const ticketsSnapshot = await getDocs(collection(db, "tickets"));
        const allTickets = ticketsSnapshot.docs.map(doc => ({
          id: doc.id,
          createdBy: doc.data().createdBy || "Unknown",
          assignedAgent: doc.data().assignedAgent?.trim() || "Unassigned",
          status: doc.data().status || "open",
          department: doc.data().department || "N/A",
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
          resolvedAt: doc.data().resolvedAt?.toDate ? doc.data().resolvedAt.toDate() : null,
          orgName: (doc.data().orgName || doc.data().organization || "Not Assigned")
        })).filter(t =>
          (t.orgName || "").toLowerCase() === orgName.toLowerCase()
        );

        setTicketsData(allTickets);

      } catch (error) {
        console.error("Error in Admin Graph data:", error);
        setDepartmentCount(0);
        setDepartmentIds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [orgName]);

  // Tickets per user chart data
  const usersInOrg = [...new Set(ticketsData.map(t => t.createdBy))];
  const userTicketsData = {
    labels: usersInOrg,
    datasets: [{
      label: "Tickets Created",
      data: usersInOrg.map(user =>
        ticketsData.filter(t => t.createdBy === user).length
      ),
      backgroundColor: usersInOrg.map((_, i) => colorPalette[i % colorPalette.length]),
      borderColor: usersInOrg.map((_, i) => borderColorPalette[i % borderColorPalette.length]),
      borderWidth: 1,
    }]
  };

  // Tickets per agent chart data
  const agentsInOrg = [...new Set(ticketsData.filter(t => t.assignedAgent !== "Unassigned").map(t => t.assignedAgent))];
  const agentTicketsData = {
    labels: agentsInOrg,
    datasets: [{
      label: "Tickets Solved",
      data: agentsInOrg.map(agent =>
        ticketsData.filter(t =>
          t.assignedAgent === agent && t.status === "Closed"
        ).length
      ),
      backgroundColor: agentsInOrg.map((_, i) => colorPalette[(i + 1) % colorPalette.length]),
      borderColor: agentsInOrg.map((_, i) => borderColorPalette[(i + 1) % borderColorPalette.length]),
      borderWidth: 1,
    }]
  };

  // Weekly Tickets data
  const weekLabels = Array.from({ length: 7 }, (_, i) =>
    dayjs().subtract(6 - i, "week").format("YYYY-[W]WW")
  );
  const weeklyTicketsData = {
    labels: weekLabels,
    datasets: [{
      label: "Tickets Created per Week",
      data: weekLabels.map((week, idx) => {
        const start = dayjs().subtract(6 - idx, "week").startOf("week");
        const end = dayjs().subtract(6 - idx, "week").endOf("week");
        return ticketsData.filter(t =>
          dayjs(t.createdAt).isAfter(start) && dayjs(t.createdAt).isBefore(end)
        ).length;
      }),
      backgroundColor: "#36A2EB",
      borderColor: "#1A2A6C",
      borderWidth: 2,
      fill: true,
      tension: 0.3,
    }]
  };

  // Monthly Tickets data
  const monthLabels = Array.from({ length: 6 }, (_, i) =>
    dayjs().subtract(5 - i, "month").format("MMM YYYY")
  );
  const monthlyTicketsData = {
    labels: monthLabels,
    datasets: [{
      label: "Tickets Created per Month",
      data: monthLabels.map((month, idx) => {
        const start = dayjs().subtract(5 - idx, "month").startOf("month");
        const end = dayjs().subtract(5 - idx, "month").endOf("month");
        return ticketsData.filter(t =>
          dayjs(t.createdAt).isAfter(start) && dayjs(t.createdAt).isBefore(end)
        ).length;
      }),
      backgroundColor: "#FF6384",
      borderColor: "#28396A",
      borderWidth: 2,
      fill: true,
      tension: 0.3,
    }]
  };

  const cardStyle = {
    minWidth: 200,
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 12px rgba(26,42,108,0.07)",
    borderRadius: 3,
    textAlign: "center",
  };

  const chartContainerStyle = {
    backgroundColor: "#ffffff",
    p: 3,
    borderRadius: 2,
    boxShadow: "0 4px 12px rgba(26,42,108,0.07)",
    height: "400px",
    width: "100%",
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true },
    },
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f7fa", minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ color: "#1A2A6C", mb: 4, fontWeight: "bold" }}>
        Organization Report for {orgName}
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6" sx={{ color: "#1A2A6C", fontWeight: "medium" }}>
                Total Users
              </Typography>
              <Typography variant="h4" sx={{ color: "#28396A", fontWeight: "bold" }}>
                {userCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6" sx={{ color: "#1A2A6C", fontWeight: "medium" }}>
                Total Agents
              </Typography>
              <Typography variant="h4" sx={{ color: "#28396A", fontWeight: "bold" }}>
                {agentCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6" sx={{ color: "#1A2A6C", fontWeight: "medium" }}>
                Total Departments
              </Typography>
              <Typography variant="h4" sx={{ color: "#28396A", fontWeight: "bold" }}>
                {departmentCount}
              </Typography>
              
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CHARTS */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={12}>
          <Box sx={chartContainerStyle}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets Created by Users
            </Typography>
            <Bar data={userTicketsData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets Created by Users" } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={12}>
          <Box sx={chartContainerStyle}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets Solved by Agents
            </Typography>
            <Bar data={agentTicketsData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets Solved by Agents" } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={12}>
          <Box sx={chartContainerStyle}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets Created per Week
            </Typography>
            <Line data={weeklyTicketsData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets Created per Week" } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={12}>
          <Box sx={chartContainerStyle}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets Created per Month
            </Typography>
            <Line data={monthlyTicketsData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets Created per Month" } } }} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Admingraph;