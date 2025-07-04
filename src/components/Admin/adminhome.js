import React, { useEffect, useState, useMemo } from "react";
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Divider,
  Card, CardContent, TextField, InputAdornment, Table, TableContainer, TableCell, TableBody, TableHead, TableRow,
  Paper, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
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
import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import Knowledge from "../Admin/knowledge.js";
import DisplayTickets from "./displayticket";

const drawerWidth = 240;
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
  const [selectedUser, setSelectedUser] = useState(null); // User details dialog
  const [selectedAgent, setSelectedAgent] = useState(null); // Agent details dialog
  const navigate = useNavigate();

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
          // Verify if the admin's organization exists in Organizations collection
          const orgDoc = await getDoc(doc(db, "Organizations", adminOrgName));
          if (!orgDoc.exists()) {
            setMessage(`Warning: Admin's organization "${adminOrgName}" not found.`);
          }
        } else {
          setMessage("Error: Admin user data not found. Please log in again.");
          navigate("/");
          return;
        }

        const [usersSnapshot, ticketsSnapshot, organizationsSnapshot] = await Promise.all([
          getDocs(collection(db, "Users")),
          getDocs(collection(db, "tickets")),
          getDocs(collection(db, "Organizations")),
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
              agentId: doc.data().agentId?.trim() || "Unassigned",
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
        const agentId = ticket.agentId?.trim()?.toLowerCase() || "";
        const status = ticket.status?.trim()?.toLowerCase() || "";
        return agentId === username && (status === "resolved" || status === "closed");
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

  // TICKET SEARCH AND GROUPING MOVED TO DISPLAYTICKETS

  const toggleDrawer = () => setDrawerOpen(p => !p);
  const handleLogout = {
    click: () => setDialogs(d => ({ ...d, logout: true })),
    confirm: () => (sessionStorage.clear(), navigate("/")),
    cancel: () => setDialogs(d => ({ ...d, logout: false }))
  };
  const handleNavItemClick = index => setSelectedIndex(index);
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

  const handleUserDialogClose = () => setSelectedUser(null);
  const handleAgentDialogClose = () => setSelectedAgent(null);

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
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: drawerOpen ? `calc(100% - ${drawerWidth}px)` : "100%",
          ml: drawerOpen ? `${drawerWidth}px` : 0,
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
            sx={{ mr: 2, ...(drawerOpen && { display: "none" }) }}
            size="large"
            aria-label="menu"
          >
            <MenuIcon sx={{ color: WHITE }} />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: "bold",
              color: WHITE,
              fontSize: "2rem"
            }}
          >
            Admin Dashboard
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ mr: 2, color: WHITE, fontSize: "1.2rem" }}
          >
            {adminData.username} | {adminData.orgName}
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogout.click}
            startIcon={<LogoutIcon sx={{ color: WHITE }} />}
            sx={{
              color: WHITE,
              borderColor: WHITE,
              "&:hover": { background: SELECT_BG, color: WHITE, borderColor: WHITE }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: NAVY,
            color: WHITE,
            borderRight: `1px solid ${NAVY}`,
          }
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ color: WHITE, fontWeight: 700 }}>
            HELPMATE Admin
          </Typography>
          <IconButton
            onClick={toggleDrawer}
            sx={{ color: WHITE, ml: "auto" }}
            size="large"
          >
            <MenuIcon sx={{ color: WHITE }} />
          </IconButton>
        </Toolbar>
        <Divider sx={{ borderColor: "#243366" }} />
        <List>
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
                  borderRadius: 2
                }),
                transition: "background 0.2s"
              }}
            >
              <ListItemIcon sx={{ color: WHITE }}>{icon}</ListItemIcon>
              <ListItemText
                primary={text}
                sx={{
                  color: WHITE,
                  fontWeight: selectedIndex === index ? 700 : 500,
                  fontSize: "1.1rem"
                }}
                primaryTypographyProps={{
                  style: { color: WHITE, fontWeight: selectedIndex === index ? 700 : 500, fontSize: "1.1rem" }
                }}
              />
            </ListItem>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            borderTop: `1px solid #243366`,
            bgcolor: NAVY
          }}
        >
          <AccountCircleOutlinedIcon sx={{ mr: 1, color: WHITE }} />
          <Typography variant="subtitle1" sx={{ color: WHITE }}>
            {adminData.username}
          </Typography>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          bgcolor: LIGHT_GREY,
          minHeight: "100vh",
          color: NAVY,
          fontSize: "20px",
          position: "relative"
        }}
      >
        {message && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: NAVY,
              color: WHITE,
              p: 2,
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: 1000,
              animation: "fadeOut 5s forwards",
              textAlign: "center",
              fontSize: "1.2rem",
              fontWeight: 600,
              maxWidth: "80%",
              "@keyframes fadeOut": {
                "0%": { opacity: 1 },
                "80%": { opacity: 1 },
                "100%": { opacity: 0, visibility: "hidden" }
              }
            }}
          >
            {message}
          </Box>
        )}
        {selectedIndex === 0 && (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: NAVY, fontSize: "2.4rem" }}>
              Welcome, {adminData.username}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: NAVY, fontSize: "1.4rem" }}
            >
              This is the admin home page. Use the navigation drawer to view and manage users, agents, tickets, and more.
            </Typography>
          </Box>
        )}

        {selectedIndex === 1 && (
          <Box>
            <Typography variant="h5" mb={2} sx={{ color: NAVY, fontSize: "2rem" }}>
              Users
            </Typography>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogs(d => ({ ...d, addUser: true }))}
                sx={{ color: NAVY, bgcolor: WHITE, fontWeight: 700, border: `1px solid ${NAVY}`, "&:hover": { bgcolor: SELECT_BG, color: WHITE } }}
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
                maxWidth: 400,
                "& .MuiInputBase-input": { color: NAVY, fontSize: "1.1rem" },
                "& .MuiInputLabel-root": { color: NAVY, fontSize: "1.1rem" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: NAVY },
                  "&:hover fieldset": { borderColor: SELECT_BG },
                  "&.Mui-focused fieldset": { borderColor: SELECT_BG }
                }
              }}
              value={search.user}
              onChange={e => setSearch(s => ({ ...s, user: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: NAVY }} />
                  </InputAdornment>
                )
              }}
            />
            <TableContainer component={Paper} sx={{
              mt: 2,
              borderRadius: 3,
              boxShadow: "0 2px 8px 0 #e3f2fd"
            }}>
              <Table size="small" aria-label="users table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: SELECT_BG }}>
                    <TableCell
                      onClick={() => handleSortChange("user", "username")}
                      sx={{ cursor: "pointer", color: WHITE, fontWeight: 700, fontSize: "1.1rem" }}
                    >
                      <span>Username</span>
                      <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                    </TableCell>
                    <TableCell
                      onClick={() => handleSortChange("user", "createdAt")}
                      sx={{ cursor: "pointer", color: WHITE, fontWeight: 700, fontSize: "1.1rem" }}
                    >
                      <span>Created At</span>
                      <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                    </TableCell>
                    <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.1rem" }}>
                      Tickets Submitted
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user, i) => (
                    <TableRow
                      key={user.username}
                      hover
                      onClick={() => handleUserRowClick(user)}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { backgroundColor: SELECT_BG, color: WHITE },
                        padding: "8px 16px",
                        transition: "background 0.2s"
                      }}
                    >
                      <TableCell sx={{ color: NAVY, fontWeight: 600, fontSize: "1.05rem" }}>
                        <PersonIcon sx={{ fontSize: 18, color: SELECT_BG, mr: 1, verticalAlign: "middle" }} />
                        {user.username}
                      </TableCell>
                      <TableCell sx={{ color: NAVY, fontSize: "1.05rem" }}>
                        {dayjs(user.createdAt).format("MMM DD, YYYY")}
                      </TableCell>
                      <TableCell sx={{ color: NAVY, fontSize: "1.05rem" }}>
                        <Chip label={user.ticketCount} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: NAVY, fontSize: "1.1rem" }}>
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {/* User Details Dialog */}
            <Dialog open={Boolean(selectedUser)} onClose={handleUserDialogClose}>
              <DialogTitle sx={{ color: NAVY }}>User Details</DialogTitle>
              <DialogContent>
                {selectedUser && (
                  <Box sx={{ minWidth: 300 }}>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Name: <span style={{ fontWeight: 400 }}>{selectedUser.name}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Username: <span style={{ fontWeight: 400 }}>{selectedUser.username}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Tickets Submitted: <span style={{ fontWeight: 400 }}>{selectedUser.ticketCount}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Organization: <span style={{ fontWeight: 400 }}>{selectedUser.orgName}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Created At: <span style={{ fontWeight: 400 }}>{dayjs(selectedUser.createdAt).format("MMM DD, YYYY")}</span>
                    </Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleUserDialogClose} sx={{ color: NAVY }}>
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {selectedIndex === 2 && (
          <Box>
            <Typography variant="h5" mb={2} sx={{ color: NAVY, fontSize: "2rem" }}>
              Agents
            </Typography>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogs(d => ({ ...d, addAgent: true }))}
                sx={{ color: NAVY, bgcolor: WHITE, fontWeight: 700, border: `1px solid ${NAVY}`, "&:hover": { bgcolor: SELECT_BG, color: WHITE } }}
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
                maxWidth: 400,
                "& .MuiInputBase-input": { color: NAVY, fontSize: "1.1rem" },
                "& .MuiInputLabel-root": { color: NAVY, fontSize: "1.1rem" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: NAVY },
                  "&:hover fieldset": { borderColor: SELECT_BG },
                  "&.Mui-focused fieldset": { borderColor: SELECT_BG }
                }
              }}
              value={search.agent}
              onChange={e => setSearch(s => ({ ...s, agent: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: NAVY }} />
                  </InputAdornment>
                )
              }}
            />
            <TableContainer component={Paper} sx={{
              mt: 2,
              borderRadius: 3,
              boxShadow: "0 2px 8px 0 #e3f2fd"
            }}>
              <Table size="small" aria-label="agents table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: SELECT_BG }}>
                    <TableCell
                      onClick={() => handleSortChange("agent", "username")}
                      sx={{ cursor: "pointer", color: WHITE, fontWeight: 700, fontSize: "1.1rem" }}
                    >
                      <span>Username</span>
                      <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                    </TableCell>
                    <TableCell
                      onClick={() => handleSortChange("agent", "department")}
                      sx={{ cursor: "pointer", color: WHITE, fontWeight: 700, fontSize: "1.1rem" }}
                    >
                      <span>Department</span>
                      <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                    </TableCell>
                    <TableCell
                      onClick={() => handleSortChange("agent", "createdAt")}
                      sx={{ cursor: "pointer", color: WHITE, fontWeight: 700, fontSize: "1.1rem" }}
                    >
                      <span>Created At</span>
                      <SortIcon fontSize="small" sx={{ color: WHITE, verticalAlign: "middle" }} />
                    </TableCell>
                    <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: "1.1rem" }}>
                      Tickets Solved
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAgents.map(agent => (
                    <TableRow
                      key={agent.username}
                      hover
                      onClick={() => handleAgentRowClick(agent)}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { backgroundColor: SELECT_BG, color: WHITE },
                        padding: "8px 16px",
                        transition: "background 0.2s"
                      }}
                    >
                      <TableCell sx={{ color: NAVY, fontWeight: 600, fontSize: "1.05rem" }}>
                        <SupervisorAccountIcon sx={{ fontSize: 18, color: SELECT_BG, mr: 1, verticalAlign: "middle" }} />
                        {agent.username}
                      </TableCell>
                      <TableCell sx={{ color: NAVY, fontSize: "1.05rem" }}>
                        {agent.department}
                      </TableCell>
                      <TableCell sx={{ color: NAVY, fontSize: "1.05rem" }}>
                        {dayjs(agent.createdAt).format("MMM DD, YYYY")}
                      </TableCell>
                      <TableCell sx={{ color: NAVY, fontSize: "1.05rem" }}>
                        <Chip label={agent.ticketSolved} color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: NAVY, fontSize: "1.1rem" }}>
                        No agents found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Agent Details Dialog */}
            <Dialog open={Boolean(selectedAgent)} onClose={handleAgentDialogClose}>
              <DialogTitle sx={{ color: NAVY }}>Agent Details</DialogTitle>
              <DialogContent>
                {selectedAgent && (
                  <Box sx={{ minWidth: 300 }}>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Name: <span style={{ fontWeight: 400 }}>{selectedAgent.name}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Username: <span style={{ fontWeight: 400 }}>{selectedAgent.username}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Department: <span style={{ fontWeight: 400 }}>{selectedAgent.department}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Tickets Solved: <span style={{ fontWeight: 400 }}>{selectedAgent.ticketSolved}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Organization: <span style={{ fontWeight: 400 }}>{selectedAgent.orgName}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: NAVY, fontWeight: 700 }}>
                      Created At: <span style={{ fontWeight: 400 }}>{dayjs(selectedAgent.createdAt).format("MMM DD, YYYY")}</span>
                    </Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleAgentDialogClose} sx={{ color: NAVY }}>
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {selectedIndex === 3 && (
          <DisplayTickets
            tickets={tickets}
            search={search.ticket}
            sortOrders={sortOrders}
            setSortOrders={setSortOrders}
            statusMapping={statusMapping}
            navigate={navigate}
            NAVY={NAVY}
            WHITE={WHITE}
            LIGHT_GREY={LIGHT_GREY}
            SELECT_BG={SELECT_BG}
          />
        )}

        {selectedIndex === 4 && (
          <Box>
            <Typography variant="h5" sx={{ color: NAVY, fontSize: "2rem" }}>
              Reports
            </Typography>
            <Typography variant="body1" mt={2} sx={{ color: NAVY, fontSize: "1.4rem" }}>
              Reports feature is coming soon.
            </Typography>
          </Box>
        )}

        {selectedIndex === 5 && <Knowledge orgName={adminData.orgName} />}
      </Box>

      {/* Dialogs */}
      <Dialog open={dialogs.logout} onClose={handleLogout.cancel}>
        <DialogTitle sx={{ color: NAVY }}>Confirm Logout</DialogTitle>
        <DialogContent sx={{ color: NAVY, fontSize: "1.2rem" }}>
          Are you sure you want to logout?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogout.cancel} sx={{ color: NAVY }}>
            Cancel
          </Button>
          <Button onClick={handleLogout.confirm} color="error" variant="contained" sx={{ bgcolor: NAVY, color: WHITE }}>
            Logout
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialogs.addUser}
        onClose={() => setDialogs(d => ({ ...d, addUser: false }))}
      >
        <DialogTitle sx={{ color: NAVY }}>Add New User</DialogTitle>
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogs(d => ({ ...d, addUser: false }))} sx={{ color: NAVY }}>
            Cancel
          </Button>
          <Button onClick={handleAddUser} variant="contained" sx={{ color: NAVY, bgcolor: WHITE, border: `1px solid ${NAVY}`, "&:hover": { bgcolor: SELECT_BG, color: WHITE } }}>
            Add User
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialogs.addAgent}
        onClose={() => setDialogs(d => ({ ...d, addAgent: false }))}
      >
        <DialogTitle sx={{ color: NAVY }}>Add New Agent</DialogTitle>
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
            }}
          />
          <TextField
            margin="dense"
            name="department"
            label="Department"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.department}
            onChange={handleFormChange}
            error={!!formErrors.department}
            helperText={formErrors.department}
            sx={{
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogs(d => ({ ...d, addAgent: false }))} sx={{ color: NAVY }}>
            Cancel
          </Button>
          <Button onClick={handleAddAgent} variant="contained" sx={{ color: NAVY, bgcolor: WHITE, border: `1px solid ${NAVY}`, "&:hover": { bgcolor: SELECT_BG, color: WHITE } }}>
            Add Agent
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialogs.addOrganization}
        onClose={() => setDialogs(d => ({ ...d, addOrganization: false }))}
      >
        <DialogTitle sx={{ color: NAVY }}>Add New Organization</DialogTitle>
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
            }}
          />
          <TextField
            margin="dense"
            name="field"
            label="Field"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.field}
            onChange={handleFormChange}
            error={!!formErrors.field}
            helperText={formErrors.field}
            sx={{
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
            }}
          />
          <TextField
            margin="dense"
            name="orgadmin_name"
            label="Admin Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.orgadmin_name}
            onChange={handleFormChange}
            error={!!formErrors.orgadmin_name}
            helperText={formErrors.orgadmin_name}
            sx={{
              "& .MuiInputBase-input": { color: NAVY },
              "& .MuiInputLabel-root": { color: NAVY },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG }
              }
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