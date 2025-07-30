import React, { useEffect, useState, useMemo } from "react";
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Divider,
  Card, CardContent, TextField, InputAdornment, Table, TableContainer, TableCell, TableBody, TableHead, TableRow,
  Paper, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Collapse, useTheme, useMediaQuery, Select, MenuItem,
  Fade
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import GroupIcon from "@mui/icons-material/Group";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import BusinessIcon from "@mui/icons-material/Business"; // Icon for Manage Department
import SettingsIcon from "@mui/icons-material/Settings";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import Knowledge from "../Admin/knowledge.js";
import DisplayTickets from "./displayticket";
import Manage from "./manage.js";
import EscalationAlert from "./alerts.js";
import Report from "./graphs.js";

const NAVY = "#1A2A6C";
const WHITE = "#FFF";
const LIGHT_GREY = "#f4f6f8";
const SELECT_BG = "#28396a";

const navItems = [
  { text: "Home", icon: <HomeIcon /> },
  { text: "Users", icon: <GroupIcon /> },
  { text: "Agents", icon: <SupervisorAccountIcon /> },
  { text: "Tickets", icon: <AssignmentIcon /> },
  { text: "Reports", icon: <AssessmentIcon /> },
  { text: "Knowledge Base", icon: <LibraryBooksIcon /> },
  { text: "Manage Department", icon: <BusinessIcon /> }, // New item
  { text: "SLA Settings", icon: <SettingsIcon /> }, // New item
];

const statusMapping = {
  pending: "pending",
  open: "open",
  inProgress: "in progress",
  resolved: "resolved",
  closed: "closed"
};

const AdminDashboard = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [search, setSearch] = useState({ user: "", agent: "", ticket: "", organization: "" });
  const [sort, setSort] = useState({ user: { field: "username", order: "asc" }, agent: { field: "username", order: "asc" }, organization: { field: "orgname", order: "asc" } });
  const [sortOrders, setSortOrders] = useState({ pending: "desc", open: "desc", inProgress: "desc", resolved: "desc", closed: "desc" });
  const [dialogs, setDialogs] = useState({ logout: false, addUser: false, addAgent: false, addOrganization: false });
  const [adminData, setAdminData] = useState({ username: "", orgName: "" });
  const [formData, setFormData] = useState({ name: "", username: "", password: "", orgName: "", department: "", orgname: "", address: "", description: "", field: "", orgadmin_name: "" });
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // <600px
  const drawerWidth = isMobile ? 200 : 240;
  const handleUserDialogClose = () => setSelectedUser(null);
  const handleAgentDialogClose = () => setSelectedAgent(null);
  const [departments, setDepartments] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentAdminUsername = sessionStorage.getItem('username');
        if (!currentAdminUsername) {
          setMessage("No admin username found in session. Please log in again.");
          navigate("/");
          return;
        }
        const adminDoc = await getDoc(doc(db, "Users", currentAdminUsername));
        let adminOrgName = "Unknown Organization";
        if (adminDoc.exists()) {
          const orgName = adminDoc.data().orgName || "Unknown Organization";
          setAdminData({
            username: adminDoc.data().username || currentAdminUsername,
            orgName
          });
          adminOrgName = orgName;
          const orgDoc = await getDoc(doc(db, "Organizations", adminOrgName));
          if (!orgDoc.exists()) {
            setMessage(`Warning: Admin's organization "${adminOrgName}" not found.`);
          }
        } else {
          setMessage("Error: Admin user data not found. Please log in again.");
          navigate("/");
          return;
        }

        const [usersSnapshot, ticketsSnapshot, organizationsSnapshot, departmentsSnapshot] = await Promise.all([
          getDocs(collection(db, "Users")),
          getDocs(collection(db, "tickets")),
          getDocs(collection(db, "Organizations")),
          getDocs(collection(db, "Organizations", adminOrgName, "Departments")),
        ]);
        const usersData = usersSnapshot.docs.map(doc => ({
          username: doc.id,
          name: doc.data().name || "Unknown",
          email: doc.data().email || "N/A",
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          role: doc.data().role || "user",
          orgName: doc.data().orgName || "Not Assigned",
          department: doc.data().department || "N/A"
        }));
        setUsers(usersData.filter(u => u.role === "user" && u.orgName.toLowerCase() === adminOrgName.toLowerCase()));
        setAgents(usersData.filter(u => u.role === "agent" && u.orgName.toLowerCase() === adminOrgName.toLowerCase()));
        setTickets(
          ticketsSnapshot.docs
            .map(doc => ({
              id: doc.id,
              createdBy: doc.data().createdBy || "Unknown",
              assignedAgent: doc.data().assignedAgent?.trim() || "Unassigned",
              status: doc.data().status || "open",
              problem: doc.data().problem || "N/A",
              type: doc.data().type || "N/A",
              department: doc.data().department || "N/A",
              createdAt: doc.data().createdAt || null,
              orgName: doc.data().organization || doc.data().orgName || "Not Assigned"
            }))
            .filter(t => t.orgName.toLowerCase() === adminOrgName.toLowerCase())
        );
        setOrganizations(
          organizationsSnapshot.docs.map(doc => ({
            orgname: doc.id,
            address: doc.data().address || "N/A",
            description: doc.data().description || "N/A",
            field: doc.data().field || "N/A",
            orgadmin_name: doc.data().orgadmin_name || "N/A",
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }))
        );
        setDepartments(
          departmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || "Unknown"
          }))
        );
      } catch (error) {
        setMessage("Failed to fetch data. Please try again.");
      }
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const sortByField = (items, config, isDate) =>
    [...items].sort(
      (a, b) =>
        (config.order === "asc" ? 1 : -1) *
        (isDate
          ? new Date(a[config.field]) - new Date(b[config.field])
          : String(a[config.field]).localeCompare(String(b[config.field])))
    );
  const userTicketCounts = useMemo(
    () =>
      users.map(u => ({
        ...u,
        ticketCount: tickets.filter(t => t.createdBy === u.username).length
      })),
    [users, tickets]
  );
  const agentTicketCounts = useMemo(() => {
    if (!Array.isArray(agents) || !Array.isArray(tickets)) return [];

    return agents.map(agent => {
      const username = agent.username?.trim()?.toLowerCase() || "";
      const ticketSolved = tickets.filter(ticket => {
        const assignedAgent = ticket.assignedAgent?.trim()?.toLowerCase() || "";
        const status = ticket.status?.trim()?.toLowerCase() || "";
        return assignedAgent === username && status === "closed";
      }).length;

      return { ...agent, ticketSolved };
    });
  }, [agents, tickets]);

  const filteredUsers = useMemo(
    () =>
      sortByField(
        userTicketCounts.filter(u =>
          u.username.toLowerCase().includes(search.user.toLowerCase())
        ),
        sort.user,
        sort.user.field === "createdAt"
      ),
    [userTicketCounts, search.user, sort.user]
  );
  const filteredAgents = useMemo(
    () =>
      sortByField(
        agentTicketCounts.filter(a =>
          a.username.toLowerCase().includes(search.agent.toLowerCase())
        ),
        sort.agent,
        sort.agent.field === "createdAt"
      ),
    [agentTicketCounts, search.agent, sort.agent]
  );
  const filteredOrganizations = useMemo(
    () =>
      sortByField(
        organizations.filter(o =>
          o.orgname.toLowerCase().includes(search.organization.toLowerCase())
        ),
        sort.organization,
        sort.organization.field === "createdAt"
      ),
    [organizations, search.organization, sort.organization]
  );

  const toggleDrawer = () => setDrawerOpen(p => !p);
  const handleLogout = {
    click: () => setDialogs(d => ({ ...d, logout: true })),
    confirm: () => (sessionStorage.clear(), navigate("/")),
    cancel: () => setDialogs(d => ({ ...d, logout: false }))
  };
  const handleNavItemClick = index => {
    setSelectedIndex(index);
    if (isMobile) setDrawerOpen(false);
  };
  const handleSortChange = (type, field) =>
    setSort(s => ({
      ...s,
      [type]: {
        field,
        order: s[type].field === field && s[type].order === "asc" ? "desc" : "asc"
      }
    }));

  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
    if (formErrors[name]) setFormErrors(f => ({ ...f, [name]: "" }));
  };

  const handleUserRowClick = (user) => {
    setSelectedUser(user);
  };
  const handleAgentRowClick = (agent) => {
    setSelectedAgent(agent);
  };

  const handleCardToggle = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const validateForm = async (type) => {
    const errors = {};
    if (type === "organization") {
      errors.orgname = !formData.orgname.trim() && "Organization name is required!";
      errors.address = !formData.address.trim() && "Address is required!";
      errors.description = !formData.description.trim() && "Description is required!";
      errors.field = !formData.field.trim() && "Field is required!";
      errors.orgadmin_name = !formData.orgadmin_name.trim() && "Admin name is required!";
      const orgsSnapshot = await getDocs(collection(db, "Organizations"));
      const existingOrgnames = orgsSnapshot.docs.map(doc => doc.id);
      if (existingOrgnames.includes(formData.orgname))
        errors.orgname = "Organization name already exists";
    } else {
      errors.name = !formData.name.trim() && "Name is required!";
      errors.username = !formData.username.trim() && "Username is required!";
      errors.password = !formData.password.trim()
        ? "Password is required!"
        : formData.password.length < 6 && "Password must be at least 6 characters!";
      errors.orgName = !formData.orgName.trim() && "Organization is required!";
      if (type === "agent") {
        errors.department = !formData.department.trim() && "Department is required!";
        if (formData.department && !departments.some(d => d.name === formData.department)) {
          errors.department = "Selected department does not exist!";
        }
      }
      const orgDoc = await getDoc(doc(db, "Organizations", formData.orgName));
      if (!orgDoc.exists()) {
        errors.orgName = "Organization does not exist";
      }
      const usersSnapshot = await getDocs(collection(db, "Users"));
      const existingUsernames = usersSnapshot.docs.map(doc => doc.id);
      if (existingUsernames.includes(formData.username))
        errors.username = "Username already exists";
    }
    setFormErrors(errors);
    return Object.keys(errors).every(k => !errors[k]);
  };

  const handleAddUser = async () => {
    if (!(await validateForm("user"))) return;
    try {
      await setDoc(doc(db, "Users", formData.username), {
        name: formData.name,
        username: formData.username,
        password: formData.password,
        orgName: formData.orgName,
        createdAt: new Date(),
        role: "user"
      });
      setMessage("User added successfully!");
      setDialogs(d => ({ ...d, addUser: false }));
      setFormData({ name: "", username: "", password: "", orgName: "", department: "", orgname: "", address: "", description: "", field: "", orgadmin_name: "" });
      setFormErrors({});
      const usersSnapshot = await getDocs(collection(db, "Users"));
      setUsers(
        usersSnapshot.docs
          .map(doc => ({
            username: doc.id,
            name: doc.data().name || "Unknown",
            email: doc.data().email || "N/A",
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            role: doc.data().role || "user",
            orgName: doc.data().orgName || "Not Assigned",
            department: doc.data().department || "N/A"
          }))
          .filter(u => u.role === "user" && u.orgName.toLowerCase() === adminData.orgName.toLowerCase())
      );
    } catch (error) {
      setMessage("Failed to add user. Ensure username is unique.");
    }
  };

  const handleAddAgent = async () => {
    if (!(await validateForm("agent"))) return;
    try {
      await setDoc(doc(db, "Users", formData.username), {
        name: formData.name,
        username: formData.username,
        password: formData.password,
        orgName: formData.orgName,
        department: formData.department,
        createdAt: new Date(),
        role: "agent"
      });
      setMessage("Agent added successfully!");
      setDialogs(d => ({ ...d, addAgent: false }));
      setFormData({ name: "", username: "", password: "", orgName: "", department: "", orgname: "", address: "", description: "", field: "", orgadmin_name: "" });
      setFormErrors({});
      const agentsSnapshot = await getDocs(collection(db, "Users"));
      setAgents(
        agentsSnapshot.docs
          .map(doc => ({
            username: doc.id,
            name: doc.data().name || "Unknown",
            email: doc.data().email || "N/A",
            department: doc.data().department || "N/A",
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            role: doc.data().role || "agent",
            orgName: doc.data().orgName || "Not Assigned"
          }))
          .filter(u => u.role === "agent" && u.orgName.toLowerCase() === adminData.orgName.toLowerCase())
      );
    } catch (error) {
      setMessage("Failed to add agent. Ensure username is unique.");
    }
  };

  const handleAddOrganization = async () => {
    if (!(await validateForm("organization"))) return;
    try {
      await setDoc(doc(db, "Organizations", formData.orgname), {
        orgname: formData.orgname,
        address: formData.address,
        description: formData.description,
        field: formData.field,
        orgadmin_name: formData.orgadmin_name,
        createdAt: new Date(),
      });
      setMessage(`Organization ${formData.orgname} created successfully!`);
      setDialogs(d => ({ ...d, addOrganization: false }));
      setFormData({ name: "", username: "", password: "", orgName: "", department: "", orgname: "", address: "", description: "", field: "", orgadmin_name: "" });
      setFormErrors({});
      const orgsSnapshot = await getDocs(collection(db, "Organizations"));
      setOrganizations(
        orgsSnapshot.docs.map(doc => ({
          orgname: doc.id,
          address: doc.data().address || "N/A",
          description: doc.data().description || "N/A",
          field: doc.data().field || "N/A",
          orgadmin_name: doc.data().orgadmin_name || "N/A",
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }))
      );
    } catch (error) {
      setMessage("Failed to add organization. Ensure organization name is unique.");
    }
  };

  return (
    <Box sx={{
      display: "flex", flexDirection: { xs: "column", sm: "row" }, bgcolor: LIGHT_GREY,
      minHeight: "100vh"
    }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { xs: "100%", sm: drawerOpen ? `calc(100% - ${drawerWidth}px)` : "100%" },
          ml: { sm: drawerOpen ? `${drawerWidth}px` : 0 },
          bgcolor: NAVY,
          color: WHITE,
          borderBottom: `1px solid ${NAVY}`,
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={toggleDrawer}
            sx={{ mr: 2, display: { xs: "block", sm: drawerOpen ? "none" : "block" } }}
            size="large"
            aria-label="Toggle navigation drawer"
          >
            <MenuIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.75rem" }, color: WHITE }} />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: "bold",
              color: WHITE,
              fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
            }}
          >
            Admin Dashboard
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              mr: 2,
              color: WHITE,
              fontSize: { xs: "0.9rem", sm: "1rem", md: "1.2rem" },
            }}
          >
            {adminData.username} | {adminData.orgName}
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogout.click}
            startIcon={<LogoutIcon sx={{ color: WHITE, fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />}
            sx={{
              color: WHITE,
              borderColor: WHITE,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              "&:hover": { background: SELECT_BG, color: WHITE, borderColor: WHITE },
              px: { xs: 1, sm: 2 },
              minWidth: { xs: 80, sm: 100 },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: NAVY,
            color: WHITE,
            borderRight: `1px solid ${NAVY}`,
          },
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            noWrap
            sx={{
              color: WHITE,
              fontWeight: 700,
              fontSize: { xs: "1.1rem", sm: "1.25rem" },
            }}
          >
            HELPMATE Admin
          </Typography>
          <IconButton
            onClick={toggleDrawer}
            sx={{ color: WHITE, ml: "auto" }}
            size="large"
            aria-label="Toggle navigation drawer"
          >
            <MenuIcon sx={{ fontSize: { xs: "1.5rem", sm: "1.75rem" }, color: WHITE }} />
          </IconButton>
        </Toolbar>
        <Divider sx={{ borderColor: "#243366" }} />
        <List role="navigation" aria-label="Main navigation">
          {navItems.map(({ text, icon }, index) => (
            <ListItem
              button
              key={text}
              selected={selectedIndex === index}
              onClick={() => handleNavItemClick(index)}
              sx={{
                color: WHITE,
                fontWeight: selectedIndex === index ? 700 : 500,
                ...(selectedIndex === index && {
                  bgcolor: SELECT_BG,
                  borderRadius: 2,
                }),
                transition: "background 0.2s",
                py: { xs: 0.5, sm: 1 },
              }}
              aria-selected={selectedIndex === index}
            >
              <ListItemIcon sx={{ color: WHITE, minWidth: { xs: 40, sm: 56 } }}>
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={text}
                sx={{
                  color: WHITE,
                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                }}
                primaryTypographyProps={{
                  style: {
                    color: WHITE,
                    fontWeight: selectedIndex === index ? 700 : 500,
                    fontSize: "inherit",
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Box
          sx={{
            p: { xs: 1, sm: 2 },
            display: "flex",
            alignItems: "center",
            borderTop: `1px solid #243366`,
            bgcolor: NAVY,
          }}
        >
          <AccountCircleOutlinedIcon sx={{ mr: 1, color: WHITE, fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
          <Typography
            variant="subtitle1"
            sx={{
              color: WHITE,
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            {adminData.username}
          </Typography>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          mt: { xs: 7, sm: 8 },
          bgcolor: LIGHT_GREY,
          minHeight: "100vh",
          color: NAVY,
          width: { xs: "100%", sm: drawerOpen ? `calc(100% - ${drawerWidth}px)` : "100%" },
          ml: { sm: drawerOpen ? `${drawerWidth}px` : 0 },
        }}
      >
        {message && (
          <Box
            sx={{
              position: { xs: "fixed", sm: "absolute" },
              top: { xs: 60, sm: 0 },
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: NAVY,
              color: WHITE,
              p: { xs: 1, sm: 2 },
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: 1000,
              animation: "fadeOut 5s forwards",
              textAlign: "center",
              fontSize: { xs: "0.9rem", sm: "1rem", md: "1.2rem" },
              fontWeight: 600,
              maxWidth: { xs: "90%", sm: "80%" },
              "@keyframes fadeOut": {
                "0%": { opacity: 1 },
                "80%": { opacity: 1 },
                "100%": { opacity: 0, visibility: "hidden" },
              },
            }}
          >
            {message}
          </Box>
        )}
        {selectedIndex === 0 && (
          <Box>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                color: NAVY,
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2.4rem" },
              }}

            >
              Welcome, {adminData.username}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: NAVY,
                fontSize: { xs: "0.9rem", sm: "1.1rem", md: "1.4rem" },
                mb: 3,
              }}
            >
              This is the admin home page. Use the navigation drawer to view and manage users, agents, tickets, and more.
            </Typography>
            <Card
              sx={{
                maxWidth: { xs: "100%", sm: 400 },
                bgcolor: WHITE,
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
                "&:hover": {
                  transform: "scale(1.02)",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                  bgcolor: SELECT_BG,
                  "& .MuiTypography-root": { color: WHITE },
                  "& .MuiSvgIcon-root": { color: WHITE },
                },
              }}
              onClick={() => setShowAlerts(prev => !prev)}
              role="button"
              aria-label="Toggle escalation alerts"
            >
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: { xs: 1.5, sm: 2 } }}>
                <WarningAmberIcon sx={{ color: NAVY, fontSize: { xs: 24, sm: 28 } }} />
                <Typography
                  variant="h6"
                  sx={{
                    color: NAVY,
                    fontSize: { xs: "1rem", sm: "1.2rem" },
                    fontWeight: 600,
                  }}
                >
                  {showAlerts ? "Hide Escalation Alerts" : "View Escalation Alerts"}
                </Typography>
              </CardContent>
            </Card>
            {showAlerts && (
              <Fade in={showAlerts} timeout={600}>
                <Box sx={{ mt: 3 }}>
                  {/* CHANGE IS HERE: */}
              
                  <EscalationAlert tickets={tickets} organization={adminData.orgName} />
                </Box>
              </Fade>
            )}
            <Box>
              <Report orgName={adminData.orgName} />
            </Box>
          </Box>
        )}
        {selectedIndex === 1 && (
          <Box>
            <Typography
              variant="h5"
              mb={2}
              sx={{
                color: NAVY,
                fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
              }}
            >
              Users
            </Typography>
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "flex-end",
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 1, sm: 2 },
              }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormData(prev => ({ ...prev, orgName: adminData.orgName }));
                  setDialogs(d => ({ ...d, addUser: true }));
                }}
                sx={{
                  color: NAVY,
                  bgcolor: WHITE,
                  fontWeight: 700,
                  border: `1px solid ${NAVY}`,
                  "&:hover": { bgcolor: SELECT_BG, color: WHITE },
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  minWidth: { xs: "100%", sm: 120 },
                }}
              >
                Add User
              </Button>
            </Box>
            <TextField
              label="Search Users"
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                mb: 2,
                maxWidth: { xs: "100%", sm: 400 },
                "& .MuiInputBase-input": {
                  color: NAVY,
                  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                },
                "& .MuiInputLabel-root": {
                  color: NAVY,
                  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: NAVY },
                  "&:hover fieldset": { borderColor: SELECT_BG },
                  "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                },
              }}
              value={search.user}
              onChange={e => setSearch(s => ({ ...s, user: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: NAVY, fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                  </InputAdornment>
                ),
              }}
            />
            {isMobile ? (
              <Box role="list" aria-label="Users list">
                {filteredUsers.map((user) => (
                  <Card
                    key={user.username}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      boxShadow: "0 2px 8px 0 #e3f2fd",
                      background: WHITE,
                    }}
                    role="listitem"
                  >
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PersonIcon sx={{ color: SELECT_BG, fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                          <Typography
                            sx={{
                              color: NAVY,
                              fontWeight: 600,
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            }}
                          >
                            {user.username}
                          </Typography>
                        </Box>
                        <IconButton
                          onClick={() => handleCardToggle(user.username)}
                          sx={{
                            color: NAVY,
                            minWidth: { xs: 40, sm: 48 },
                            minHeight: { xs: 40, sm: 48 },
                          }}
                          aria-label={`Toggle details for user ${user.username}`}
                          aria-expanded={expandedCard === user.username}
                        >
                          {expandedCard === user.username ? (
                            <ExpandLessIcon sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                          ) : (
                            <ExpandMoreIcon sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                          )}
                        </IconButton>
                      </Box>
                      <Collapse in={expandedCard === user.username} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 1.5, bgcolor: "#f4f6f8", borderRadius: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: NAVY,
                              fontSize: { xs: "0.8rem", sm: "0.85rem" },
                            }}
                          >
                            <b>Created At:</b> {dayjs(user.createdAt).format("MMM DD, YYYY")}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: NAVY,
                              fontSize: { xs: "0.8rem", sm: "0.85rem" },
                            }}
                          >
                            <b>Tickets Submitted:</b> <Chip label={user.ticketCount} color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: { xs: "0.75rem", sm: "0.8rem" } }} />
                          </Typography>
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                ))}
                {filteredUsers.length === 0 && (
                  <Typography
                    sx={{
                      color: NAVY,
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      textAlign: "center",
                      mt: 2,
                    }}
                  >
                    No users found
                  </Typography>
                )}
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  mt: 2,
                  borderRadius: 3,
                  boxShadow: "0 2px 8px 0 #e3f2fd",
                  overflowX: "auto",
                }}
                aria-label="Users table"
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: SELECT_BG }}>
                      <TableCell
                        onClick={() => handleSortChange("user", "username")}
                        sx={{
                          cursor: "pointer",
                          color: WHITE,
                          fontWeight: 700,
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                          py: { xs: 1, sm: 1.5 },
                        }}
                      >
                        <span>Username</span>
                        <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                      </TableCell>
                      <TableCell
                        onClick={() => handleSortChange("user", "createdAt")}
                        sx={{
                          cursor: "pointer",
                          color: WHITE,
                          fontWeight: 700,
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                          py: { xs: 1, sm: 1.5 },
                        }}
                      >
                        <span>Created At</span>
                        <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                      </TableCell>
                      <TableCell
                        sx={{
                          color: WHITE,
                          fontWeight: 700,
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                          py: { xs: 1, sm: 1.5 },
                        }}
                      >
                        Tickets Submitted
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.username}
                        hover
                        onClick={() => handleUserRowClick(user)}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: SELECT_BG, color: WHITE },
                          transition: "background 0.2s",
                        }}
                      >
                        <TableCell
                          sx={{
                            color: NAVY,
                            fontWeight: 600,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          <PersonIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: SELECT_BG, mr: 1, verticalAlign: "middle" }} />
                          {user.username}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: NAVY,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          {dayjs(user.createdAt).format("MMM DD, YYYY")}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: NAVY,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          <Chip
                            label={user.ticketCount}
                            color="primary"
                            variant="outlined"
                            sx={{
                              fontWeight: 700,
                              fontSize: { xs: "0.75rem", sm: "0.8rem" },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          align="center"
                          sx={{
                            color: NAVY,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <Dialog
              open={Boolean(selectedUser)}
              onClose={handleUserDialogClose}
              maxWidth="sm"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  width: { xs: "90%", sm: "400px" },
                  maxWidth: "400px",
                  p: { xs: 1, sm: 2 },
                },
              }}
            >
              <DialogTitle
                sx={{
                  color: NAVY,
                  fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
                }}
              >
                User Details
              </DialogTitle>
              <DialogContent>
                {selectedUser && (
                  <Box sx={{ minWidth: { xs: 200, sm: 300 } }}>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Name: <span style={{ fontWeight: 400 }}>{selectedUser.name}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Username: <span style={{ fontWeight: 400 }}>{selectedUser.username}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Tickets Submitted: <span style={{ fontWeight: 400 }}>{selectedUser.ticketCount}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Organization: <span style={{ fontWeight: 400 }}>{selectedUser.orgName}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                      }}
                    >
                      Created At: <span style={{ fontWeight: 400 }}>{dayjs(selectedUser.createdAt).format("MMM DD, YYYY")}</span>
                    </Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleUserDialogClose}
                  sx={{
                    color: NAVY,
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    minWidth: { xs: 80, sm: 100 },
                  }}
                >
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {selectedIndex === 2 && (
          <Box>
            <Typography
              variant="h5"
              mb={2}
              sx={{
                color: NAVY,
                fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
              }}
            >
              Agents
            </Typography>
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "flex-end",
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 1, sm: 2 },
              }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormData(prev => ({ ...prev, orgName: adminData.orgName }));
                  setDialogs(d => ({ ...d, addAgent: true }));
                }}
                sx={{
                  color: NAVY,
                  bgcolor: WHITE,
                  fontWeight: 700,
                  border: `1px solid ${NAVY}`,
                  "&:hover": { bgcolor: SELECT_BG, color: WHITE },
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  minWidth: { xs: "100%", sm: 120 },
                }}
              >
                Add Agent
              </Button>
            </Box>
            <TextField
              label="Search Agents"
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                mb: 2,
                maxWidth: { xs: "100%", sm: 400 },
                "& .MuiInputBase-input": {
                  color: NAVY,
                  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                },
                "& .MuiInputLabel-root": {
                  color: NAVY,
                  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: NAVY },
                  "&:hover fieldset": { borderColor: SELECT_BG },
                  "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                },
              }}
              value={search.agent}
              onChange={e => setSearch(s => ({ ...s, agent: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: NAVY, fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                  </InputAdornment>
                ),
              }}
            />
            {isMobile ? (
              <Box role="list" aria-label="Agents list">
                {filteredAgents.map((agent) => (
                  <Card
                    key={agent.username}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      boxShadow: "0 2px 8px 0 #e3f2fd",
                      background: WHITE,
                    }}
                    role="listitem"
                  >
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <SupervisorAccountIcon sx={{ color: SELECT_BG, fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                          <Typography
                            sx={{
                              color: NAVY,
                              fontWeight: 600,
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            }}
                          >
                            {agent.username}
                          </Typography>
                        </Box>
                        <IconButton
                          onClick={() => handleCardToggle(agent.username)}
                          sx={{
                            color: NAVY,
                            minWidth: { xs: 40, sm: 48 },
                            minHeight: { xs: 40, sm: 48 },
                          }}
                          aria-label={`Toggle details for agent ${agent.username}`}
                          aria-expanded={expandedCard === agent.username}
                        >
                          {expandedCard === agent.username ? (
                            <ExpandLessIcon sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                          ) : (
                            <ExpandMoreIcon sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                          )}
                        </IconButton>
                      </Box>
                      <Collapse in={expandedCard === agent.username} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 1.5, bgcolor: "#f4f6f8", borderRadius: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: NAVY,
                              fontSize: { xs: "0.8rem", sm: "0.85rem" },
                            }}
                          >
                            <b>Department:</b> {agent.department}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: NAVY,
                              fontSize: { xs: "0.8rem", sm: "0.85rem" },
                            }}
                          >
                            <b>Created At:</b> {dayjs(agent.createdAt).format("MMM DD, YYYY")}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: NAVY,
                              fontSize: { xs: "0.8rem", sm: "0.85rem" },
                            }}
                          >
                            <b>Tickets Solved:</b> <Chip label={agent.ticketSolved} color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: { xs: "0.75rem", sm: "0.8rem" } }} />
                          </Typography>
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                ))}
                {filteredAgents.length === 0 && (
                  <Typography
                    sx={{
                      color: NAVY,
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      textAlign: "center",
                      mt: 2,
                    }}
                  >
                    No agents found
                  </Typography>
                )}
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  mt: 2,
                  borderRadius: 3,
                  boxShadow: "0 2px 8px 0 #e3f2fd",
                  overflowX: "auto",
                }}
                aria-label="Agents table"
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: SELECT_BG }}>
                      <TableCell
                        onClick={() => handleSortChange("agent", "username")}
                        sx={{
                          cursor: "pointer",
                          color: WHITE,
                          fontWeight: 700,
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                          py: { xs: 1, sm: 1.5 },
                        }}
                      >
                        <span>Username</span>
                        <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                      </TableCell>
                      <TableCell
                        onClick={() => handleSortChange("agent", "department")}
                        sx={{
                          cursor: "pointer",
                          color: WHITE,
                          fontWeight: 700,
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                          py: { xs: 1, sm: 1.5 },
                        }}
                      >
                        <span>Department</span>
                        <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                      </TableCell>
                      <TableCell
                        onClick={() => handleSortChange("agent", "createdAt")}
                        sx={{
                          cursor: "pointer",
                          color: WHITE,
                          fontWeight: 700,
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                          py: { xs: 1, sm: 1.5 },
                        }}
                      >
                        <span>Created At</span>
                        <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                      </TableCell>
                      <TableCell
                        sx={{
                          color: WHITE,
                          fontWeight: 700,
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                          py: { xs: 1, sm: 1.5 },
                        }}
                      >
                        Tickets Solved
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow
                        key={agent.username}
                        hover
                        onClick={() => handleAgentRowClick(agent)}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: SELECT_BG, color: WHITE },
                          transition: "background 0.2s",
                        }}
                      >
                        <TableCell
                          sx={{
                            color: NAVY,
                            fontWeight: 600,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          <SupervisorAccountIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: SELECT_BG, mr: 1, verticalAlign: "middle" }} />
                          {agent.username}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: NAVY,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          {agent.department}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: NAVY,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          {dayjs(agent.createdAt).format("MMM DD, YYYY")}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: NAVY,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          <Chip
                            label={agent.ticketSolved}
                            color="success"
                            variant="outlined"
                            sx={{
                              fontWeight: 700,
                              fontSize: { xs: "0.75rem", sm: "0.8rem" },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAgents.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align="center"
                          sx={{
                            color: NAVY,
                            fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" },
                            py: { xs: 1, sm: 1.5 },
                          }}
                        >
                          No agents found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <Dialog
              open={Boolean(selectedAgent)}
              onClose={handleAgentDialogClose}
              maxWidth="sm"
              fullWidth
              sx={{
                "& .MuiDialog-paper": {
                  width: { xs: "90%", sm: "400px" },
                  maxWidth: "400px",
                  p: { xs: 1, sm: 2 },
                },
              }}
            >
              <DialogTitle
                sx={{
                  color: NAVY,
                  fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
                }}
              >
                Agent Details
              </DialogTitle>
              <DialogContent>
                {selectedAgent && (
                  <Box sx={{ minWidth: { xs: 200, sm: 300 } }}>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Name: <span style={{ fontWeight: 400 }}>{selectedAgent.name}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Username: <span style={{ fontWeight: 400 }}>{selectedAgent.username}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Department: <span style={{ fontWeight: 400 }}>{selectedAgent.department}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Tickets Solved: <span style={{ fontWeight: 400 }}>{selectedAgent.ticketSolved}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                        mb: 1,
                      }}
                    >
                      Organization: <span style={{ fontWeight: 400 }}>{selectedAgent.orgName}</span>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: { xs: "0.8rem", sm: "0.85rem", md: "1rem" },
                      }}
                    >
                      Created At: <span style={{ fontWeight: 400 }}>{dayjs(selectedAgent.createdAt).format("MMM DD, YYYY")}</span>
                    </Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleAgentDialogClose}
                  sx={{
                    color: NAVY,
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    minWidth: { xs: 80, sm: 100 },
                  }}
                >
                  Close
                </Button>

              </DialogActions>
            </Dialog>
          </Box>

        )}

        {selectedIndex === 3 && (
          <DisplayTickets
            search={search.ticket}
            sortOrders={sortOrders}
            setSortOrders={setSortOrders}
            statusMapping={statusMapping}
            navigate={navigate}
            NAVY={NAVY}
            WHITE={WHITE}
            LIGHT_GREY={LIGHT_GREY}
            SELECT_BG={SELECT_BG}
            agentList={agents}
            organization={adminData.orgName}
          />
        )}

        {selectedIndex === 4 && (
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: NAVY,
                fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
              }}
            >
              Reports
            </Typography>
            <Typography
              variant="body1"
              mt={2}
              sx={{
                color: NAVY,
                fontSize: { xs: "0.9rem", sm: "1.1rem", md: "1.4rem" },
              }}
            >
              Reports feature is coming soon.
            </Typography>
          </Box>
        )}

        {selectedIndex === 5 && <Knowledge orgName={adminData.orgName} />}

        {selectedIndex === 6 && (
          <Manage
            manageType="department"
            organization={adminData.orgName}
            NAVY={NAVY}
            WHITE={WHITE}
            LIGHT_GREY={LIGHT_GREY}
            SELECT_BG={SELECT_BG}
          />
        )}

        {selectedIndex === 7 && (
          <Manage
            manageType="sla"
            organization={adminData.orgName}
            NAVY={NAVY}
            WHITE={WHITE}
            LIGHT_GREY={LIGHT_GREY}
            SELECT_BG={SELECT_BG}
          />
        )}
      </Box>

      <Dialog
        open={dialogs.logout}
        onClose={handleLogout.cancel}
        maxWidth="xs"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "300px" },
            maxWidth: "300px",
            p: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
          }}
        >
          Confirm Logout
        </DialogTitle>
        <DialogContent
          sx={{
            color: NAVY,
            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.2rem" },
          }}
        >
          Are you sure you want to logout?
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleLogout.cancel}
            sx={{
              color: NAVY,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              minWidth: { xs: 80, sm: 100 },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLogout.confirm}
            color="error"
            variant="contained"
            sx={{
              bgcolor: NAVY,
              color: WHITE,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              minWidth: { xs: 80, sm: 100 },
            }}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialogs.addUser}
        onClose={() => setDialogs(d => ({ ...d, addUser: false }))}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "400px" },
            maxWidth: "400px",
            p: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
          }}
        >
          Add New User
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="name"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleFormChange}
            error={!!formErrors.name}
            helperText={formErrors.name}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.username}
            onChange={handleFormChange}
            error={!!formErrors.username}
            helperText={formErrors.username}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.password}
            onChange={handleFormChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="orgName"
            label="Organization"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.orgName}
            onChange={handleFormChange}
            error={!!formErrors.orgName}
            helperText={formErrors.orgName}
            disabled
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogs(d => ({ ...d, addUser: false }))}
            sx={{
              color: NAVY,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              minWidth: { xs: 80, sm: 100 },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            sx={{
              color: NAVY,
              bgcolor: WHITE,
              border: `1px solid ${NAVY}`,
              "&:hover": { bgcolor: SELECT_BG, color: WHITE },
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              minWidth: { xs: 80, sm: 100 },
            }}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialogs.addAgent}
        onClose={() => setDialogs(d => ({ ...d, addAgent: false }))}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "400px" },
            maxWidth: "400px",
            p: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
          }}
        >
          Add New Agent
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="name"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleFormChange}
            error={!!formErrors.name}
            helperText={formErrors.name}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.username}
            onChange={handleFormChange}
            error={!!formErrors.username}
            helperText={formErrors.username}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.password}
            onChange={handleFormChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="orgName"
            label="Organization"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.orgName}
            onChange={handleFormChange}
            error={!!formErrors.orgName}
            helperText={formErrors.orgName}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <Select
            margin="dense"
            name="department"
            label="Department"
            fullWidth
            variant="outlined"
            value={formData.department}
            onChange={handleFormChange}
            error={!!formErrors.department}
            displayEmpty
            sx={{
              mt: 1,
              "& .MuiSelect-select": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
              "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          >
            <MenuItem value="" disabled>
              Select Department
            </MenuItem>
            {departments.map(dept => (
              <MenuItem key={dept.id} value={dept.name}>
                {dept.name}
              </MenuItem>
            ))}
          </Select>
          {formErrors.department && (
            <Typography color="error" sx={{ fontSize: { xs: "0.75rem", sm: "0.8rem" }, mt: 0.5 }}>
              {formErrors.department}
            </Typography>
          )}

        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogs(d => ({ ...d, addAgent: false }))}
            sx={{
              color: NAVY,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              minWidth: { xs: 80, sm: 100 },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddAgent}
            variant="contained"
            sx={{
              color: NAVY,
              bgcolor: WHITE,
              border: `1px solid ${NAVY}`,
              "&:hover": { bgcolor: SELECT_BG, color: WHITE },
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              minWidth: { xs: 80, sm: 100 },
            }}
          >
            Add Agent
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialogs.addOrganization}
        onClose={() => setDialogs(d => ({ ...d, addOrganization: false }))}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "400px" },
            maxWidth: "400px",
            p: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
          }}
        >
          Add New Organization
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="orgname"
            label="Organization Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.orgname}
            onChange={handleFormChange}
            error={!!formErrors.orgname}
            helperText={formErrors.orgname}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="address"
            label="Address"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.address}
            onChange={handleFormChange}
            error={!!formErrors.address}
            helperText={formErrors.address}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.description}
            onChange={handleFormChange}
            error={!!formErrors.description}
            helperText={formErrors.description}
            sx={{
              "& .MuiInputBase-input": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiInputLabel-root": {
                color: NAVY,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogs(d => ({ ...d, addOrganization: false }))} sx={{ color: NAVY }}>
            Cancel
          </Button>
          <Button onClick={handleAddOrganization} variant="contained" sx={{ color: NAVY, bgcolor: WHITE, border: `1px solid ${NAVY}`, "&:hover": { bgcolor: SELECT_BG, color: WHITE } }}>
            Add Organization
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default AdminDashboard;