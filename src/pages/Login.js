import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { Country, State, City } from 'country-state-city';


const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openRequestForm, setOpenRequestForm] = useState(false);
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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      {/* Left Panel */}
      <Box
        sx={{
          flex: 1,
          background: 'linear-gradient(to top left, #5A189A, #90E0EF)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: { xs: 'center', md: 'flex-end' },
          pr: { xs: 2, sm: 4, md: 10 },
          py: { xs: 4, md: 0 },
          textAlign: { xs: 'center', md: 'right' },
          minHeight: { xs: '200px', sm: '240px', md: '100vh' },
        }}
      >
        <Box sx={{ px: { xs: 2, md: 0 }, maxWidth: { xs: '90%', md: 400 } }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 'bold',
              fontFamily: 'Poppins, serif',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            }}
          >
            Helpmate
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mt: 2,
              fontFamily: 'Roboto, sans-serif',
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.125rem' },
              maxWidth: '100%',
            }}
          >
            Manage all your support teams, organizations, and tickets from one powerful dashboard.
          </Typography>
        </Box>
      </Box>

      {/* Right Panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: { xs: 'center', md: 'flex-start' },
          alignItems: 'center',
          pl: { xs: 2, sm: 4, md: 8 },
          py: { xs: 4, md: 0 },
          minHeight: { xs: 'auto', md: '100vh' },
          background: { xs: '#f8f9fa', md: 'none' },
        }}
      >
        <Card
          sx={{
            width: { xs: '90%', sm: '100%' },
            maxWidth: { xs: 340, sm: 400 },
            p: { xs: 2, sm: 3 },
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: { xs: 'none', sm: 'scale(1.01)' },
            },
            mx: { xs: 2, md: 0 },
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
                fontSize: { xs: '1.5rem', sm: '1.7rem', md: '2rem' },
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
              autoComplete="username"
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
              inputProps={{ 'aria-label': 'Username' }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
              inputProps={{ 'aria-label': 'Password' }}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
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
                minHeight: '48px',
                '&:hover': {
                  background: 'linear-gradient(to right, #4C1D95, #48CAE4)',
                },
              }}
              onClick={handleLogin}
              aria-label="Login"
            >
              Login
            </Button>

            {successMessage && (
              <Alert
                severity="info"
                sx={{
                  mt: 2,
                  color: '#0d47a1',
                  bgcolor: '#e3f2fd',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                }}
              >
                {successMessage}
              </Alert>
            )}

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                href="#"
                onClick={handleOpenRequestForm}
                sx={{
                  fontFamily: 'Roboto, sans-serif',
                  color: '#5A189A',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  '&:hover': { color: '#4C1D95', textDecoration: 'underline' },
                }}
              >
                Request Access for Your Organization
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Request Access Form Dialog */}
      <Dialog
        open={openRequestForm}
        onClose={handleCloseRequestForm}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '12px',
            maxWidth: { xs: '90%', sm: 600 },
            p: 2,
          },
        }}
        aria-labelledby="request-access-dialog-title"
      >
        <DialogTitle
          id="request-access-dialog-title"
          sx={{
            fontFamily: 'Poppins, sans-serif',
            color: '#5A189A',
            fontWeight: 600,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
          }}
        >
          Request Access for Your Organization
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            {/* Organization Details */}
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                color: '#333',
                mb: 1,
                fontSize: { xs: '1rem', sm: '1.125rem' },
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
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
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
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
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
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
              inputProps={{ 'aria-label': 'Organization Email' }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Organization Phone Number"
              name="orgPhone"
              value={requestFormData.organizationPhone}
              onChange={handleFormChange}
              required
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
              inputProps={{ 'aria-label': 'Organization Phone Number' }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Website (Optional)"
              name="website"
              value={requestFormData.website}
              onChange={handleFormChange}
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
              inputProps={{ 'aria-label': 'Website' }}
            />
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                color: '#333',
                mt: 2,
                mb: 1,
                fontSize: { xs: '1rem', sm: '1.125rem' },
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
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
              inputProps={{ 'aria-label': 'Street' }}
            />
            {/* Country Select */}
            <Box sx={{ mt: 2 }}>
              <label style={{ fontWeight: 500 }}>Country</label>
              <Select
                options={Country.getAllCountries().map((c) => ({
                  label: c.name,
                  value: c.isoCode,
                }))}
                value={selectedCountry}
                onChange={(selected) => {
                  setSelectedCountry(selected);
                  setSelectedState(null);
                  setSelectedCity(null);
                  setRequestFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, country: selected.label },
                  }));
                }}
                placeholder="Select Country"
              />
            </Box>

            {/* State Select */}
            <Box sx={{ mt: 2 }}>
              <label style={{ fontWeight: 500 }}>State</label>
              <Select
                options={
                  selectedCountry
                    ? State.getStatesOfCountry(selectedCountry.value).map((s) => ({
                      label: s.name,
                      value: s.isoCode,
                    }))
                    : []
                }
                value={selectedState}
                onChange={(selected) => {
                  setSelectedState(selected);
                  setSelectedCity(null);
                  setRequestFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, state: selected.label },
                  }));
                }}
                placeholder="Select State"
                isDisabled={!selectedCountry}
              />
            </Box>

            {/* City Select */}
            <Box sx={{ mt: 2 }}>
              <label style={{ fontWeight: 500 }}>City</label>
              <Select
                options={
                  selectedCountry && selectedState
                    ? City.getCitiesOfState(selectedCountry.value, selectedState.value).map(
                      (city) => ({ label: city.name, value: city.name })
                    )
                    : []
                }
                value={selectedCity}
                onChange={(selected) => {
                  setSelectedCity(selected);
                  setRequestFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: selected.label },
                  }));
                }}
                placeholder="Select City"
                isDisabled={!selectedState}
              />
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                color: '#333',
                mt: 2,
                mb: 1,
                fontSize: { xs: '1rem', sm: '1.125rem' },
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
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
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
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
              inputProps={{ 'aria-label': 'Admin Email' }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Admin Phone Number"
              name="adminPhone"
              value={requestFormData.adminPhone}
              onChange={handleFormChange}
              required
              sx={{ '& .MuiInputBase-root': { minHeight: '48px' } }}
              inputProps={{ 'aria-label': 'Admin Phone Number' }}
            />
            {formError && (
              <Alert severity="error" sx={{ mt: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {formError}
              </Alert>
            )}
            {formSuccess && (
              <Alert severity="success" sx={{ mt: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {formSuccess}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseRequestForm}
            sx={{
              fontFamily: 'Roboto, sans-serif',
              color: '#5A189A',
              textTransform: 'none',
              '&:hover': { color: '#4C1D95' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFormSubmit}
            variant="contained"
            sx={{
              fontFamily: 'Roboto, sans-serif',
              background: 'linear-gradient(to right, #5A189A, #90E0EF)',
              color: 'white',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(to right, #4C1D95, #48CAE4)',
              },
            }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;