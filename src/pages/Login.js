import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Link, Alert, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Avatar, InputAdornment, Grid, AppBar, Toolbar,
} from '@mui/material';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Select from 'react-select';
import { Country, State, City } from 'country-state-city';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneAndroidOutlinedIcon from '@mui/icons-material/PhoneAndroidOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openRequestForm, setOpenRequestForm] = useState(false);
  const [openAboutUs, setOpenAboutUs] = useState(false);
  const [openContactUs, setOpenContactUs] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    orgName: '',
    category: '',
    orgEmail: '',
    orgPhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    website: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  

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
          sessionStorage.setItem('username', trimmedUsername);
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

  const handleOpenRequestForm = () => {
    setOpenRequestForm(true);
    setFormError('');
    setFormSuccess('');
  };

  const handleCloseRequestForm = () => {
    setOpenRequestForm(false);
    setRequestFormData({
      orgName: '',
      category: '',
      orgEmail: '',
      orgPhone: '',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      website: '',
      adminName: '',
      adminEmail: '',
      adminPhone: '',
    });
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedCity(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setRequestFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setRequestFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const { orgName, category, orgEmail, orgPhone, address, adminName, adminEmail, adminPhone } = requestFormData;
    const { street, city, state, postalCode, country } = address;

    if (!orgName || !category || !orgEmail || !orgPhone || !street || !city || !state || !postalCode || !country || !adminName || !adminEmail || !adminPhone) {
      setFormError('Please fill in all required fields.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orgEmail) || !emailRegex.test(adminEmail)) {
      setFormError('Please enter valid email addresses.');
      return false;
    }

    const phoneRegex = /^\+?\d{10}$/;
    if (!phoneRegex.test(orgPhone) || !phoneRegex.test(adminPhone)) {
      setFormError('Please enter valid phone numbers (exactly 10 digits, optional +).');
      return false;
    }

    return true;
  };

  const handleFormSubmit = async () => {
    setFormError('');
    setFormSuccess('');

    if (!validateForm()) {
      return;
    }

    try {
      const requestId = `REQUEST-${Date.now()}`;
      const requestData = {
        ...requestFormData,
        requestId,
        status: 'Pending',
        createdAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'accessRequests', requestId), requestData);
      setFormSuccess('Access request submitted successfully! You will be contacted by the superadmin.');
      setTimeout(() => {
        handleCloseRequestForm();
      }, 2000);
    } catch (err) {
      console.error('Error submitting access request:', err);
      setFormError('Failed to submit request. Please try again.');
    }
  };

  const categories = [
    'Technology',
    'Healthcare',
    'Education',
    'Finance',
    'Retail',
    'Manufacturing',
    'Non-Profit',
    'Other',
  ];

  const countryOptions = Country.getAllCountries().map((c) => ({
    label: c.name,
    value: c.isoCode,
  }));

  const stateOptions = selectedCountry
    ? State.getStatesOfCountry(selectedCountry.value).map((s) => ({
        label: s.name,
        value: s.isoCode,
      }))
    : [];

  const cityOptions =
    selectedCountry && selectedState
      ? City.getCitiesOfState(selectedCountry.value, selectedState.value).map((city) => ({
          label: city.name,
          value: city.name,
        }))
      : [];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        background: 'linear-gradient(135deg, #F5F7FA 0%, #E3F2FD 100%)',
      }}
    >
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(20, 54, 109, 0.1)',
          borderBottom: '1px solid rgba(20, 54, 109, 0.2)',
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: { xs: 2, sm: 3 },
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              color: '#3573d7ff',
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              letterSpacing: '0.02em',
            }}
          >
            Helpmate
          </Typography>
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 } }}>
            <Button
              onClick={() => setOpenAboutUs(true)}
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                color: '#FFFFFF',
                textTransform: 'none',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                px: { xs: 2, sm: 3 },
                py: 1,
                borderRadius: 8,
                background: 'linear-gradient(90deg, #3573d7ff 0%, #4A6FA5 100%)',
                boxShadow: '0 4px 12px rgba(20, 54, 109, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(90deg, #0F2A52 0%, #3B5C8C 100%)',
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 16px rgba(20, 54, 109, 0.3)',
                },
              }}
              aria-label="About Us"
            >
              About Us
            </Button>
            <Button
              onClick={() => setOpenContactUs(true)}
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                color: '#FFFFFF',
                textTransform: 'none',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                px: { xs: 2, sm: 3 },
                py: 1,
                borderRadius: 8,
                background: 'linear-gradient(90deg, #3573d7ff 0%, #4A6FA5 100%)',
                boxShadow: '0 4px 12px rgba(20, 54, 109, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(90deg, #0F2A52 0%, #3B5C8C 100%)',
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 16px rgba(20, 54, 109, 0.3)',
                },
              }}
              aria-label="Contact Us"
            >
              Contact Us
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          flexGrow: 1,
          mt: { xs: 8, sm: 9 },
        }}
      >
        {/* Left Panel with Hero Image + Logo */}
        <Box
          sx={{
            flex: 1.2,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: { xs: 4, md: 0 },
            minHeight: { xs: '250px', md: '100vh' },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage:
                'url(https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(3px)',
              zIndex: 0,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(24, 71, 147, 0.8) 0%, rgba(57, 119, 211, 0.7) 100%)',
              zIndex: 1,
            }}
          />
          <Box
            sx={{
              zIndex: 2,
              textAlign: 'center',
              px: { xs: 2, md: 4 },
              maxWidth: '500px',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'scale(1.05)' },
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                color: '#FFFFFF',
                textShadow: '0px 4px 16px rgba(20, 54, 109, 0.3)',
                letterSpacing: '0.05em',
                mb: 1.5,
              }}
            >
              Helpmate
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                color: '#FFFFFF',
                opacity: 0.9,
                letterSpacing: '0.02em',
                lineHeight: 1.6,
                fontWeight: 400,
              }}
            >
              Streamline your support teams and tickets with our intuitive, all-in-one dashboard.
            </Typography>
          </Box>
        </Box>

        {/* Right Panel (Login Form) */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: { xs: 4, md: 0 },
            minHeight: { xs: 'auto', md: '100vh' },
            background: { xs: '#F5F7FA', md: 'transparent' },
            zIndex: 3,
          }}
        >
          <Card
            sx={{
              width: { xs: '90%', sm: 450 },
              maxWidth: 480,
              p: { xs: 3, sm: 4 },
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: '0 12px 40px rgba(20, 54, 109, 0.2)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
                <Avatar
                  src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                  sx={{ width: 56, height: 56, bgcolor: '#E3F2FD', boxShadow: '0 4px 16px rgba(20, 54, 109, 0.3)', mr: 2 }}
                />
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                    color: '#3573d7ff',
                    fontSize: { xs: '1.75rem', sm: '2rem' },
                    letterSpacing: '0.02em',
                  }}
                >
                  Welcome Back
                </Typography>
              </Box>

              <TextField
                fullWidth
                margin="normal"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                sx={{
                  '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#90CAF9' },
                    '&:hover fieldset': { borderColor: '#4A6FA5' },
                    '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                  },
                }}
                inputProps={{ 'aria-label': 'Username' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ color: '#3573d7ff' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                sx={{
                  '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#90CAF9' },
                    '&:hover fieldset': { borderColor: '#4A6FA5' },
                    '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                  },
                }}
                inputProps={{ 'aria-label': 'Password' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: '#3573d7ff' }} />
                    </InputAdornment>
                  ),
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2, fontSize: { xs: '0.85rem', sm: '0.9rem' }, bgcolor: '#FFE4E4' }}>
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
                  borderRadius: 8,
                  background: 'linear-gradient(90deg, #3573d7ff 0%, #4A6FA5 100%)',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 4px 16px rgba(20, 54, 109, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #0F2A52 0%, #3B5C8C 100%)',
                    boxShadow: '0 6px 20px rgba(20, 54, 109, 0.4)',
                    transform: 'scale(1.02)',
                  },
                }}
                onClick={handleLogin}
                aria-label="Login"
                endIcon={<LockOutlinedIcon />}
              >
                Login
              </Button>

              {successMessage && (
                <Alert
                  severity="success"
                  sx={{
                    mt: 2,
                    color: '#3573d7ff',
                    bgcolor: '#E3F2FD',
                    fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  }}
                >
                  {successMessage}
                </Alert>
              )}

              <Box sx={{ mt: 2.5, textAlign: 'center' }}>
                <Link
                  href="#"
                  onClick={handleOpenRequestForm}
                  sx={{
                    fontFamily: 'Inter, sans-serif',
                    color: '#3573d7ff',
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    textDecoration: 'none',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: '#4A6FA5',
                      background: 'rgba(20, 54, 109, 0.1)',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Request Access for Your Organization
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: '#111',
          color: '#ccc',
          p: { xs: 2, sm: 3 },
          width: '100%',
          mt: 'auto',
          borderTop: '1px solid #444',
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }} justifyContent="center">
          <Grid item xs={12}>
            <Typography
              variant="body2"
              sx={{
                color: '#fff',
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                textAlign: 'center',
                mb: 2,
              }}
            >
              © 2025 Helpmate. All rights reserved.
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#ccc',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                textAlign: 'center',
                display: 'block',
                mb: 2,
              }}
            >
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Link
                href="#"
                onClick={() => setOpenAboutUs(true)}
                sx={{
                  color: '#ccc',
                  textDecoration: 'none',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  '&:hover': { color: '#4A6FA5', textDecoration: 'underline' },
                }}
                aria-label="About Us"
              >
                About Us
              </Link>
              <Link
                href="#"
                onClick={() => setOpenContactUs(true)}
                sx={{
                  color: '#ccc',
                  textDecoration: 'none',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  '&:hover': { color: '#4A6FA5', textDecoration: 'underline' },
                }}
                aria-label="Contact Us"
              >
                Contact Us
              </Link>
              <Link
                href="#"
                sx={{
                  color: '#ccc',
                  textDecoration: 'none',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  '&:hover': { color: '#4A6FA5', textDecoration: 'underline' },
                }}
                aria-label="Privacy Policy"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                sx={{
                  color: '#ccc',
                  textDecoration: 'none',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  '&:hover': { color: '#4A6FA5', textDecoration: 'underline' },
                }}
                aria-label="Terms of Service"
              >
                Terms of Service
              </Link>
            </Box>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#ccc',
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                }}
              >
                📧 support@helpmate.com | 📞 +1 (234) 567-8900
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              <Link href="https://www.linkedin.com" target="_blank" aria-label="LinkedIn">
                <LinkedInIcon sx={{ color: '#ccc', fontSize: '1.5rem', '&:hover': { color: '#4A6FA5' } }} />
              </Link>
              <Link href="https://www.twitter.com" target="_blank" aria-label="Twitter">
                <TwitterIcon sx={{ color: '#ccc', fontSize: '1.5rem', '&:hover': { color: '#4A6FA5' } }} />
              </Link>
              <Link href="https://www.instagram.com" target="_blank" aria-label="Instagram">
                <InstagramIcon sx={{ color: '#ccc', fontSize: '1.5rem', '&:hover': { color: '#4A6FA5' } }} />
              </Link>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: '#ccc',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                textAlign: 'center',
                display: 'block',
                mt: 2,
              }}
            >
              “Smart, AI-powered support for modern organizations.”
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* About Us Dialog */}
      <Dialog
        open={openAboutUs}
        onClose={() => setOpenAboutUs(false)}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 12,
            maxWidth: { xs: '95%', sm: 640 },
            p: 3,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(20, 54, 109, 0.2)',
            transition: 'all 0.3s ease',
          },
        }}
        aria-labelledby="about-us-dialog-title"
      >
        <DialogTitle
          id="about-us-dialog-title"
          sx={{
            fontFamily: 'Inter, sans-serif',
            color: '#3573d7ff',
            fontWeight: 600,
            fontSize: { xs: '1.5rem', sm: '1.75rem' },
          }}
        >
          About Us
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#333',
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1rem' },
            }}
          >
            Helpmate is an AI-powered ticket management system designed to modernize the way organizations handle support and service requests. Our platform provides a centralized solution for creating, tracking, and resolving tickets with speed and accuracy. With features like AI-driven ticket prioritization, smart resolution suggestions, SLA monitoring, and real-time updates, Helpmate ensures efficiency and transparency at every stage of the support process. Built using React.js, Node.js, and Firebase, the system delivers a secure, scalable, and user-friendly experience for businesses of all sizes. Our goal is to empower organizations with intelligent tools that improve communication, boost productivity, and enhance customer satisfaction.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenAboutUs(false)}
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#3573d7ff',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 8,
              px: 3,
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(20, 54, 109, 0.1)',
                color: '#4A6FA5',
              },
            }}
            aria-label="Close"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Us Dialog */}
      <Dialog
        open={openContactUs}
        onClose={() => setOpenContactUs(false)}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 12,
            maxWidth: { xs: '95%', sm: 640 },
            p: 3,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(20, 54, 109, 0.2)',
            transition: 'all 0.3s ease',
          },
        }}
        aria-labelledby="contact-us-dialog-title"
      >
        <DialogTitle
          id="contact-us-dialog-title"
          sx={{
            fontFamily: 'Inter, sans-serif',
            color: '#3573d7ff',
            fontWeight: 600,
            fontSize: { xs: '1.5rem', sm: '1.75rem' },
          }}
        >
          Contact Us
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#333',
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              mb: 1,
            }}
          >
            <strong>Email:</strong> support@helpmate.com
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#333',
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              mb: 1,
            }}
          >
            <strong>📞 Phone:</strong> +1 (234) 567-8900
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#333',
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              mb: 1,
            }}
          >
            <strong>🏢 Address:</strong> Infapp Santhosh Nagar, Udupi
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#333',
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              mb: 1,
            }}
          >
            <strong>🕒 Business Hours:</strong> Monday – Friday, 9:00 AM – 6:00 PM IST
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#333',
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              mb: 1,
            }}
          >
            <strong>💬 Feedback:</strong> We value your feedback to improve our services — feel free to share your suggestions.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#333',
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1rem' },
            }}
          >
            <strong>🔗 Follow Us:</strong>{' '}
            <Link href="https://www.linkedin.com" target="_blank" sx={{ color: '#3573d7ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              LinkedIn
            </Link>
            {' | '}
            <Link href="https://www.twitter.com" target="_blank" sx={{ color: '#3573d7ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              Twitter
            </Link>
            {' | '}
            <Link href="https://www.instagram.com" target="_blank" sx={{ color: '#3573d7ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              Instagram
            </Link>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenContactUs(false)}
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#3573d7ff',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 8,
              px: 3,
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(20, 54, 109, 0.1)',
                color: '#4A6FA5',
              },
            }}
            aria-label="Close"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Access Form Dialog */}
      <Dialog
        open={openRequestForm}
        onClose={handleCloseRequestForm}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 12,
            maxWidth: { xs: '95%', sm: 640 },
            p: 3,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(20, 54, 109, 0.2)',
            transition: 'all 0.3s ease',
          },
        }}
        aria-labelledby="request-access-dialog-title"
      >
        <DialogTitle
          id="request-access-dialog-title"
          sx={{
            fontFamily: 'Inter, sans-serif',
            color: '#3573d7ff',
            fontWeight: 600,
            fontSize: { xs: '1.5rem', sm: '1.75rem' },
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            src="https://cdn-icons-png.flaticon.com/512/2991/2991075.png"
            sx={{ width: 40, height: 40, bgcolor: '#E3F2FD', boxShadow: '0 4px 12px rgba(20, 54, 109, 0.2)' }}
          />
          Request Organization Access
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Inter, sans-serif',
                color: '#3573d7ff',
                mb: 1.5,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 600,
              }}
            >
              Organization Details
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              label="Organization Name"
              name="orgName"
              value={requestFormData.orgName}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Organization Name' }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Category"
              name="category"
              select
              value={requestFormData.category}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Category' }}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              margin="normal"
              label="Organization Email"
              name="orgEmail"
              type="email"
              value={requestFormData.orgEmail}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Organization Email' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: '#3573d7ff' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Organization Phone Number"
              name="orgPhone"
              value={requestFormData.orgPhone}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Organization Phone Number' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneAndroidOutlinedIcon sx={{ color: '#3573d7ff' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Website (Optional)"
              name="website"
              value={requestFormData.website}
              onChange={handleFormChange}
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Website' }}
            />
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Inter, sans-serif',
                color: '#3573d7ff',
                mt: 2,
                mb: 1.5,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 600,
              }}
            >
              Address
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              label="Street"
              name="address.street"
              value={requestFormData.address.street}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Street' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOnOutlinedIcon sx={{ color: '#3573d7ff' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 500, fontFamily: 'Inter, sans-serif', color: '#3573d7ff' }}>
                Country
              </Typography>
              <Select
                options={countryOptions}
                value={selectedCountry}
                onChange={(selected) => {
                  setSelectedCountry(selected);
                  setSelectedState(null);
                  setSelectedCity(null);
                  setRequestFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, country: selected ? selected.label : '', state: '', city: '' },
                  }));
                }}
                placeholder="Select Country"
                styles={{
                  menu: (provided) => ({ ...provided, zIndex: 10, borderRadius: '8px' }),
                  control: (provided) => ({
                    ...provided,
                    borderRadius: '8px',
                    borderColor: '#90CAF9',
                    '&:hover': { borderColor: '#4A6FA5' },
                    boxShadow: 'none',
                    minHeight: '50px',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isSelected ? '#3573d7ff' : state.isFocused ? '#E3F2FD' : '#FFFFFF',
                    color: state.isSelected ? '#FFFFFF' : '#3573d7ff',
                  }),
                }}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 500, fontFamily: 'Inter, sans-serif', color: '#3573d7ff' }}>
                State
              </Typography>
              <Select
                options={stateOptions}
                value={selectedState}
                onChange={(selected) => {
                  setSelectedState(selected);
                  setSelectedCity(null);
                  setRequestFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, state: selected ? selected.label : '', city: '' },
                  }));
                }}
                placeholder="Select State"
                isDisabled={!selectedCountry}
                styles={{
                  menu: (provided) => ({ ...provided, zIndex: 10, borderRadius: '8px' }),
                  control: (provided) => ({
                    ...provided,
                    borderRadius: '8px',
                    borderColor: '#90CAF9',
                    '&:hover': { borderColor: '#4A6FA5' },
                    boxShadow: 'none',
                    minHeight: '50px',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isSelected ? '#3573d7ff' : state.isFocused ? '#E3F2FD' : '#FFFFFF',
                    color: state.isSelected ? '#FFFFFF' : '#3573d7ff',
                  }),
                }}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 500, fontFamily: 'Inter, sans-serif', color: '#3573d7ff' }}>
                City
              </Typography>
              <Select
                options={cityOptions}
                value={selectedCity}
                onChange={(selected) => {
                  setSelectedCity(selected);
                  setRequestFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: selected ? selected.label : '' },
                  }));
                }}
                placeholder="Select City"
                isDisabled={!selectedState}
                styles={{
                  menu: (provided) => ({ ...provided, zIndex: 10, borderRadius: '8px' }),
                  control: (provided) => ({
                    ...provided,
                    borderRadius: '8px',
                    borderColor: '#90CAF9',
                    '&:hover': { borderColor: '#4A6FA5' },
                    boxShadow: 'none',
                    minHeight: '50px',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isSelected ? '#3573d7ff' : state.isFocused ? '#E3F2FD' : '#FFFFFF',
                    color: state.isSelected ? '#FFFFFF' : '#3573d7ff',
                  }),
                }}
              />
            </Box>
            <TextField
              fullWidth
              margin="normal"
              label="Postal Code"
              name="address.postalCode"
              value={requestFormData.address.postalCode}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Postal Code' }}
            />
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Inter, sans-serif',
                color: '#3573d7ff',
                mt: 2,
                mb: 1.5,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 600,
              }}
            >
              Admin Details
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              label="Admin Name"
              name="adminName"
              value={requestFormData.adminName}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Admin Name' }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Admin Email"
              name="adminEmail"
              type="email"
              value={requestFormData.adminEmail}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Admin Email' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: '#3573d7ff' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Admin Phone Number"
              name="adminPhone"
              value={requestFormData.adminPhone}
              onChange={handleFormChange}
              required
              sx={{
                '& .MuiInputBase-root': { minHeight: '50px', borderRadius: '8px' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#90CAF9' },
                  '&:hover fieldset': { borderColor: '#4A6FA5' },
                  '&.Mui-focused fieldset': { borderColor: '#3573d7ff' },
                },
              }}
              inputProps={{ 'aria-label': 'Admin Phone Number' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneAndroidOutlinedIcon sx={{ color: '#3573d7ff' }} />
                  </InputAdornment>
                ),
              }}
            />
            {formError && (
              <Alert severity="error" sx={{ mt: 2, fontSize: { xs: '0.85rem', sm: '0.9rem' }, bgcolor: '#FFE4E4' }}>
                {formError}
              </Alert>
            )}
            {formSuccess && (
              <Alert severity="success" sx={{ mt: 2, fontSize: { xs: '0.85rem', sm: '0.9rem' }, bgcolor: '#E3F2FD' }}>
                {formSuccess}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseRequestForm}
            sx={{
              fontFamily: 'Inter, sans-serif',
              color: '#3573d7ff',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 8,
              px: 3,
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(20, 54, 109, 0.1)',
                color: '#4A6FA5',
              },
            }}
            aria-label="Cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleFormSubmit}
            variant="contained"
            sx={{
              fontFamily: 'Inter, sans-serif',
              background: 'linear-gradient(90deg, #3573d7ff 0%, #4A6FA5 100%)',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 8,
              px: 3,
              boxShadow: '0 4px 16px rgba(20, 54, 109, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(90deg, #0F2A52 0%, #3B5C8C 100%)',
                boxShadow: '0 6px 20px rgba(20, 54, 109, 0.4)',
                transform: 'scale(1.02)',
              },
            }}
            aria-label="Submit Request"
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;