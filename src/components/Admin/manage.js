import React, { useEffect, useState } from "react";
import {
  Box, Typography, TextField, Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Button,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, IconButton, useMediaQuery, useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { collection, getDocs, setDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase";

const SLA_PRIORITIES = [
  { priority: "High", default: { days: 0, hours: 12, minutes: 0 } },
  { priority: "Medium", default: { days: 1, hours: 12, minutes: 0 } },
  { priority: "Low", default: { days: 3, hours: 0, minutes: 0 } },
];

const Manage = ({ manageType, organization, NAVY, WHITE, LIGHT_GREY, SELECT_BG }) => {
  const [items, setItems] = useState([]);
  const [agents, setAgents] = useState([]);
  const [formData, setFormData] = useState({
    slaPriority: "",
    days: 0,
    hours: 0,
    minutes: 0,
    departmentId: "",
    name: "",
    services: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const orgPrefix = `${organization}.`;

  // Get suffix from a prefixed ID
  const getSuffix = (id) => {
    return id && id.startsWith(orgPrefix) ? id.slice(orgPrefix.length) : id;
  };

  // SLASettings: use orgname.priority for doc ID
  const getSLAId = (priority) => `${organization}.${priority}`;

  // Check for duplicate departmentId or slaPriority, including cross-collection check
  const checkDuplicate = async (type, id) => {
    const collectionName = type === "department" ? "Departments" : "SLASettings";
    const oppositeCollection = type === "department" ? "SLASettings" : "Departments";
    const fieldName = type === "department" ? "departmentId" : "priority";
    const oppositeFieldName = type === "department" ? "priority" : "departmentId";
    const prefixedId = id.startsWith(orgPrefix) ? id : `${orgPrefix}${id}`;

    // Check within the same collection
    const sameCollectionQuery = query(
      collection(db, collectionName),
      where("orgName", "==", organization),
      where(fieldName, "==", id)
    );
    const sameCollectionSnapshot = await getDocs(sameCollectionQuery);
    if (!sameCollectionSnapshot.empty) {
      return { isDuplicate: true, source: collectionName };
    }

    // Check in the opposite collection
    const oppositeCollectionQuery = query(
      collection(db, oppositeCollection),
      where("orgName", "==", organization),
      where(oppositeFieldName, "==", prefixedId)
    );
    const oppositeCollectionSnapshot = await getDocs(oppositeCollectionQuery);
    if (!oppositeCollectionSnapshot.empty) {
      return { isDuplicate: true, source: oppositeCollection };
    }

    return { isDuplicate: false, source: null };
  };

  // Fetch departments or SLA settings and agents
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (manageType === "sla") {
          // SLA logic
          let fetchedItems = [];
          // Try to fetch all SLASettings for this org
          const q = query(
            collection(db, "SLASettings"),
            where("orgName", "==", organization)
          );
          const snapshot = await getDocs(q);
          const existingSLA = {};
          snapshot.docs.forEach(docRef => {
            const data = docRef.data();
            existingSLA[data.priority] = {
              id: docRef.id,
              ...data,
            };
          });

          // Ensure all three priorities (High, Medium, Low) exist, add missing with default
          for (const { priority, default: def } of SLA_PRIORITIES) {
            const slaId = getSLAId(priority);
            let item;
            if (existingSLA[priority]) {
              // If a field is missing (days/hours/minutes), update with defaults
              let needsUpdate = false;
              let updatedData = { ...existingSLA[priority] };
              ["days", "hours", "minutes"].forEach((field) => {
                if (
                  updatedData[field] === undefined ||
                  updatedData[field] === null
                ) {
                  updatedData[field] = def[field];
                  needsUpdate = true;
                }
              });
              // Store defaults if not present
              if (needsUpdate) {
                await setDoc(doc(db, "SLASettings", slaId), updatedData);
              }
              item = updatedData;
            } else {
              item = {
                id: slaId,
                slaId,
                priority,
                days: def.days,
                hours: def.hours,
                minutes: def.minutes,
                orgName: organization,
                createdAt: new Date(),
              };
              // Create missing one in Firestore
              await setDoc(doc(db, "SLASettings", slaId), item);
            }
            fetchedItems.push(item);
          }

          setItems(fetchedItems);
        } else {
          // Department logic
          const collectionName = "Departments";
          const q = query(
            collection(db, collectionName),
            where("orgName", "==", organization)
          );
          const snapshot = await getDocs(q);
          let fetchedItems = snapshot.docs.map(doc => {
            const data = doc.data();
            const services = Array.isArray(data.services)
              ? data.services
              : typeof data.services === "string"
                ? data.services.split(",").map(s => s.trim())
                : [];
            return {
              id: doc.id,
              ...data,
              services,
            };
          });
          setItems(fetchedItems);

          // Fetch agents for department view
          const usersSnapshot = await getDocs(collection(db, "Users"));
          const fetchedAgents = usersSnapshot.docs
            .map(doc => ({
              username: doc.id,
              department: doc.data().department || "N/A",
              orgName: doc.data().orgName || "Not Assigned",
              role: doc.data().role || "user",
            }))
            .filter(agent => agent.role === "agent" && agent.orgName === organization);
          setAgents(fetchedAgents);
        }
      } catch (error) {
        setMessage(`Failed to fetch ${manageType}s. Please try again.`);
      }
    };
    fetchData();
  }, [manageType, organization]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Validate form inputs
  const validateForm = async () => {
    const errors = {};
    if (manageType === "sla") {
      if (formData.days === 0 && formData.hours === 0 && formData.minutes === 0) {
        errors.time = "At least one time field must be greater than 0!";
      }
    } else if (manageType === "department") {
      if (!formData.departmentId.trim()) {
        errors.departmentId = "Department ID suffix is required!";
      }
      if (!formData.name.trim()) errors.name = "Department Name is required!";
      if (!formData.services.trim()) errors.services = "Services are required!";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Edit SLA setting
  const handleEditItem = async () => {
    if (!(await validateForm())) return;
    try {
      const { slaPriority, days, hours, minutes } = formData;
      const priority = slaPriority;
      const slaId = getSLAId(priority);

      // Always save all fields including the default values
      const itemData = {
        slaId,
        priority,
        days: parseInt(days),
        hours: parseInt(hours),
        minutes: parseInt(minutes),
        orgName: organization,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "SLASettings", slaId), itemData);
      setItems((prev) =>
        prev.map((item) =>
          item.priority === priority ? { ...item, ...itemData } : item
        )
      );
      setMessage("SLA setting updated successfully!");
      setFormData({
        slaPriority: "",
        days: 0,
        hours: 0,
        minutes: 0,
        departmentId: "",
        name: "",
        services: "",
      });
      setDialogOpen(false);
      setFormErrors({});
      setEditingItem(null);
    } catch (error) {
      setMessage("Failed to update SLA setting. Please try again.");
    }
  };

  // Edit Department
  const handleEditDepartment = async () => {
    if (!(await validateForm())) return;
    try {
      const prefixedDepartmentId = `${orgPrefix}${formData.departmentId}`;
      const compositeId = `${organization}_${formData.departmentId}`;
      const itemData = {
        departmentId: prefixedDepartmentId,
        name: formData.name,
        services: formData.services.split(",").map(service => service.trim()),
        orgName: organization,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "Departments", compositeId), itemData);
      setItems((prev) =>
        prev.map((item) =>
          item.id === compositeId ? { id: compositeId, ...itemData } : item
        )
      );
      setMessage("Department updated successfully!");
      setFormData({
        slaPriority: "",
        days: 0,
        hours: 0,
        minutes: 0,
        departmentId: "",
        name: "",
        services: "",
      });
      setDialogOpen(false);
      setFormErrors({});
      setEditingItem(null);
    } catch (error) {
      setMessage("Failed to update department. Please try again.");
    }
  };

  // Add Department (unchanged)
  const handleAddDepartment = async () => {
    if (!(await validateForm())) return;
    try {
      const prefixedDepartmentId = `${orgPrefix}${formData.departmentId}`;
      const compositeId = `${organization}_${formData.departmentId}`;
      const itemData = {
        departmentId: prefixedDepartmentId,
        name: formData.name,
        services: formData.services.split(",").map(service => service.trim()),
        orgName: organization,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "Departments", compositeId), itemData);
      setItems((prev) => [...prev, { id: compositeId, ...itemData }]);
      setMessage("Department added successfully!");
      setFormData({
        slaPriority: "",
        days: 0,
        hours: 0,
        minutes: 0,
        departmentId: "",
        name: "",
        services: "",
      });
      setAddDialogOpen(false);
      setFormErrors({});
    } catch (error) {
      setMessage("Failed to add department. Please try again.");
    }
  };

  // Delete a department (unchanged)
  const handleDeleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, "Departments", id));
      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage("Department deleted successfully!");
    } catch (error) {
      setMessage("Failed to delete department. Please try again.");
    }
  };

  // Open edit dialog
  const openEditDialog = (item) => {
    if (manageType === "sla") {
      setFormData({
        slaPriority: item.priority || "",
        days: item.days || 0,
        hours: item.hours || 0,
        minutes: item.minutes || 0,
        departmentId: "",
        name: "",
        services: "",
      });
    } else {
      setFormData({
        slaPriority: "",
        days: 0,
        hours: 0,
        minutes: 0,
        departmentId: item.departmentId ? getSuffix(item.departmentId) : "",
        name: item.name || "",
        services: Array.isArray(item.services) ? item.services.join(", ") : "",
      });
    }
    setEditingItem(item);
    setDialogOpen(true);
  };

  // Open add dialog (unchanged)
  const openAddDialog = () => {
    setFormData({
      slaPriority: "",
      days: 0,
      hours: 0,
      minutes: 0,
      departmentId: "",
      name: "",
      services: "",
    });
    setAddDialogOpen(true);
  };

  // Handle message timeout
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Generate time options for SLA settings
  const generateTimeOptions = (max) =>
    Array.from({ length: max + 1 }, (_, i) => (
      <MenuItem key={i} value={i}>
        {i}
      </MenuItem>
    ));

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: LIGHT_GREY }}>
      <Typography
        variant="h5"
        mb={2}
        sx={{
          color: NAVY,
          fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
        }}
      >
        {manageType === "department" ? "Manage Departments" : "Manage SLA Settings"}
      </Typography>
      {message && (
        <Box
          sx={{
            position: { xs: "fixed", sm: "relative" },
            top: { xs: 60, sm: 0 },
            left: { xs: "50%", sm: 0 },
            transform: { xs: "translateX(-50%)", sm: "none" },
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
      {manageType === "department" && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAddDialog}
          sx={{
            mb: 2,
            bgcolor: NAVY,
            color: WHITE,
            "&:hover": { bgcolor: SELECT_BG },
            fontSize: { xs: "0.8rem", sm: "0.9rem" },
          }}
        >
          Add Department
        </Button>
      )}
      <TableContainer
        component={Paper}
        sx={{
          mt: 2,
          borderRadius: 3,
          boxShadow: "0 2px 8px 0 #e3f2fd",
          overflowX: "auto",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: SELECT_BG }}>
              <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}>
                Serial No.
              </TableCell>
              {manageType === "department" ? (
                <>
                  <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}>
                    Department ID
                  </TableCell>
                  <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}>
                    Name
                  </TableCell>
                  <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}>
                    Services
                  </TableCell>
                  <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}>
                    Agents
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}>
                    Priority
                  </TableCell>
                  <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}>
                    Response Time
                  </TableCell>
                </>
              )}
              <TableCell sx={{ color: WHITE, fontWeight: 700, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id || item.slaId} sx={{ "&:hover": { backgroundColor: SELECT_BG, color: WHITE } }}>
                <TableCell sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" } }}>
                  {index + 1}
                </TableCell>
                {manageType === "department" ? (
                  <>
                    <TableCell sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" } }}>
                      {item.departmentId}
                    </TableCell>
                    <TableCell sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" } }}>
                      {item.name}
                    </TableCell>
                    <TableCell sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" } }}>
                      {Array.isArray(item.services) ? item.services.join(", ") : "None"}
                    </TableCell>
                    <TableCell sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" } }}>
                      {agents.filter(agent => agent.department === item.name).map(agent => agent.username).join(", ") || "None"}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => openEditDialog(item)}
                        sx={{ color: NAVY, "&:hover": { color: WHITE } }}
                        aria-label={`Edit department ${item.id}`}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteItem(item.id)}
                        sx={{ color: NAVY, "&:hover": { color: WHITE } }}
                        aria-label={`Delete department ${item.id}`}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" } }}>
                      {item.priority}
                    </TableCell>
                    <TableCell sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.05rem" } }}>
                      {item.days} days, {item.hours} hours, {item.minutes} minutes
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => openEditDialog(item)}
                        sx={{ color: NAVY, "&:hover": { color: WHITE } }}
                        aria-label={`Edit SLA ${item.slaId || item.id}`}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={manageType === "department" ? 6 : 4}
                  align="center"
                  sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1.1rem" } }}
                >
                  No {manageType === "department" ? "departments" : "SLA settings"} found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingItem(null);
          setFormData({ slaPriority: "", days: 0, hours: 0, minutes: 0, departmentId: "", name: "", services: "" });
        }}
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
        <DialogTitle sx={{ color: NAVY, fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" } }}>
          {manageType === "department" ? "Edit Department" : "Edit SLA Setting"}
        </DialogTitle>
        <DialogContent>
          {manageType === "sla" ? (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <Typography sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                  {orgPrefix}
                </Typography>
                <TextField
                  margin="dense"
                  name="slaPriority"
                  label="Priority"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.slaPriority}
                  InputProps={{ readOnly: true }}
                  // Priority is autofill and readonly
                  sx={{
                    "& .MuiInputBase-input": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: NAVY },
                      "&:hover fieldset": { borderColor: SELECT_BG },
                      "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                <Select
                  name="days"
                  value={formData.days}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  label="Days"
                  sx={{
                    "& .MuiSelect-select": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: NAVY },
                      "&:hover fieldset": { borderColor: SELECT_BG },
                      "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                    },
                  }}
                >
                  {generateTimeOptions(30)}
                </Select>
                <Select
                  name="hours"
                  value={formData.hours}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  label="Hours"
                  sx={{
                    "& .MuiSelect-select": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: NAVY },
                      "&:hover fieldset": { borderColor: SELECT_BG },
                      "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                    },
                  }}
                >
                  {generateTimeOptions(23)}
                </Select>
                <Select
                  name="minutes"
                  value={formData.minutes}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  label="Minutes"
                  sx={{
                    "& .MuiSelect-select": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: NAVY },
                      "&:hover fieldset": { borderColor: SELECT_BG },
                      "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                    },
                  }}
                >
                  {generateTimeOptions(59)}
                </Select>
              </Box>
              {formErrors.time && (
                <Typography color="error" sx={{ fontSize: { xs: "0.75rem", sm: "0.8rem" }, mt: 0.5 }}>
                  {formErrors.time}
                </Typography>
              )}
            </>
          ) : (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <Typography sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                  {orgPrefix}
                </Typography>
                <TextField
                  margin="dense"
                  name="departmentId"
                  label="Department ID Suffix"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  error={!!formErrors.departmentId}
                  helperText={formErrors.departmentId || "Enter the department ID suffix (e.g., IT)"}
                  sx={{
                    "& .MuiInputBase-input": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: NAVY },
                      "&:hover fieldset": { borderColor: SELECT_BG },
                      "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                    },
                  }}
                />
              </Box>
              <TextField
                margin="dense"
                name="name"
                label="Department Name"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={handleInputChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
                sx={{
                  "& .MuiInputBase-input": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                  "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: NAVY },
                    "&:hover fieldset": { borderColor: SELECT_BG },
                    "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                  },
                }}
              />
              <TextField
                margin="dense"
                name="services"
                label="Services (comma-separated)"
                type="text"
                fullWidth
                variant="outlined"
                multiline
                rows={3}
                value={formData.services}
                onChange={handleInputChange}
                error={!!formErrors.services}
                helperText={formErrors.services}
                sx={{
                  "& .MuiInputBase-input": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                  "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: NAVY },
                    "&:hover fieldset": { borderColor: SELECT_BG },
                    "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                  },
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setEditingItem(null);
              setFormData({ slaPriority: "", days: 0, hours: 0, minutes: 0, departmentId: "", name: "", services: "" });
            }}
            sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" }, minWidth: { xs: 80, sm: 100 } }}
          >
            Cancel
          </Button>
          <Button
            onClick={manageType === "department" ? handleEditDepartment : handleEditItem}
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
            {manageType === "department" ? "Save Department" : "Save SLA"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setFormData({ slaPriority: "", days: 0, hours: 0, minutes: 0, departmentId: "", name: "", services: "" });
        }}
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
        <DialogTitle sx={{ color: NAVY, fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" } }}>
          Add New Department
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Typography sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
              {orgPrefix}
            </Typography>
            <TextField
              margin="dense"
              name="departmentId"
              label="Department ID Suffix"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.departmentId}
              onChange={handleInputChange}
              error={!!formErrors.departmentId}
              helperText={formErrors.departmentId || "Enter the department ID suffix (e.g., IT)"}
              sx={{
                "& .MuiInputBase-input": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: NAVY },
                  "&:hover fieldset": { borderColor: SELECT_BG },
                  "&.Mui-focused fieldset": { borderColor: SELECT_BG },
                },
              }}
            />
          </Box>
          <TextField
            margin="dense"
            name="name"
            label="Department Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
            error={!!formErrors.name}
            helperText={formErrors.name}
            sx={{
              "& .MuiInputBase-input": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
              "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: NAVY },
                "&:hover fieldset": { borderColor: SELECT_BG },
                "&.Mui-focused fieldset": { borderColor: SELECT_BG },
              },
            }}
          />
          <TextField
            margin="dense"
            name="services"
            label="Services (comma-separated)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={formData.services}
            onChange={handleInputChange}
            error={!!formErrors.services}
            helperText={formErrors.services}
            sx={{
              "& .MuiInputBase-input": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
              "& .MuiInputLabel-root": { color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
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
            onClick={() => {
              setAddDialogOpen(false);
              setFormData({ slaPriority: "", days: 0, hours: 0, minutes: 0, departmentId: "", name: "", services: "" });
            }}
            sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" }, minWidth: { xs: 80, sm: 100 } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddDepartment}
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
            Add Department
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default Manage;