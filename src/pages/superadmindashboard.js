import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Grid, List, ListItem,
  ListItemIcon, ListItemText, Divider, TextField, Collapse,
  Alert, Table, TableContainer, TableBody, TableCell,
  TableHead, TableRow, Card, CardContent, Link
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListIcon from '@mui/icons-material/List';
import SettingsIcon from '@mui/icons-material/Settings';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import GitHubIcon from '@mui/icons-material/GitHub';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const SIDEBAR_WIDTH = 240;

const sidebarItems = [
  { text: 'Dashboard', icon: <DashboardIcon /> },
  { text: 'Add Organization', icon: <AddBusinessIcon /> },
  { text: 'Organization List', icon: <ListIcon /> },
  { text: 'Settings', icon: <SettingsIcon /> },
];

// --- CHART COMPONENT ---
const OrganizationFieldBarChart = ({ organizations }) => {
  // Group organizations by field
  const fieldCount = {};
  organizations.forEach((org) => {
    const field = org.field || 'Unknown';
    fieldCount[field] = (fieldCount[field] || 0) + 1;
  });
  const data = Object.entries(fieldCount).map(([field, count]) => ({
    field,
    count,
  }));

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography>No data to display.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#001F54' }}>
        Organizations by Field
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="field" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#2196f3" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

// --- ADD ORGANIZATION ---
const AddOrganizationContent = ({
  orgForm, handleFormChange, handleCreateOrgAndAdmin,
  showOrgAdminForm, setShowOrgAdminForm, errorMsg, successMsg
}) => {
  const navyText = '#001F54';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: navyText }}>Add Organization</Typography>
        <Button
          variant="contained"
          startIcon={<AddBusinessIcon />}
          color="primary"
          onClick={() => setShowOrgAdminForm(show => !show)}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1.5 }}
        >
          {showOrgAdminForm ? 'Hide Form' : 'Create Organization'}
        </Button>
      </Box>

      <Collapse in={showOrgAdminForm}>
        <Paper sx={{
          p: 4, mb: 4, background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
          borderRadius: 3, boxShadow: 3, maxWidth: 900, mx: 'auto',
        }}>
          <Typography variant="h5" sx={{ mb: 3, color: navyText, fontWeight: 600 }}>
            Add Organization
          </Typography>
          {errorMsg && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorMsg}</Alert>}
          {successMsg && (
            <Alert severity="info" sx={{ mb: 2, backgroundColor: '#e3f2fd', color: '#0d47a1', borderRadius: 2 }}>
              {successMsg}
            </Alert>
          )}

          {/* Basic Information */}
          <Typography variant="subtitle1" sx={{ mb: 2, color: navyText, fontWeight: 600 }}>
            Basic Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="orgName"
                label="Organization Name"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.orgName}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
              <TextField
                name="email"
                label="Email"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.email}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="field"
                label="Field"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.field}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
              <TextField
                name="phoneNumber"
                label="Phone Number"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.phoneNumber}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="website"
                label="Website"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.website}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
            </Grid>
          </Grid>

          {/* Address Details */}
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: navyText, fontWeight: 600 }}>
            Address Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="address"
                label="Address"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.address}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
              <TextField
                name="city"
                label="City"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.city}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="state"
                label="State"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.state}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
              <TextField
                name="country"
                label="Country"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.country}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
            </Grid>
          </Grid>

          {/* Admin Details */}
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: navyText, fontWeight: 600 }}>
            Admin Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="adminName"
                label="Admin Full Name"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.adminName}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
              <TextField
                name="adminEmail"
                label="Admin Email"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.adminEmail}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="adminPhoneNumber"
                label="Admin Phone Number"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.adminPhoneNumber}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
              <TextField
                name="adminUsername"
                label="Admin Username"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.adminUsername}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="adminPassword"
                label="Admin Password"
                type="password"
                fullWidth
                sx={{ mb: 2 }}
                value={orgForm.adminPassword}
                onChange={handleFormChange}
                InputProps={{ style: { backgroundColor: '#f5faff' } }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{ px: 5, py: 1.5, borderRadius: 2, textTransform: 'none' }}
              onClick={handleCreateOrgAndAdmin}
            >
              Create Organization
            </Button>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

// --- ORGANIZATION LIST ---
const OrganizationListContent = ({ organizations, selectedOrg, setSelectedOrg }) => {
  const navyText = '#001F54';

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 'calc(100vw - 280px)' }, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2, color: navyText }}>Organization List</Typography>
      {selectedOrg ? (
        <Card sx={{
          maxWidth: 900,
          mx: 'auto',
          p: 3,
          borderRadius: 3,
          boxShadow: 3,
          background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
        }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 3, color: navyText, fontWeight: 600 }}>
              {selectedOrg.orgName}
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 2, color: navyText, fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography><strong>Name:</strong> {selectedOrg.orgName}</Typography>
                <Typography><strong>Email:</strong> {selectedOrg.email}</Typography>
                <Typography><strong>Field:</strong> {selectedOrg.field}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography><strong>Phone:</strong> {selectedOrg.phoneNumber}</Typography>
                <Typography><strong>Website:</strong> {selectedOrg.website}</Typography>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: navyText, fontWeight: 600 }}>
              Address Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography><strong>Address:</strong> {selectedOrg.address}</Typography>
                <Typography><strong>City:</strong> {selectedOrg.city}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography><strong>State:</strong> {selectedOrg.state}</Typography>
                <Typography><strong>Country:</strong> {selectedOrg.country}</Typography>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, color: navyText, fontWeight: 600 }}>
              Admin Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography><strong>Name:</strong> {selectedOrg.adminName}</Typography>
                <Typography><strong>Email:</strong> {selectedOrg.adminEmail}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography><strong>Phone:</strong> {selectedOrg.adminPhoneNumber}</Typography>
                <Typography><strong>Username:</strong> {selectedOrg.adminUsername}</Typography>
              </Grid>
            </Grid>
            <Typography sx={{ mt: 2 }}>
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
              sx={{ mt: 3, borderRadius: 2, textTransform: 'none' }}
              onClick={() => setSelectedOrg(null)}
            >
              Back to List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {organizations.length === 0 ? (
            <Typography variant="body2" sx={{ color: navyText }}>No organizations found.</Typography>
          ) : (
            <Box sx={{ width: '100%', overflowX: 'auto', mt: 2 }}>
              <TableContainer component={Paper} elevation={3} sx={{ minWidth: 800 }}>
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
                        sx={{ cursor: 'pointer' }}
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
          )}
        </>
      )}
    </Box>
  );
};

// --- FOOTER ---
const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#111',
        color: '#ccc',
        p: 4,
        width: '100%',
        mt: 'auto',
      }}
    >
      <Grid container spacing={4}>
        {/* Copyright */}
        <Grid item xs={12} sm={3}>
          <Typography variant="body2" sx={{ color: '#fff', mb: 2 }}>
            © {new Date().getFullYear()} Helpmate. All rights reserved.
          </Typography>
        </Grid>

        {/* Navigation Links */}
        <Grid item xs={12} sm={3}>
          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
            Navigation
          </Typography>
          <Link
            href="/about-us"
            sx={{
              color: '#ccc',
              textDecoration: 'none',
              '&:hover': { color: '#2196f3', textDecoration: 'underline' },
            }}
          >
            About Us
          </Link>
          <br />
          <Link
            href="/privacy-policy"
            sx={{
              color: '#ccc',
              textDecoration: 'none',
              mt: 1,
              display: 'inline-block',
              '&:hover': { color: '#2196f3', textDecoration: 'underline' },
            }}
          >
            Privacy Policy
          </Link>
        </Grid>

        {/* Contact Us */}
        <Grid item xs={12} sm={3}>
          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
            Contact Us
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Email:</strong> support@helpmate.com
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Phone:</strong> +91 76755465645
          </Typography>
          <Typography variant="body2">
            <strong>Address:</strong> Helpmate St, Suite 100, Koramangala, Bengaluru, Karnataka, India-560034
          </Typography>
        </Grid>

        {/* Social Media Icons */}
        <Grid item xs={12} sm={3}>
          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
            Follow Us
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="https://instagram.com/helpmate" target="_blank" sx={{ color: '#ccc', '&:hover': { color: '#2196f3' } }}>
              <InstagramIcon />
            </Link>
            <Link href="https://x.com/helpmate" target="_blank" sx={{ color: '#ccc', '&:hover': { color: '#2196f3' } }}>
              <TwitterIcon />
            </Link>
            <Link href="https://github.com/helpmate" target="_blank" sx={{ color: '#ccc', '&:hover': { color: '#2196f3' } }}>
              <GitHubIcon />
            </Link>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

// --- MAIN DASHBOARD ---
const SuperAdminDashboard = () => {
  const [selectedPage, setSelectedPage] = useState('Dashboard');
  const [showOrgAdminForm, setShowOrgAdminForm] = useState(true);
  const [orgForm, setOrgForm] = useState({
    orgName: '', email: '', field: '', phoneNumber: '', website: '',
    address: '', city: '', state: '', country: '',
    adminName: '', adminEmail: '', adminPhoneNumber: '', adminUsername: '', adminPassword: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    if (selectedPage === 'Add Organization' || selectedPage === 'Organization List' || selectedPage === 'Dashboard') {
      const fetchOrgs = async () => {
        const snap = await getDocs(collection(db, 'Organizations'));
        setOrganizations(snap.docs.map(d => ({ orgName: d.id, ...d.data() })));
      };
      fetchOrgs();
    }
  }, [selectedPage]);

  const handleFormChange = (e) => {
    setOrgForm({ ...orgForm, [e.target.name]: e.target.value });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCreateOrgAndAdmin = async () => {
    const {
      orgName, email, field, phoneNumber, website,
      address, city, state, country,
      adminName, adminEmail, adminPhoneNumber, adminUsername, adminPassword
    } = orgForm;

    if (!orgName || !email || !field || !phoneNumber || !website ||
        !address || !city || !state || !country ||
        !adminName || !adminEmail || !adminPhoneNumber || !adminUsername || !adminPassword) {
      setErrorMsg('Please fill all fields');
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
        createdAt
      });

      setOrgForm({
        orgName: '', email: '', field: '', phoneNumber: '', website: '',
        address: '', city: '', state: '', country: '',
        adminName: '', adminEmail: '', adminPhoneNumber: '', adminUsername: '', adminPassword: ''
      });
      setShowOrgAdminForm(false);
      setOrganizations(prev => [...prev, {
        orgName, email, field, phoneNumber, website,
        address, city, state, country,
        adminName, adminEmail, adminPhoneNumber, adminUsername, createdAt
      }]);
      setSuccessMsg('Organization created successfully!');
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    }
  };

  const renderContent = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return (
          <Box>
            <OrganizationFieldBarChart organizations={organizations} />
            {/* Add more graphs or summary stats here as needed */}
          </Box>
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
            successMsg={successMsg}
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
        return <Paper sx={{ p: 3, mb: 4 }}><Typography>Settings coming soon...</Typography></Paper>;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Sidebar */}
      <Box sx={{
        width: SIDEBAR_WIDTH,
        bgcolor: '#111',
        p: 2,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Typography variant="h5" sx={{ color: '#fff', mb: 2 }}>Super Admin</Typography>
        <Divider sx={{ bgcolor: '#444', mb: 2 }} />
        <List sx={{ flexGrow: 1 }}>
          {sidebarItems.map(item => (
            <ListItem
              button
              key={item.text}
              selected={selectedPage === item.text}
              onClick={() => {
                setSelectedPage(item.text);
                if (item.text !== 'Organization List') setSelectedOrg(null);
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: '#333',
                  '&:hover': { backgroundColor: '#444' },
                },
                '&:hover': { backgroundColor: '#222' },
              }}
            >
              <ListItemIcon sx={{ color: selectedPage === item.text ? '#2196f3' : '#ccc' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{ color: selectedPage === item.text ? '#2196f3' : '#ccc' }}
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
          ml: `${SIDEBAR_WIDTH}px`, // keep content away from sidebar
          width: { xs: '100%', md: `calc(100vw - ${SIDEBAR_WIDTH}px)` },
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto', width: '100%', boxSizing: 'border-box' }}>
          {renderContent()}
        </Box>
        {/* Footer always at the bottom */}
        <Footer />
      </Box>
    </Box>
  );
};

export default SuperAdminDashboard;