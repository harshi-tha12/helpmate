import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
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

// Register Chart.js components
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const SuperAdminGraphs = () => {
  const [orgCount, setOrgCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const navyText = '#001F54';

  // Fetch organization and admin counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const orgSnap = await getDocs(collection(db, 'Organizations'));
        setOrgCount(orgSnap.size);

        const adminQuery = query(collection(db, 'Users'), where('role', '==', 'admin'));
        const adminSnap = await getDocs(adminQuery);
        setAdminCount(adminSnap.size);
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };
    fetchCounts();
  }, []);

  // Common chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: navyText },
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: navyText,
        bodyColor: navyText,
        borderColor: '#e3f2fd',
        borderWidth: 1,
      },
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

  // Pie chart data
  const pieData = {
    labels: ['Organizations', 'Admins'],
    datasets: [
      {
        data: [orgCount, adminCount],
        backgroundColor: ['#66bb6a', '#ffca28'],
        borderColor: ['#388e3c', '#f57f17'],
        borderWidth: 2,
      },
    ],
  };

  // Line chart data (showing trend)
  const lineData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Organizations Growth',
        data: [orgCount - 3, orgCount - 2, orgCount - 1, orgCount],
        borderColor: '#42a5f5',
        backgroundColor: 'rgba(66, 165, 245, 0.3)',
        fill: true,
        tension: 0.3
      },
      {
        label: 'Admins Growth',
        data: [adminCount - 2, adminCount - 1, adminCount, adminCount + 1],
        borderColor: '#ef5350',
        backgroundColor: 'rgba(239, 83, 80, 0.3)',
        fill: true,
        tension: 0.3
      },
    ],
  };

  // Doughnut chart data
  const doughnutData = {
    labels: ['Organizations', 'Admins'],
    datasets: [
      {
        data: [orgCount, adminCount],
        backgroundColor: ['#ab47bc', '#29b6f6'],
        borderColor: ['#6a1b9a', '#0288d1'],
        borderWidth: 2,
      },
    ],
  };

  return (
    <Box sx={{ p: 3, background: '#f4f6f8', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ color: navyText, mb: 4, fontWeight: 'bold' }}>
        Helpmate Ticket Management - Super Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{
            p: 3,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #42a5f5, #478ed1)',
            color: '#fff',
            borderRadius: 4,
            boxShadow: 5
          }}>
            <Typography variant="h6">Organizations</Typography>
            <Typography variant="h3" fontWeight="bold">{orgCount}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{
            p: 3,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ef5350, #d32f2f)',
            color: '#fff',
            borderRadius: 4,
            boxShadow: 5
          }}>
            <Typography variant="h6">Admins</Typography>
            <Typography variant="h3" fontWeight="bold">{adminCount}</Typography>
          </Paper>
        </Grid>

        {/* Bar Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 350, borderRadius: 4, boxShadow: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: navyText }}>
              Organization & Admin Counts
            </Typography>
            <Box sx={{ height: 260 }}>
              <Bar data={barData} options={{
                ...chartOptions,
                scales: {
                  y: { beginAtZero: true, ticks: { color: navyText }, grid: { color: '#e3f2fd' } },
                  x: { ticks: { color: navyText }, grid: { display: false } },
                },
              }} />
            </Box>
          </Paper>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 350, borderRadius: 4, boxShadow: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: navyText }}>
              Distribution
            </Typography>
            <Box sx={{ height: 260 }}>
              <Pie data={pieData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Line Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 350, borderRadius: 4, boxShadow: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: navyText }}>
              Growth Over Time
            </Typography>
            <Box sx={{ height: 260 }}>
              <Line data={lineData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Doughnut Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 350, borderRadius: 4, boxShadow: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: navyText }}>
              Proportion Overview
            </Typography>
            <Box sx={{ height: 260 }}>
              <Doughnut data={doughnutData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SuperAdminGraphs;
