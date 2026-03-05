import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardHeader, CardContent, Stack
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";

// Register Chart.js components
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const navyText = '#001F54';

const StatCard = ({ icon, label, value, color }) => (
  <Paper
    sx={{
      p: { xs: 2, sm: 3 },
      minWidth: { xs: 160, sm: 200 },
      background: 'linear-gradient(135deg, #e3f2fd 80%, #ffffff)',
      borderRadius: 3,
      boxShadow: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}
  >
    <Box sx={{ color: color, fontSize: { xs: 32, sm: 40 } }}>{icon}</Box>
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>{value}</Typography>
      <Typography variant="subtitle2" sx={{ color: "#555" }}>{label}</Typography>
    </Box>
  </Paper>
);

// --- Organization by Field chart (Recharts based) ---
const OrganizationFieldBarChart = ({ organizations }) => {
  const fieldCount = {};
  organizations.forEach((org) => {
    const field = org.field || "Unknown";
    fieldCount[field] = (fieldCount[field] || 0) + 1;
  });
  const data = Object.entries(fieldCount).map(([field, count]) => ({
    field,
    count,
  }));

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
        <Typography>No data to display.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{
      p: 3, borderRadius: 3, boxShadow: 2,
      width: '100%',
      height: 350,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Typography variant="h6" sx={{ mb: 2, color: navyText, fontWeight: 600 }}>
        Organizations by Field
      </Typography>
      <ResponsiveContainer width="100%" height={260}>
        <ReBarChart data={data} layout="vertical" margin={{ left: 0, right: 0, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="2 2" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="field" width={150} fontSize={12} />
          <ReBar dataKey="count" fill="#2196f3" barSize={20} radius={[8, 8, 8, 8]} />
        </ReBarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

const DashboardContent = () => {
  const [organizations, setOrganizations] = useState([]);
  const [orgCount, setOrgCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [monthlyOrgData, setMonthlyOrgData] = useState([]);

  // Fetch organizations & admin counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const orgSnap = await getDocs(collection(db, 'Organizations'));
        const orgs = [];
        const monthCounts = {};

        orgSnap.forEach(doc => {
          const data = doc.data();
          orgs.push(data);
          // Convert timestamp to month-year
          const createdAt = data.createdAt?.toDate();
          if (createdAt) {
            const monthYear = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
            monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
          }
        });

        // Prepare data for monthly growth chart
        const sortedMonths = Object.keys(monthCounts).sort();
        const monthlyData = sortedMonths.map(month => ({
          month,
          count: monthCounts[month]
        }));

        setOrganizations(orgs);
        setOrgCount(orgSnap.size);
        setMonthlyOrgData(monthlyData);

        const adminQuery = query(collection(db, 'Users'), where('role', '==', 'admin'));
        const adminSnap = await getDocs(adminQuery);
        setAdminCount(adminSnap.size);
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };
    fetchCounts();
  }, []);

  // Chart.js chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: navyText } },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: navyText,
        bodyColor: navyText,
        borderColor: '#e3f2fd',
        borderWidth: 1,
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: navyText }, grid: { color: '#e3f2fd' } },
      x: { ticks: { color: navyText }, grid: { display: false } },
    },
  };

  // Bar chart data
  const barData = {
    labels: ['Organizations', 'Admins'],
    datasets: [
      {
        label: 'Count',
        data: [orgCount, adminCount],
        backgroundColor: ['#42a5f5', '#ef5350'],
        borderColor: ['#1e88e5', '#c62828'],
        borderWidth: 2,
        borderRadius: 5
      },
    ],
  };

  // Monthly organization growth line chart
  const monthlyLineData = {
    labels: monthlyOrgData.map(data => data.month),
    datasets: [
      {
        label: 'Organizations Created',
        data: monthlyOrgData.map(data => data.count),
        borderColor: '#26a69a',
        backgroundColor: 'rgba(38, 166, 154, 0.3)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#26a69a',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      },
    ],
  };

  return (
    <Box sx={{ p: 3, background: '#f4f6f8', minHeight: '100vh' }}>
      <Card sx={{
        maxWidth: 800, mx: 'auto', mb: 4,
        p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: 4,
        background: 'linear-gradient(135deg, #e3f2fd 80%, #ffffff)',
        transition: 'transform 0.3s ease', "&:hover": { transform: "translateY(-4px)" }
      }}>
        <CardHeader
          title={
            <Typography variant="h4" sx={{
              fontWeight: 900, letterSpacing: 1.5, color: "#1976d2",
              textAlign: 'center'
            }}>
              HELPMATE
            </Typography>
          }
          subheader={
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 500, color: "#444", mb: 1 }}>
                Welcome, Super Admin!
              </Typography>
              <Typography variant="body1" sx={{ color: "#666", fontStyle: "italic" }}>
                Streamline your support teams and tickets with our intuitive, all-in-one dashboard.
              </Typography>
            </Box>
          }
        />
      </Card>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 4 }}
        justifyContent="center"
      >
        <StatCard
          icon={<GroupIcon fontSize="inherit" />}
          label="Total Organizations"
          value={orgCount}
          color="#1976d2"
        />
        <StatCard
          icon={<SupervisorAccountIcon fontSize="inherit" />}
          label="Total Admins"
          value={adminCount}
          color="#ff9800"
        />
      </Stack>

      {/* Centered Charts */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Grid container spacing={3} sx={{ maxWidth: 1200, width: '100%' }}>
          <Grid item xs={12} md={4}>
            <OrganizationFieldBarChart organizations={organizations} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: 350, borderRadius: 4, boxShadow: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: navyText }}>
                Organization & Admin Counts
              </Typography>
              <Box sx={{ height: 260 }}>
                <Bar data={barData} options={chartOptions} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: 350, borderRadius: 4, boxShadow: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: navyText }}>
                Monthly Organization Growth
              </Typography>
              <Box sx={{ height: 260 }}>
                <Line data={monthlyLineData} options={chartOptions} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Helpdesk Card */}
      <Card sx={{
        maxWidth: 800, mx: 'auto', mt: 4,
        p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: 4,
        background: 'linear-gradient(135deg, #e1f5fe 80%, #ffffff)',
      }}>
        <CardHeader
          title={
            <Typography variant="h6" sx={{ fontWeight: 600, color: navyText }}>
              About HelpMate Ticket Management
            </Typography>
          }
        />
        <CardContent>
          <Typography variant="body1" sx={{ color: "#444" }}>
            HelpMate is a powerful helpdesk ticket management system designed to streamline your customer support operations. With features like ticket tracking, automated workflows, and real-time analytics, HelpMate empowers your team to deliver exceptional support efficiently. Manage tickets, assign tasks, and monitor progress all from one intuitive platform, ensuring customer satisfaction and operational excellence.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardContent;