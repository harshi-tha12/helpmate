
import React, { useEffect, useState } from "react";
import {
  Box, Typography, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, IconButton, useMediaQuery, useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";

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

  // Fetch departments or SLA settings and agents
  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionName = manageType === "department" ? "Departments" : "SLASettings";
        const snapshot = await getDocs(collection(db, "Organizations", organization, collectionName));
        let fetchedItems = snapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure services is an array, handling string or missing values
          const services = Array.isArray(data.services) ? data.services : 
                          typeof data.services === "string" ? data.services.split(",").map(s => s.trim()) : [];
          return {
            id: doc.id,
            ...data,
            services, // Override with normalized array
          };
        });

        // If SLA settings are empty, initialize with default values
        if (manageType === "sla" && fetchedItems.length === 0) {
          const defaultSLAs = [
            { id: "High", priority: "High", days: 0, hours: 12, minutes: 0 },
            { id: "Medium", priority: "Medium", days: 1, hours: 0, minutes: 0 },
            { id: "Low", priority: "Low", days: 2, hours: 0, minutes: 0 },
          ];
          
          for (const sla of defaultSLAs) {
            await setDoc(doc(db, "Organizations", organization, "SLASettings", sla.id), {
              priority: sla.priority,
              days: sla.days,
              hours: sla.hours,
              minutes: sla.minutes,
              createdAt: new Date(),
            });
          }
          fetchedItems = defaultSLAs;
        }
        
        setItems(fetchedItems);

        // Fetch agents for department view
        if (manageType === "department") {
          const usersSnapshot = await getDocs(collection(db, "Users"));
          const fetchedAgents = usersSnapshot.docs
            .map(doc => ({
              username: doc.id,
              department: doc.data().department || "N/A",
              orgName: doc.data().orgName || "Not Assigned",
              role: doc.data().role || "user",
            }))
            .filter(agent => agent.role === "agent" && agent.orgName.toLowerCase() === organization.toLowerCase());
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
  const validateForm = () => {
    const errors = {};
    if (manageType === "sla") {
      if (formData.days === 0 && formData.hours === 0 && formData.minutes === 0) {
        errors.time = "At least one time field must be greater than 0!";
      }
    } else if (manageType === "department") {
      if (!formData.departmentId.trim()) errors.departmentId = "Department ID is required!";
      if (!formData.name.trim()) errors.name = "Department Name is required!";
      if (!formData.services.trim()) errors.services = "Services are required!";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Edit SLA setting
  const handleEditItem = async () => {
    if (!validateForm()) return;
    try {
      const itemData = {
        priority: formData.slaPriority,
        days: parseInt(formData.days),
        hours: parseInt(formData.hours),
        minutes: parseInt(formData.minutes),
        createdAt: new Date(),
      };
      
      await setDoc(doc(db, "Organizations", organization, "SLASettings", formData.slaPriority), itemData);
      setItems((prev) => 
        prev.map((item) => 
          item.id === formData.slaPriority ? { id: formData.slaPriority, ...itemData } : item
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

  // Add Department
  const handleAddDepartment = async () => {
    if (!validateForm()) return;
    try {
      const itemData = {
        departmentId: formData.departmentId,
        name: formData.name,
        services: formData.services.split(",").map(service => service.trim()),
        createdAt: new Date(),
      };
      
      await setDoc(doc(db, "Organizations", organization, "Departments", formData.departmentId), itemData);
      setItems((prev) => [...prev, { id: formData.departmentId, ...itemData }]);
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

  // Delete a department
  const handleDeleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, "Organizations", organization, "Departments", id));
      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage("Department deleted successfully!");
    } catch (error) {
      setMessage("Failed to delete department. Please try again.");
    }
  };

  // Open edit dialog
  const openEditDialog = (item) => {
    setFormData({
      slaPriority: item.priority,
      days: item.days,
      hours: item.hours,
      minutes: item.minutes,
    });
    setEditingItem(item);
    setDialogOpen(true);
  };

  // Open add dialog
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
            {items.map((item) => (
              <TableRow key={item.id} sx={{ "&:hover": { backgroundColor: SELECT_BG, color: WHITE } }}>
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
                        aria-label={`Edit SLA ${item.id}`}
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
                  colSpan={manageType === "department" ? 5 : 3}
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
          setFormData({ slaPriority: "", days: 0, hours: 0, minutes: 0, departmentID: "", name: "", services: "" });
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
          Edit SLA Setting
        </DialogTitle>
        <DialogContent>
          {manageType === "department" ? (
            <>
              <TextField
                margin="dense"
                name="departmentId"
                label="Department ID"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.departmentID}
                onChange={handleInputChange}
                error={!!formErrors.departmentID}
                helperText={formErrors.departmentID}
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
          ) : (
            <>
              <Typography sx={{ color: NAVY, mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
                Priority: {formData.slaPriority}
              </Typography>
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
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setEditingItem(null);
              setFormData({ slaPriority: "", days: 0, hours: 0, minutes: 0, departmentID: "", name: "", services: "" });
            }}
            sx={{ color: NAVY, fontSize: { xs: "0.8rem", sm: "0.9rem" }, minWidth: { xs: 80, sm: 100 } }}
          >
            Cancel
          </Button>
          <Button
            onClick={manageType === "department" ? handleEditItem : handleEditItem}
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
          setFormData({ slaPriority: "", days: 0, hours: 0, minutes: 0, departmentID: "", name: "", services: "" });
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
          <TextField
            margin="dense"
            name="departmentId"
            label="Department Id"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.departmentId}
            onChange={handleInputChange}
            error={!!formErrors.departmentId}
            helperText={formErrors.departmentId}
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
              setFormData({ slaPriority: "", days: 0, hours: 0, minutes: 0, departmentID: "", name: "", services: "" });
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