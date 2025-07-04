import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async () => {
    setError('');
    setSuccessMessage('');
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      const userRef = doc(db, 'Users', trimmedUsername);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        if (
          data.username?.toLowerCase() === trimmedUsername &&
          data.password === trimmedPassword
        ) {
          const role = data.role?.toLowerCase();
          sessionStorage.setItem("username", trimmedUsername);
          setSuccessMessage('Login successful! Redirecting...');

          setTimeout(() => {
            switch (role) {
              case 'superadmin':
                navigate('/superadmindashboard');
                break;
              case 'admin':
                navigate('/admindashboard');
                break;
              case 'agent':
                navigate('/agentdashboard');
                break;
              case 'user':
                navigate('/userdashboard');
                break;
              default:
                setError('Unknown role. Contact system administrator.');
            }
          }, 1500);
        } else {
          setError('Invalid username or password.');
        }
      } else {
        setError('User not found.');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Left Panel */}
      <Box
        sx={{
          flex: 1,
          background: 'linear-gradient(to top left, #5A189A, #90E0EF)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
          pr: 19,
          textAlign: 'right',
        }}
      >
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 'bold', fontFamily: 'Poppins, serif' }}>
            Helpmate
          </Typography>
          <Typography variant="h6" sx={{ mt: 2, fontFamily: 'Roboto, sans-serif', maxWidth: 400 }}>
            Manage all your support teams, organizations, and tickets from one powerful dashboard.
          </Typography>
        </Box>
      </Box>

      {/* Right Panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          pl: 16,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 3,
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'scale(1.01)',
            },
          }}
        >
          <CardContent>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                mb: 3,
                fontWeight: 'bold',
                fontFamily: 'Poppins, sans-serif',
                textAlign: 'center',
                color: '#333',
              }}
            >
              Welcome Back
            </Typography>

            <TextField
              fullWidth
              margin="normal"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              sx={{
                mt: 3,
                py: 1.5,
                fontWeight: 600,
                borderRadius: 2,
                background: 'linear-gradient(to right, #5A189A, #90E0EF)',
                color: 'white',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(to right, #4C1D95, #48CAE4)',
                },
              }}
              onClick={handleLogin}
            >
              Login
            </Button>

            {successMessage && (
              <Alert severity="info" sx={{ mt: 2, color: '#0d47a1', bgcolor: '#e3f2fd' }}>
                {successMessage}
              </Alert>
            )}

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
              
              <Link href="/change-password" variant="body2">
                Change Password
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Login;
