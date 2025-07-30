import React, { useEffect, useState } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Box, Typography, Card, CardContent, Grid } from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import dayjs from "dayjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const Report = ({ orgName }) => {
  const [ticketsData, setTicketsData] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Users and Agents
        const usersSnapshot = await getDocs(collection(db, "Users"));
        const filteredUsers = usersSnapshot.docs
          .map(doc => ({
            role: doc.data().role || "user",
            orgName: doc.data().orgName || "Not Assigned",
          }))
          .filter(u => u.orgName.toLowerCase() === orgName.toLowerCase());

        setUserCount(filteredUsers.filter(u => u.role === "user").length);
        setAgentCount(filteredUsers.filter(u => u.role === "agent").length);

        // Fetch Departments from subcollection Organization/{orgName}/Departments/{deptId}
        const departmentsCollectionRef = collection(db, "Organization", orgName, "Departments");
        const departmentsSnapshot = await getDocs(departmentsCollectionRef);
        const deptArr = departmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            deptid: doc.id,
            name: data.name || doc.id,
            ...data,
          };
        });
        setDepartments(deptArr);

        // Fetch Tickets
        const ticketsSnapshot = await getDocs(collection(db, "tickets"));
        const allTickets = ticketsSnapshot.docs.map(doc => ({
          id: doc.id,
          createdBy: doc.data().createdBy || "Unknown",
          assignedAgent: doc.data().assignedAgent?.trim() || "Unassigned",
          status: doc.data().status || "open",
          department: doc.data().department || "N/A",
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          resolvedAt: doc.data().resolvedAt?.toDate() || null,
          orgName: doc.data().orgName || "Not Assigned",
        })).filter(t => t.orgName.toLowerCase() === orgName.toLowerCase());

        setTicketsData(allTickets);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orgName]);

  // Color palette for charts, extended for more items
  const colorPalette = [
    "#1A2A6C", "#FDCB1D", "#FF6384", "#36A2EB", "#FFCE56",
    "#4BC0C0", "#9966FF", "#FF8C42", "#3B6BFF", "#6BFFB3", "#FF6B97"
  ];
  const borderColorPalette = colorPalette.map(c => c);

  // Users
  const usersInOrg = [...new Set(
    ticketsData.filter(t => t.status !== "closed").map(t => t.createdBy)
  )];
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

  // Agents
  const agentsInOrg = [...new Set(
    ticketsData.filter(t => t.assignedAgent !== "Unassigned").map(t => t.assignedAgent)
  )];
  const agentTicketsData = {
    labels: agentsInOrg,
    datasets: [{
      label: "Tickets Solved",
      data: agentsInOrg.map(agent =>
        ticketsData.filter(t =>
          t.assignedAgent === agent && t.status === "closed"
        ).length
      ),
      backgroundColor: agentsInOrg.map((_, i) => colorPalette[(i + 1) % colorPalette.length]),
      borderColor: agentsInOrg.map((_, i) => borderColorPalette[(i + 1) % borderColorPalette.length]),
      borderWidth: 1,
    }]
  };

  // Department Pie
  const departmentLabels = departments.length > 0
    ? departments.map(dep => dep.name)
    : [...new Set(ticketsData.map(t => t.department))];
  const departmentWiseData = {
    labels: departmentLabels,
    datasets: [{
      label: "Tickets by Department",
      data: departmentLabels.map(depName => {
        // Try to match department by name or deptid
        const deptObj = departments.find(d => d.name === depName || d.deptid === depName);
        return ticketsData.filter(t =>
          t.department === depName ||
          (deptObj && (t.department === deptObj.deptid || t.department === deptObj.name))
        ).length;
      }),
      backgroundColor: departmentLabels.map((_, i) => colorPalette[i % colorPalette.length]),
      borderColor: departmentLabels.map((_, i) => borderColorPalette[i % borderColorPalette.length]),
      borderWidth: 1,
    }]
  };

  // Weekly Tickets (last 7 weeks)
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

  // Monthly Tickets (last 6 months)
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

  // Resolution Time Bar
  const resolutionTimeData = {
    labels: ticketsData.filter(t => t.status === "closed").map(t => t.id),
    datasets: [{
      label: "Resolution Time (hours)",
      data: ticketsData.filter(t => t.status === "closed").map(t => {
        if (!t.resolvedAt) return 0;
        const created = new Date(t.createdAt);
        const resolved = new Date(t.resolvedAt);
        return Math.round((resolved - created) / (1000 * 60 * 60));
      }),
      backgroundColor: "#4BC0C0",
      borderColor: "#4BC0C0",
      borderWidth: 1,
    }]
  };

  const cardStyle = {
    minWidth: 200,
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 12px rgba(26,42,108,0.07)",
    borderRadius: 3,
    textAlign: "center",
  };

  const options = {
    responsive: true,
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
                {departments.length}
              </Typography>
              <Typography sx={{ color: "#4BC0C0", fontWeight: "medium", fontSize: 14, mt: 1 }}>
                {departments.map(dep => dep.name).join(", ") || "No Departments"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ backgroundColor: "#ffffff", p: 2, borderRadius: 2, boxShadow: "0 4px 12px rgba(26,42,108,0.07)" }}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets Created by Users
            </Typography>
            <Bar data={userTicketsData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets Created by Users" } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ backgroundColor: "#ffffff", p: 2, borderRadius: 2, boxShadow: "0 4px 12px rgba(26,42,108,0.07)" }}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets Solved by Agents
            </Typography>
            <Bar data={agentTicketsData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets Solved by Agents" } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ backgroundColor: "#ffffff", p: 2, borderRadius: 2, boxShadow: "0 4px 12px rgba(26,42,108,0.07)" }}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets by Department
            </Typography>
            <Pie data={departmentWiseData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets by Department" } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ backgroundColor: "#ffffff", p: 2, borderRadius: 2, boxShadow: "0 4px 12px rgba(26,42,108,0.07)" }}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets Resolution Time
            </Typography>
            <Bar data={resolutionTimeData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets Resolution Time (hours)" } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ backgroundColor: "#ffffff", p: 2, borderRadius: 2, boxShadow: "0 4px 12px rgba(26,42,108,0.07)" }}>
            <Typography variant="h6" sx={{ color: "#1A2A6C", mb: 2, fontWeight: "medium" }}>
              Tickets Created per Week
            </Typography>
            <Line data={weeklyTicketsData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Tickets Created per Week" } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ backgroundColor: "#ffffff", p: 2, borderRadius: 2, boxShadow: "0 4px 12px rgba(26,42,108,0.07)" }}>
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

export default Report;