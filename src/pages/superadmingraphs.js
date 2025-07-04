import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// Register Chart.js components
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const SuperAdminGraphs = () => {
  const [orgCount, setOrgCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const navyText = '#001F54';

  // Fetch organization and admin counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch organizations
        const orgSnap = await getDocs(collection(db, 'Organizations'));
        setOrgCount(orgSnap.size);

        // Fetch admins (users with role 'admin')
        const adminQuery = query(collection(db, 'Users'), where('role', '==', 'admin'));
        const adminSnap = await getDocs(adminQuery);
        setAdminCount(adminSnap.size);
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };
    fetchCounts();
  }, []);

  // Bar chart data
  const barData = {
    labels: ['Organizations', 'Admins'],
    datasets: [
      {
        label: 'Count',
        data: [orgCount, adminCount],
        backgroundColor: ['#2196f3', '#f44336'],
        borderColor: ['#1976d2', '#d32f2f'],
        borderWidth: 1,
      },
    ],
  };

  // Pie chart data
  const pieData = {
    labels: ['Organizations', 'Admins'],
    datasets: [
      {
        data: [orgCount, adminCount],
        backgroundColor: ['#2196f3', '#f44336'],
        borderColor: ['#1976d2', '#d32f2f'],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
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

  // Bar chart specific options
  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: navyText },
        grid: { color: '#e3f2fd' },
      },
      x: {
        ticks: { color: navyText },
        grid: { display: false },
      },
    },
  };

  // Pie chart specific options
  const pieOptions = {
    ...chartOptions,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ color: navyText, mb: 4 }}>
        Super Admin Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Counts */}
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
              borderRadius: 3,
              boxShadow: 3,
            }}
          >
            <Typography variant="h6" sx={{ color: navyText, mb: 2 }}>
              System Overview
            </Typography>
            <Typography variant="body1" sx={{ color: navyText }}>
              <strong>Total Organizations:</strong> {orgCount}
            </Typography>
            <Typography variant="body1" sx={{ color: navyText, mt: 1 }}>
              <strong>Total Admins:</strong> {adminCount}
            </Typography>
          </Paper>
        </Grid>

        {/* Bar Chart */}
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
              borderRadius: 3,
              boxShadow: 3,
              height: 300,
            }}
          >
            <Typography variant="h6" sx={{ color: navyText, mb: 2 }}>
              Organization & Admin Counts
            </Typography>
            <Box sx={{ height: 220 }}>
              <Bar data={barData} options={barOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
              borderRadius: 3,
              boxShadow: 3,
              height: 300,
            }}
          >
            <Typography variant="h6" sx={{ color: navyText, mb: 2 }}>
              Distribution
            </Typography>
            <Box sx={{ height: 220 }}>
              <Pie data={pieData} options={pieOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SuperAdminGraphs;