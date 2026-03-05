import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Grid, List, ListItem,
  ListItemIcon, ListItemText, Divider, TextField, Collapse,
  Alert, Table, TableContainer, TableBody, TableCell,
  TableHead, TableRow, Card, CardContent, Link, 
  Avatar, IconButton, InputAdornment, Switch, FormControlLabel, MenuItem,
  Drawer, Dialog, DialogTitle, DialogContent, DialogActions, 
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import ListIcon from '@mui/icons-material/List';
import SettingsIcon from '@mui/icons-material/Settings';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import GitHubIcon from '@mui/icons-material/GitHub';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import LogoutIcon from '@mui/icons-material/Logout';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Select from 'react-select';
import { Country, State, City } from 'country-state-city';
import DashboardContent from './graph';
import { useNavigate } from 'react-router-dom';

const SIDEBAR_WIDTH = 300;

const isValidPassword = (password) => {
  if (password.length < 6 || password.length > 15) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  return true;
};

const isValidUsername = (username) => {
  if (username.length < 10) return false;
  if (!/[a-zA-Z]/.test(username)) return false;
  if (!/^[a-zA-Z0-9._]+$/.test(username)) return false;
  return true;
};

const sidebarItems = [
  { text: 'Dashboard', icon: <DashboardIcon /> },
  { text: 'Add Organization', icon: <AddBusinessIcon /> },
  { text: 'Organization List', icon: <ListIcon /> },
  { text: 'Settings', icon: <SettingsIcon /> },
  { text: 'Logout', icon: <LogoutOutlinedIcon /> },
];




// --- ADD ORGANIZATION ---
const AddOrganizationContent = ({
  orgForm, handleFormChange, handleCreateOrgAndAdmin,
  showOrgAdminForm, setShowOrgAdminForm, errorMsg, openDialog, setOpenDialog,
  accessRequests,  handleApproveRequest
}) => {
  const navyText = '#001F54';
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [setApproveDialogOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({ adminUsername: '', adminPassword: '' });
  const [approveError, setApproveError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [localOrgForm, setLocalOrgForm] = useState({
    address: '',
    city: '',
    state: '',
    country: '',
  });
  const [usernameError, setUsernameError] = useState('');
  const [approveUsernameError, setApproveUsernameError] = useState('');

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

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
  };

  const handleApproveDialogClose = () => {
    setSelectedRequest(null);
    setApproveDialogOpen(false);
    setApproveForm({ adminUsername: '', adminPassword: '' });
    setApproveError('');
    setApproveUsernameError('');
  };

  const handleApproveFormChange = (e) => {
    setApproveForm({ ...approveForm, [e.target.name]: e.target.value });
    setApproveError('');
    setApproveUsernameError('');
  };

  const checkApproveUsername = async (username) => {
    setApproveUsernameError('');
    if (!username) return;
    if (!isValidUsername(username)) {
      setApproveUsernameError('Username must be 10 or more characters long, include letters, and can only use numbers, periods, or underscores.');
      return;
    }
    const adminRef = doc(db, 'Users', username.toLowerCase());
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      setApproveUsernameError('Username already exists.');
    }
  };

  const handleApproveSubmit = async () => {
    if (!approveForm.adminUsername || !approveForm.adminPassword) {
      setApproveError('Please provide both username and password.');
      return;
    }

    if (!isValidUsername(approveForm.adminUsername)) {
      setApproveError('Username must be 10 or more characters long, include letters, and can only use numbers, periods, or underscores.');
      return;
    }

    if (!isValidPassword(approveForm.adminPassword)) {
      setApproveError('Password must be 6-15 characters long, include at least one uppercase letter, one number, and one special character.');
      return;
    }

    const adminRef = doc(db, 'Users', approveForm.adminUsername.toLowerCase());
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      setApproveError('Username already exists.');
      return;
    }

    try {
      await handleApproveRequest(selectedRequest, approveForm.adminUsername, approveForm.adminPassword);
      handleApproveDialogClose();
    } catch (err) {
      setApproveError('Error approving request: ' + err.message);
    }
  };

  const checkUsername = async (username) => {
    setUsernameError('');
    if (!username) return;
    if (!isValidUsername(username)) {
      setUsernameError('Username must be 10 or more characters long, include letters, and can only use numbers, periods, or underscores.');
      return;
    }
    const adminRef = doc(db, 'Users', username.toLowerCase());
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      setUsernameError('Username already exists.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, px: { xs: 1, sm: 0 } }}>
        <Typography variant="h6" sx={{ color: navyText, fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Add Organization
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddBusinessIcon />}
          color="primary"
          onClick={() => setShowOrgAdminForm(show => !show)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            px: { xs: 2, sm: 3 },
            py: 1,
            minHeight: 48,
            fontWeight: 600,
            bgcolor: '#1976d2',
            '&:hover': { bgcolor: '#1565c0' },
          }}
          aria-label={showOrgAdminForm ? 'Hide Form' : 'Create Organization'}
        >
          {showOrgAdminForm ? 'Hide Form' : 'Create Organization'}
        </Button>
      </Box>
      <Typography variant="h6" sx={{ mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
        Pending Access Requests
      </Typography>
      {accessRequests.length === 0 ? (
        <Typography variant="body2" sx={{ color: navyText, fontSize: { xs: '0.85rem', sm: '1rem' } }}>
          No pending access requests.
        </Typography>
      ) : (
        <Box sx={{ mb: 4 }}>
          {accessRequests.map((request) => (
            <Card
              key={request.requestId}
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 3,
                boxShadow: 2,
                cursor: 'pointer',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => handleRequestClick(request)}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: navyText }}>
                {request.orgName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#555' }}>
                Admin: {request.adminName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#555' }}>
                Email: {request.orgEmail}
              </Typography>
              <Typography variant="body2" sx={{ color: '#555' }}>
                Created: {request.createdAt?.toDate()?.toLocaleDateString() || 'N/A'}
              </Typography>
            </Card>
          ))}
        </Box>
      )}
      <Collapse in={showOrgAdminForm}>
        <Paper sx={{
          p: { xs: 2, sm: 3, md: 4 },
          mb: 4,
          background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
          borderRadius: 3,
          boxShadow: 3,
          maxWidth: { xs: '100%', sm: 900 },
          mx: 'auto',
        }}>
          <Typography variant="h5" sx={{ mb: 3, color: navyText, fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Add Organization
          </Typography>
          {errorMsg && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{errorMsg}</Alert>}
          <Typography variant="subtitle1" sx={{ mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="orgName"
                label="Organization Name"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.orgName}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Organization Name' }}
                InputLabelProps={{ required: true }}
              />
              <TextField
                name="email"
                label="Email"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.email}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Email' }}
                InputLabelProps={{ required: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                name="category"
                label="Category"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.category}
                onChange={handleFormChange}
                InputProps={{
                  style: { backgroundColor: '#f5faff', minHeight: 48 },
                  'aria-label': 'Category',
                }}
                InputLabelProps={{ required: true }}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="phoneNumber"
                label="Phone Number"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.phoneNumber}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Phone Number' }}
                InputLabelProps={{ required: true }}
                type="tel"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="website"
                label="Website"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.website}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Website' }}
              />
            </Grid>
          </Grid>
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Address Details
          </Typography>
          <Grid container spacing={2} sx={{ position: 'relative', zIndex: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="address"
                label="Address"
                fullWidth
                sx={{ mb: 2 }}
                value={localOrgForm.address}
                onChange={(e) => setLocalOrgForm({ ...localOrgForm, address: e.target.value })}
                InputProps={{
                  style: { backgroundColor: '#f5faff', minHeight: 48 },
                  'aria-label': 'Address',
                }}
                InputLabelProps={{ required: true }}
              />
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: navyText }}>City</label>
              <Select
                options={cityOptions}
                value={selectedCity}
                onChange={(selected) => {
                  setSelectedCity(selected);
                  setLocalOrgForm((prev) => ({ ...prev, city: selected ? selected.label : '' }));
                }}
                isDisabled={!selectedState}
                placeholder="Select City"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#f5faff',
                    minHeight: 48,
                  }),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: navyText }}>State</label>
              <Select
                options={stateOptions}
                value={selectedState}
                onChange={(selected) => {
                  setSelectedState(selected);
                  setSelectedCity(null);
                  setLocalOrgForm((prev) => ({ ...prev, state: selected ? selected.label : '', city: '' }));
                }}
                isDisabled={!selectedCountry}
                placeholder="Select State"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#f5faff',
                    minHeight: 48,
                  }),
                }}
              />
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 16, display: 'block', color: navyText }}>
                Country
              </label>
              <Select
                options={countryOptions}
                value={selectedCountry}
                onChange={(selected) => {
                  setSelectedCountry(selected);
                  setSelectedState(null);
                  setSelectedCity(null);
                  setLocalOrgForm((prev) => ({ ...prev, country: selected ? selected.label : '', state: '', city: '' }));
                }}
                placeholder="Select Country"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#f5faff',
                    minHeight: 48,
                  }),
                }}
              />
            </Grid>
          </Grid>
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Admin Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="adminName"
                label="Admin Full Name"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.adminName}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Admin Full Name' }}
                InputLabelProps={{ required: true }}
              />
              <TextField
                name="adminEmail"
                label="Admin Email"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.adminEmail}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Admin Email' }}
                InputLabelProps={{ required: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="adminPhoneNumber"
                label="Admin Phone Number"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.adminPhoneNumber}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Admin Phone Number' }}
                InputLabelProps={{ required: true }}
                type="tel"
              />
              <TextField
                name="adminUsername"
                label="Admin Username"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.adminUsername}
                onChange={handleFormChange}
                onBlur={(e) => checkUsername(e.target.value)}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Admin Username' }}
                InputLabelProps={{ required: true }}
                error={!!usernameError}
                helperText={usernameError || 'Username must be 10 or more characters long, include letters, and can only use numbers, periods, or underscores.'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="adminPassword"
                label="Admin Password"
                type="password"
                fullWidth sx={{ mb: 2 }}
                value={orgForm.adminPassword}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Admin Password' }}
                InputLabelProps={{ required: true }}
                helperText="Password must be 6-15 characters long, include at least one uppercase letter, one number, and one special character."
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{
                px: { xs: 3, sm: 5 },
                py: 1,
                minHeight: 48,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
              onClick={() => handleCreateOrgAndAdmin({ ...orgForm, ...localOrgForm })}
              aria-label="Create Organization"
            >
              Create Organization
            </Button>
          </Box>
        </Paper>
      </Collapse>
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        aria-labelledby="success-dialog-title"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2,
            padding: 2,
            minWidth: { xs: 280, sm: 400 },
          },
        }}
      >
        <DialogTitle id="success-dialog-title" sx={{ color: '#001F54', fontWeight: 600 }}>
          Success
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#001F54', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Organization created successfully!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            aria-label="Close"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!selectedRequest}
        onClose={handleApproveDialogClose}
        aria-labelledby="request-details-dialog-title"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2,
            padding: 2,
            minWidth: { xs: '90%', sm: 500 },
          },
        }}
      >
        <DialogTitle id="request-details-dialog-title" sx={{ color: '#001F54', fontWeight: 600 }}>
          Access Request Details
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Organization Details
              </Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Name:</strong> {selectedRequest.orgName}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Category:</strong> {selectedRequest.category}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Email:</strong> {selectedRequest.orgEmail}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Phone:</strong> {selectedRequest.orgPhone}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Website:</strong> {selectedRequest.website || 'N/A'}</Typography>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Address
              </Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Street:</strong> {selectedRequest.address.street}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>City:</strong> {selectedRequest.address.city}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>State:</strong> {selectedRequest.address.state}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Postal Code:</strong> {selectedRequest.address.postalCode}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Country:</strong> {selectedRequest.address.country}</Typography>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Admin Details
              </Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Name:</strong> {selectedRequest.adminName}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Email:</strong> {selectedRequest.adminEmail}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Phone:</strong> {selectedRequest.adminPhone}</Typography>
              <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Created At:</strong> {selectedRequest.createdAt?.toDate()?.toLocaleDateString() || 'N/A'}</Typography>
            </>
          )}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Approve Request
            </Typography>
            <TextField
              name="adminUsername"
              label="Admin Username"
              fullWidth
              sx={{ mb: 2 }}
              value={approveForm.adminUsername}
              onChange={handleApproveFormChange}
              onBlur={(e) => checkApproveUsername(e.target.value)}
              InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Admin Username' }}
              error={!!approveUsernameError}
              helperText={approveUsernameError || 'Username must be 10 or more characters long, include letters, and can only use numbers, periods, or underscores.'}
            />
            <TextField
              name="adminPassword"
              label="Admin Password"
              type="password"
              fullWidth
              sx={{ mb: 2 }}
              value={approveForm.adminPassword}
              onChange={handleApproveFormChange}
              InputProps={{ style: { backgroundColor: '#f5faff', minHeight: 48 }, 'aria-label': 'Admin Password' }}
              helperText="Password must be 6-15 characters long, include at least one uppercase letter, one number, and one special character."
            />
            {approveError && <Alert severity="error" sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{approveError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleApproveDialogClose}
            sx={{ color: '#001F54', textTransform: 'none', fontWeight: 600 }}
            aria-label="Cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApproveSubmit}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            aria-label="Add Organization"
          >
            Add Organization
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- ORGANIZATION LIST ---
const OrganizationListContent = ({ organizations, selectedOrg, setSelectedOrg }) => {
  const navyText = '#001F54';
  return (
    <Box sx={{ width: { xs: '100%', sm: '95%' }, maxWidth: { xs: '100%', md: 900 }, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
        Organization List
      </Typography>
      {selectedOrg ? (
        <Card sx={{
          maxWidth: { xs: '100%', sm: 800 }, mx: 'auto', p: { xs: 2, sm: 3 },
          borderRadius: 3, boxShadow: 3, background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
          transition: 'transform 0.3s ease',
          '&:hover': { transform: 'translateY(-4px)' },
        }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 3, color: navyText, fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {selectedOrg.orgName}
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Name:</strong> {selectedOrg.orgName}</Typography>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Email:</strong> {selectedOrg.email}</Typography>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Field:</strong> {selectedOrg.field}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Phone:</strong> {selectedOrg.phoneNumber}</Typography>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Website:</strong> {selectedOrg.website}</Typography>
              </Grid>
            </Grid>
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Address Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Address:</strong> {selectedOrg.address}</Typography>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>City:</strong> {selectedOrg.city}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>State:</strong> {selectedOrg.state}</Typography>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Country:</strong> {selectedOrg.country}</Typography>
              </Grid>
            </Grid>
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: navyText, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Admin Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Name:</strong> {selectedOrg.adminName}</Typography>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Email:</strong> {selectedOrg.adminEmail}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Phone:</strong> {selectedOrg.adminPhoneNumber}</Typography>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}><strong>Username:</strong> {selectedOrg.adminUsername}</Typography>
              </Grid>
            </Grid>
            <Typography sx={{ mt: 2, fontSize: { xs: '0.85rem', sm: '1rem' } }}>
              <strong>Created At:</strong>{' '}
              {selectedOrg.createdAt?.toDate
                ? selectedOrg.createdAt.toDate().toLocaleDateString()
                : selectedOrg.createdAt instanceof Date
                  ? selectedOrg.createdAt.toLocaleDateString()
                  : 'N/A'}
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              sx={{
                mt: 3,
                borderRadius: 2,
                textTransform: 'none',
                minHeight: 48,
                px: { xs: 2, sm: 3 },
                fontWeight: 600,
              }}
              onClick={() => setSelectedOrg(null)}
              aria-label="Back to List"
            >
              Back to List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {organizations.length === 0 ? (
            <Typography variant="body2" sx={{ color: navyText, fontSize: { xs: '0.85rem', sm: '1rem' } }}>
              No organizations found.
            </Typography>
          ) : (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {organizations.map((org) => (
                  <Card
                    key={org.orgName}
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: 3,
                      boxShadow: 2,
                      cursor: 'pointer',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                    onClick={() => setSelectedOrg(org)}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: navyText }}>{org.orgName}</Typography>
                    <Typography variant="body2" sx={{ color: '#555' }}>Email: {org.email}</Typography>
                    <Typography variant="body2" sx={{ color: '#555' }}>Phone: {org.phoneNumber}</Typography>
                    <Typography variant="body2" sx={{ color: '#555' }}>
                      Address: {`${org.address}, ${org.city}, ${org.state}, ${org.country}`}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#555' }}>Admin: {org.adminName}</Typography>
                    <Typography variant="body2" sx={{ color: '#555' }}>
                      Created: {org.createdAt?.toDate
                        ? org.createdAt.toDate().toLocaleDateString()
                        : org.createdAt instanceof Date
                          ? org.createdAt.toLocaleDateString()
                          : 'N/A'}
                    </Typography>
                  </Card>
                ))}
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3 }}>
                  <Table>
                    <TableHead sx={{ backgroundColor: '#e3f2fd' }}>
                      <TableRow>
                        <TableCell><strong>Organization</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell><strong>Phone</strong></TableCell>
                        <TableCell><strong>Address</strong></TableCell>
                        <TableCell><strong>Admin</strong></TableCell>
                        <TableCell><strong>Created At</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {organizations.map((org) => (
                        <TableRow
                          key={org.orgName}
                          hover
                          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f5faff' } }}
                          onClick={() => setSelectedOrg(org)}
                        >
                          <TableCell>{org.orgName}</TableCell>
                          <TableCell>{org.email}</TableCell>
                          <TableCell>{org.phoneNumber}</TableCell>
                          <TableCell>{`${org.address}, ${org.city}, ${org.state}, ${org.country}`}</TableCell>
                          <TableCell>{org.adminName}</TableCell>
                          <TableCell>
                            {org.createdAt?.toDate
                              ? org.createdAt.toDate().toLocaleDateString()
                              : org.createdAt instanceof Date
                                ? org.createdAt.toLocaleDateString()
                                : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

// --- SETTINGS ---
const SettingsContent = ({
  superAdminInfo,
  setSuperAdminInfo,
  handleProfileChange,
  handleProfileSave,
  profileSaveMsg,
  profileSaveError,
  handlePasswordChange,
  passwordValues,
  showPassword,
  setShowPassword,
  handlePasswordSave,
  passwordSaveMsg,
  passwordSaveError,
  uploading,
  handlePhotoUpload,
  themeMode,
  setThemeMode,
  handleLogout,
  setLogoutDialogOpen
}) => {
  const [openProfile, setOpenProfile] = useState(true);
  const [openPassword, setOpenPassword] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);
  const [openLogout, setOpenLogout] = useState(false);

  return (
    <Box maxWidth={{ xs: '100%', sm: 550 }} mx="auto" sx={{ px: { xs: 1, sm: 0 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: themeMode === 'dark' ? '#fff' : '#001F54', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
        Super Admin Settings
      </Typography>

      <Paper sx={{
        p: 0, mb: 3, borderRadius: 3, boxShadow: 2,
        bgcolor: themeMode === 'dark' ? '#222' : '#f9f9f9',
        transition: 'transform 0.3s ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}>
        <Box
          sx={{
            px: { xs: 2, sm: 3 }, py: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            borderBottom: openProfile ? `1px solid ${themeMode === 'dark' ? '#444' : '#ddd'}` : 'none',
            bgcolor: themeMode === 'dark' ? '#23272b' : '#e3f2fd'
          }}
          onClick={() => setOpenProfile(open => !open)}
          role="button"
          aria-expanded={openProfile}
          aria-label="Toggle Profile Information"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1, color: themeMode === 'dark' ? '#fff' : '#001F54', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Profile Information
          </Typography>
          {openProfile ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={openProfile}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Box sx={{ position: 'relative', width: { xs: 60, sm: 72 }, height: { xs: 60, sm: 72 } }}>
                  <Avatar
                    src={superAdminInfo.profilepic}
                    alt={superAdminInfo.name}
                    sx={{ width: '100%', height: '100%', border: '2px solid #1976d2' }}
                  />
                  <IconButton
                    component="label"
                    sx={{
                      position: 'absolute', bottom: 0, right: 0,
                      bgcolor: '#fff', boxShadow: 1, p: { xs: 0.4, sm: 0.5 }, width: 32, height: 32
                    }}
                    disabled={uploading}
                    aria-label="Upload Profile Photo"
                  >
                    <PhotoCamera fontSize="small" color="primary" />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                  </IconButton>
                </Box>
              </Grid>
              <Grid item xs>
                <TextField
                  label="Name"
                  name="name"
                  value={superAdminInfo.name}
                  onChange={handleProfileChange}
                  fullWidth
                  sx={{ mb: 2 }}
                  InputProps={{
                    style: { backgroundColor: themeMode === 'dark' ? '#111' : '#f5faff', minHeight: 48, color: themeMode === 'dark' ? '#fff' : undefined },
                    'aria-label': 'Name'
                  }}
                />
                <TextField
                  label="Email"
                  name="email"
                  value={superAdminInfo.email}
                  onChange={handleProfileChange}
                  fullWidth
                  sx={{ mb: 2 }}
                  InputProps={{
                    style: { backgroundColor: themeMode === 'dark' ? '#111' : '#f5faff', minHeight: 48, color: themeMode === 'dark' ? '#fff' : undefined },
                    'aria-label': 'Email'
                  }}
                />
              </Grid>
            </Grid>
            {profileSaveError && <Alert severity="error" sx={{ mt: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{profileSaveError}</Alert>}
            {profileSaveMsg && <Alert severity="success" sx={{ mt: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{profileSaveMsg}</Alert>}
            <Button
              variant="contained"
              color="primary"
              onClick={handleProfileSave}
              sx={{
                mt: 2,
                fontWeight: 600,
                px: { xs: 3, sm: 4 },
                minHeight: 48,
                borderRadius: 2,
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
              disabled={uploading}
              aria-label="Save Profile"
            >
              {uploading ? 'Saving...' : 'Save Profile'}
            </Button>
          </Box>
        </Collapse>
      </Paper>

      <Paper sx={{
        p: 0, mb: 3, borderRadius: 3, boxShadow: 2,
        bgcolor: themeMode === 'dark' ? '#222' : '#f9f9f9',
        transition: 'transform 0.3s ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}>
        <Box
          sx={{
            px: { xs: 2, sm: 3 }, py: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            borderBottom: openPassword ? `1px solid ${themeMode === 'dark' ? '#444' : '#ddd'}` : 'none',
            bgcolor: themeMode === 'dark' ? '#23272b' : '#e3f2fd'
          }}
          onClick={() => setOpenPassword(open => !open)}
          role="button"
          aria-expanded={openPassword}
          aria-label="Toggle Change Password"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1, color: themeMode === 'dark' ? '#fff' : '#001F54', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Change Password
          </Typography>
          {openPassword ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={openPassword}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <TextField
              label="Current Password"
              name="currentPassword"
              type={showPassword ? 'text' : 'password'}
              value={passwordValues.currentPassword}
              onChange={handlePasswordChange}
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                style: { backgroundColor: themeMode === 'dark' ? '#111' : '#f5faff', minHeight: 48, color: themeMode === 'dark' ? '#fff' : undefined },
                'aria-label': 'Current Password'
              }}
            />
            <TextField
              label="New Password"
              name="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={passwordValues.newPassword}
              onChange={handlePasswordChange}
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                style: { backgroundColor: themeMode === 'dark' ? '#111' : '#f5faff', minHeight: 48, color: themeMode === 'dark' ? '#fff' : undefined },
                'aria-label': 'New Password'
              }}
            />
            <TextField
              label="Confirm New Password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={passwordValues.confirmPassword}
              onChange={handlePasswordChange}
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                style: { backgroundColor: themeMode === 'dark' ? '#111' : '#f5faff', minHeight: 48, color: themeMode === 'dark' ? '#fff' : undefined },
                'aria-label': 'Confirm New Password'
              }}
              helperText="Password must be 6-15 characters long, include at least one uppercase letter, one number, and one special character."
            />
            {passwordSaveError && <Alert severity="error" sx={{ mt: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{passwordSaveError}</Alert>}
            {passwordSaveMsg && <Alert severity="success" sx={{ mt: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{passwordSaveMsg}</Alert>}
            <Button
              variant="contained"
              color="primary"
              onClick={handlePasswordSave}
              sx={{
                mt: 2,
                fontWeight: 600,
                px: { xs: 3, sm: 4 },
                minHeight: 48,
                borderRadius: 2,
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
              aria-label="Change Password"
            >
              Change Password
            </Button>
          </Box>
        </Collapse>
      </Paper>

      <Paper sx={{
        p: 0, mb: 3, borderRadius: 3, boxShadow: 2,
        bgcolor: themeMode === 'dark' ? '#222' : '#f9f9f9',
        transition: 'transform 0.3s ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}>
        <Box
          sx={{
            px: { xs: 2, sm: 3 }, py: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            borderBottom: openTheme ? `1px solid ${themeMode === 'dark' ? '#444' : '#ddd'}` : 'none',
            bgcolor: themeMode === 'dark' ? '#23272b' : '#e3f2fd'
          }}
          onClick={() => setOpenTheme(open => !open)}
          role="button"
          aria-expanded={openTheme}
          aria-label="Toggle Theme Settings"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1, color: themeMode === 'dark' ? '#fff' : '#001F54', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Theme / Branding
          </Typography>
          {openTheme ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={openTheme}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={themeMode === 'dark'}
                  onChange={() => setThemeMode(m => (m === 'dark' ? 'light' : 'dark'))}
                  color="primary"
                />
              }
              label={themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            />
          </Box>
        </Collapse>
      </Paper>

      <Paper sx={{
        p: 0, mb: 3, borderRadius: 3, boxShadow: 2,
        bgcolor: themeMode === 'dark' ? '#222' : '#f9f9f9',
        transition: 'transform 0.3s ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}>
        <Box
          sx={{
            px: { xs: 2, sm: 3 }, py: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            borderBottom: openLogout ? `1px solid ${themeMode === 'dark' ? '#444' : '#ddd'}` : 'none',
            bgcolor: themeMode === 'dark' ? '#23272b' : '#e3f2fd'
          }}
          onClick={() => setOpenLogout(open => !open)}
          role="button"
          aria-expanded={openLogout}
          aria-label="Toggle Logout"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1, color: themeMode === 'dark' ? '#fff' : '#001F54', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Logout
          </Typography>
          {openLogout ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={openLogout}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={() => setLogoutDialogOpen(true)}
              sx={{
                fontWeight: 600,
                px: { xs: 3, sm: 4 },
                minHeight: 48,
                borderRadius: 2,
              }}
              aria-label="Logout"
            >
              Logout
            </Button>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

// --- FOOTER ---


// --- MAIN DASHBOARD ---
const SuperAdminDashboard = () => {
  const [themeMode, setThemeMode] = useState('light');
  const [superAdminInfo, setSuperAdminInfo] = useState({
    name: '', email: '', username: '', profilepic: '', password: '', docId: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSaveMsg, setProfileSaveMsg] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaveMsg, setPasswordSaveMsg] = useState('');
  const [passwordSaveError, setPasswordSaveError] = useState('');
  const [selectedPage, setSelectedPage] = useState('Dashboard');
  const [showOrgAdminForm, setShowOrgAdminForm] = useState(true);
  const [orgForm, setOrgForm] = useState({
    orgName: '', email: '', field: '', phoneNumber: '', website: '',
    address: '', city: '', state: '', country: '',
    adminName: '', adminEmail: '', adminPhoneNumber: '', adminUsername: '', adminPassword: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [adminCount, setAdminCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate
  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  useEffect(() => {
    const fetchSuperAdmin = async () => {
      setLoadingProfile(true);
      const usersSnap = await getDocs(collection(db, 'Users'));
      let found = false;
      usersSnap.forEach((docu) => {
        const d = docu.data();
        if (d.role && d.role.toLowerCase() === 'superadmin') {
          setSuperAdminInfo({
            name: d.adminName || d.name || '',
            email: d.adminEmail || d.email || '',
            username: d.username || '',
            profilepic: d.profilepic || '',
            password: d.password || '',
            docId: docu.id
          });
          found = true;
        }
      });
      setLoadingProfile(false);
      if (!found) setSuperAdminInfo({ name: '', email: '', username: '', profilepic: '', password: '', docId: null });
    };

    const fetchAccessRequests = async () => {
      const requestsSnap = await getDocs(collection(db, 'accessRequests'));
      const requests = requestsSnap.docs
        .map(doc => ({ requestId: doc.id, ...doc.data() }))
        .filter(request => request.status === 'Pending');
      setAccessRequests(requests);
    };

    fetchSuperAdmin();
    fetchAccessRequests();
  }, []);

  useEffect(() => {
    const fetchOrgsAndAdmins = async () => {
      const orgSnap = await getDocs(collection(db, 'Organizations'));
      setOrganizations(orgSnap.docs.map(d => ({ orgName: d.id, ...d.data() })));

      const usersSnap = await getDocs(collection(db, 'Users'));
      let adminC = 0;
      usersSnap.forEach(u => {
        if (
          (u.data().role && u.data().role.toLowerCase() === 'admin') ||
          (u.data().username && u.data().username.toLowerCase().includes('admin'))
        ) {
          adminC++;
        }
      });
      setAdminCount(adminC);
    };
    if (selectedPage === 'Dashboard' || selectedPage === 'Add Organization' || selectedPage === 'Organization List') {
      fetchOrgsAndAdmins();
    }
  }, [selectedPage]);

  const handleProfileChange = (e) => {
    setSuperAdminInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setProfileSaveMsg('');
    setProfileSaveError('');
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    localStorage.clear(); // Clear localStorage as per comment
    navigate('/'); // Navigate to SplashScreen as per comment
  };

  const handleProfileSave = async () => {
    setProfileSaveMsg('');
    setProfileSaveError('');
    if (!superAdminInfo.name || !superAdminInfo.email) {
      setProfileSaveError('Name and email are required.');
      return;
    }
    if (!superAdminInfo.docId) {
      setProfileSaveError('Super admin not found.');
      return;
    }
    setUploading(true);
    try {
      await updateDoc(doc(db, 'Users', superAdminInfo.docId), {
        adminName: superAdminInfo.name,
        adminEmail: superAdminInfo.email,
        profilepic: superAdminInfo.profilepic
      });
      setProfileSaveMsg('Profile saved successfully!');
    } catch (err) {
      setProfileSaveError('Error saving profile: ' + err.message);
    }
    setUploading(false);
  };

  const handlePhotoUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      setProfileSaveMsg('');
      setProfileSaveError('');
      const file = e.target.files[0];
      if (file.size > 750 * 1024) {
        setProfileSaveError('File size exceeds 750KB limit.');
        setUploading(false);
        return;
      }
      try {
        const base64 = await toBase64(file);
        setSuperAdminInfo(prev => ({ ...prev, profilepic: base64 }));
      } catch (err) {
        setProfileSaveError('Image processing error: ' + err.message);
      }
      setUploading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordValues({ ...passwordValues, [e.target.name]: e.target.value });
    setPasswordSaveMsg('');
    setPasswordSaveError('');
  };

  const handlePasswordSave = async () => {
    setPasswordSaveMsg('');
    setPasswordSaveError('');
    if (!passwordValues.currentPassword || !passwordValues.newPassword || !passwordValues.confirmPassword) {
      setPasswordSaveError('Please fill all fields.');
      return;
    }
    if (passwordValues.newPassword !== passwordValues.confirmPassword) {
      setPasswordSaveError('New password and confirm password do not match.');
      return;
    }
    if (!isValidPassword(passwordValues.newPassword)) {
      setPasswordSaveError('Password must be 6-15 characters long, include at least one uppercase letter, one number, and one special character.');
      return;
    }
    if (!superAdminInfo.docId) {
      setPasswordSaveError('Super admin not found.');
      return;
    }
    if (passwordValues.currentPassword !== superAdminInfo.password) {
      setPasswordSaveError('Current password is incorrect.');
      return;
    }
    try {
      await updateDoc(doc(db, 'Users', superAdminInfo.docId), {
        password: passwordValues.newPassword,
      });
      setPasswordSaveMsg('Password changed successfully!');
      setSuperAdminInfo(prev => ({
        ...prev,
        password: passwordValues.newPassword
      }));
      setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordSaveError('Error updating password: ' + err.message);
    }
  };


  const handleFormChange = (e) => {
    setOrgForm({ ...orgForm, [e.target.name]: e.target.value });
    setErrorMsg('');
    setOpenDialog(false);
  };

  const handleCreateOrgAndAdmin = async (combinedForm) => {
    const {
      orgName, email, category: field, phoneNumber, website,
      address, city, state, country,
      adminName, adminEmail, adminPhoneNumber, adminUsername, adminPassword
    } = combinedForm;

    if (!orgName || !email || !field || !phoneNumber || !address || !state || !country ||
      !adminName || !adminEmail || !adminPhoneNumber || !adminUsername || !adminPassword) {
      setErrorMsg('Please fill all required fields');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber) || !phoneRegex.test(adminPhoneNumber)) {
      setErrorMsg('Please enter valid phone numbers (e.g., +1234567890).');
      return;
    }

    if (!isValidUsername(adminUsername)) {
      setErrorMsg('Username must be 10 or more characters long, include letters, and can only use numbers, periods, or underscores.');
      return;
    }

    if (!isValidPassword(adminPassword)) {
      setErrorMsg('Password must be 6-15 characters long, include at least one uppercase letter, one number, and one special character.');
      return;
    }

    const adminRef = doc(db, 'Users', adminUsername.toLowerCase());
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      setErrorMsg('Username already exists.');
      return;
    }

    try {
      const createdAt = new Date();
      await setDoc(doc(db, 'Organizations', orgName), {
        orgName, email, field, phoneNumber, website,
        address, city, state, country,
        adminName, adminEmail, adminPhoneNumber, adminUsername, createdAt
      });
      await setDoc(adminRef, {
        username: adminUsername.toLowerCase(),
        password: adminPassword,
        orgName,
        role: 'admin',
        adminName,
        adminEmail,
        adminPhoneNumber,
        createdAt,
        passwordChange: true
      });

      setOrgForm({
        orgName: '', email: '', field: '', phoneNumber: '', website: '',
        address: '', city: '', state: '', country: '',
        adminName: '', adminEmail: '', adminPhoneNumber: '', adminUsername: '', adminPassword: ''
      });
      setOrganizations(prev => [...prev, {
        orgName, email, field, phoneNumber, website,
        address, city, state, country,
        adminName, adminEmail, adminPhoneNumber, adminUsername, createdAt
      }]);
      setOpenDialog(true);
      setAdminCount(c => c + 1);
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    }
  };

  const handleApproveRequest = async (request, adminUsername, adminPassword) => {
    const {
      orgName, category: field, orgEmail: email, orgPhone: phoneNumber, website,
      address: { street: address, city, state, country },
      adminName, adminEmail, adminPhone
    } = request;

    const phoneRegex = /^\+?[1-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber) || !phoneRegex.test(adminPhone)) {
      setErrorMsg('Please enter valid phone numbers (e.g., +1234567890).');
      return;
    }

    const adminRef = doc(db, 'Users', adminUsername.toLowerCase());
    const orgRef = doc(db, 'Organizations', orgName);

    try {
      const createdAt = new Date();
      await setDoc(orgRef, {
        orgName, email, field, phoneNumber, website,
        address, city, state, country,
        adminName, adminEmail, adminPhoneNumber: adminPhone, adminUsername, createdAt
      });
      await setDoc(adminRef, {
        username: adminUsername.toLowerCase(),
        password: adminPassword,
        orgName,
        role: 'admin',
        adminName,
        adminEmail,
        adminPhoneNumber: adminPhone,
        createdAt,
        passwordChange: true
      });
      await updateDoc(doc(db, 'accessRequests', request.requestId), {
        status: 'Approved',
        approvedAt: Timestamp.now()
      });

      setOrganizations(prev => [...prev, {
        orgName, email, field, phoneNumber, website,
        address, city, state, country,
        adminName, adminEmail, adminPhoneNumber: adminPhone, adminUsername, createdAt
      }]);
      setAccessRequests(prev => prev.filter(r => r.requestId !== request.requestId));
      setAdminCount(c => c + 1);
      setOpenDialog(true);
    } catch (err) {
      throw new Error('Error approving request: ' + err.message);
    }
  };

  const renderContent = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return (
          <DashboardContent
            organizations={organizations}
            adminCount={adminCount}
            themeMode={themeMode}
          />
        );


      case 'Add Organization':
        return (
          <AddOrganizationContent
            orgForm={orgForm}
            handleFormChange={handleFormChange}
            handleCreateOrgAndAdmin={handleCreateOrgAndAdmin}
            showOrgAdminForm={showOrgAdminForm}
            setShowOrgAdminForm={setShowOrgAdminForm}
            errorMsg={errorMsg}
            openDialog={openDialog}
            setOpenDialog={setOpenDialog}
            accessRequests={accessRequests}
            setAccessRequests={setAccessRequests}
            handleApproveRequest={handleApproveRequest}
          />
        );
      case 'Organization List':
        return (
          <OrganizationListContent
            organizations={organizations}
            selectedOrg={selectedOrg}
            setSelectedOrg={setSelectedOrg}
          />
        );
      case 'Settings':
        return (
          <>
            <SettingsContent
              superAdminInfo={superAdminInfo}
              setSuperAdminInfo={setSuperAdminInfo}
              handleProfileChange={handleProfileChange}
              handleProfileSave={handleProfileSave}
              profileSaveMsg={profileSaveMsg}
              profileSaveError={profileSaveError}
              handlePasswordChange={handlePasswordChange}
              passwordValues={passwordValues}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              handlePasswordSave={handlePasswordSave}
              passwordSaveMsg={passwordSaveMsg}
              passwordSaveError={passwordSaveError}
              uploading={uploading}
              handlePhotoUpload={handlePhotoUpload}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              handleLogout={handleLogout}
              setLogoutDialogOpen={setLogoutDialogOpen}
            />
            <Dialog
              open={logoutDialogOpen}
              onClose={() => setLogoutDialogOpen(false)}
              aria-labelledby="logout-dialog-title"
            >
              <DialogTitle id="logout-dialog-title">Confirm Logout</DialogTitle>
              <DialogContent>
                <Typography>Are you sure you want to logout?</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setLogoutDialogOpen(false)} color="primary">
                  Cancel
                </Button>
                <Button
                  onClick={confirmLogout}
                  color="error"
                  variant="contained"
                >
                  Logout
                </Button>
              </DialogActions>
            </Dialog>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      bgcolor: themeMode === 'dark' ? '#151a21' : '#f8f9fa',
      overflowX: 'hidden',
    }}>
      {/* Sidebar for Mobile (Drawer) */}
      <Drawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            bgcolor: themeMode === 'dark' ? '#181c23' : '#111',
            p: 2,
            boxSizing: 'border-box',
          },
        }}
      >
        <Typography variant="h5" sx={{
          color: themeMode === 'dark' ? '#fff' : '#fff',
          mb: 2, fontWeight: 700, letterSpacing: 1.2, px: 2
        }}>
          Super Admin
        </Typography>
        <Divider sx={{ bgcolor: '#444', mb: 2 }} />
        <List>
          {sidebarItems.map(item => (
            <ListItem
              button
              key={item.text}
              selected={selectedPage === item.text}
              onClick={() => {
                if (item.text === 'Logout') {
                  handleLogout();
                } else {
                  setSelectedPage(item.text);
                  if (item.text !== 'Organization List') setSelectedOrg(null);
                }
                setSidebarOpen(false);
              }}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                '&.Mui-selected': {
                  backgroundColor: themeMode === 'dark' ? '#263238' : '#333',
                  '&:hover': { backgroundColor: themeMode === 'dark' ? '#37474f' : '#444' },
                },
                '&:hover': { backgroundColor: themeMode === 'dark' ? '#263238' : '#222' },
                mb: 1,
              }}
              aria-label={item.text}
            >
              <ListItemIcon sx={{ color: selectedPage === item.text ? '#2196f3' : '#ccc', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  color: selectedPage === item.text ? '#2196f3' : (themeMode === 'dark' ? '#fff' : '#ccc'),
                  fontWeight: 600
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Sidebar for Desktop */}
      <Box sx={{
        width: SIDEBAR_WIDTH,
        bgcolor: themeMode === 'dark' ? '#181c23' : '#111',
        p: 2,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1200,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column'
      }}>
        <Typography variant="h5" sx={{
          color: themeMode === 'dark' ? '#fff' : '#fff',
          mb: 2, fontWeight: 700, letterSpacing: 1.2
        }}>
          Super Admin
        </Typography>
        <Divider sx={{ bgcolor: '#444', mb: 2 }} />
        <List sx={{ flexGrow: 1 }}>
          {sidebarItems.map(item => (
            <ListItem
              button
              key={item.text}
              selected={selectedPage === item.text}
              onClick={() => {
                if (item.text === 'Logout') {
                  handleLogout();
                } else {
                  setSelectedPage(item.text);
                  if (item.text !== 'Organization List') setSelectedOrg(null);
                }
              }}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                '&.Mui-selected': {
                  backgroundColor: themeMode === 'dark' ? '#263238' : '#333',
                  '&:hover': { backgroundColor: themeMode === 'dark' ? '#37474f' : '#444' },
                },
                '&:hover': { backgroundColor: themeMode === 'dark' ? '#263238' : '#222' },
                mb: 1
              }}
              aria-label={item.text}
            >
              <ListItemIcon sx={{ color: selectedPage === item.text ? '#2196f3' : '#ccc', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  color: selectedPage === item.text ? '#2196f3' : (themeMode === 'dark' ? '#fff' : '#ccc'),
                  fontWeight: 600
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Content and Footer */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
          width: { xs: '100%', md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{
          display: { xs: 'flex', md: 'none' },
          p: 2,
          bgcolor: themeMode === 'dark' ? '#181c23' : '#111',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}>
          <IconButton onClick={() => setSidebarOpen(true)} aria-label="Open Sidebar">
            <MenuIcon sx={{ color: '#fff' }} />
          </IconButton>
        </Box>
        <Box sx={{
          flex: 1, p: { xs: 2, sm: 3 },
          overflowY: 'auto', width: '100%', boxSizing: 'border-box'
        }}>
          {loadingProfile && selectedPage === 'Settings'
            ? <Typography>Loading...</Typography>
            : renderContent()}
        </Box>

      </Box>
    </Box>
  );
};
export default SuperAdminDashboard;