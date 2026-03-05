import React, { useState, useEffect } from "react";
import {
    Box, Typography, Card, CardContent, Collapse, TextField, Button, FormControl, InputLabel,
    Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const AdminSettings = ({ username, themeMode: propThemeMode, setThemeMode, onLogout }) => {
    const [localThemeMode, setLocalThemeMode] = useState(propThemeMode || "light");
    const [expandedSection, setExpandedSection] = useState(null);
    const [profileData, setProfileData] = useState({ name: "", profilePicture: null });
    const [passwordData, setPasswordData] = useState({
        currentUsername: username,
        newUsername: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [usernameError, setUsernameError] = useState("");
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Theme configuration
    const themeOptions = {
        light: createTheme({ palette: { mode: "light" } }),
        dark: createTheme({ palette: { mode: "dark" } }),
        device: createTheme({ palette: { mode: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" } }),
    };

    // Sync localThemeMode with propThemeMode
    useEffect(() => {
    if (propThemeMode && themeOptions[propThemeMode]) {
        setLocalThemeMode(propThemeMode);
    }
}, [propThemeMode, themeOptions]);

useEffect(() => {
    const fetchAdminData = async () => {
        try {
            const userRef = doc(db, "Users", username);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();

                if (data.role === "admin") {
                    setProfileData({
                        name: data.name || "",
                        profilePicture: data.profilePicture || null,
                    });

                    setPasswordData((prev) => ({
                        ...prev,
                        currentUsername: username,
                    }));

                    if (data.theme && themeOptions[data.theme]) {
                        setLocalThemeMode(data.theme);
                        setThemeMode(data.theme);
                    }

                } else {
                    setErrorMessage("Access denied: User is not an admin.");
                }

            } else {
                setErrorMessage("Admin data not found.");
            }

        } catch (error) {
            setErrorMessage("Failed to load admin data: " + error.message);
        }
    };

    fetchAdminData();
}, [username, setThemeMode, themeOptions]);


    const handleSectionToggle = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
        setSuccessMessage("");
        setErrorMessage("");
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData({ ...profileData, [name]: value });
    };

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        setProfileData({ ...profileData, profilePicture: reader.result });
                    } else {
                        setErrorMessage("Failed to read image file.");
                    }
                };
                reader.onerror = () => {
                    setErrorMessage("Error reading image file.");
                };
                reader.readAsDataURL(file);
            } catch (error) {
                setErrorMessage("Failed to upload profile picture: " + error.message);
            }
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData({ ...passwordData, [name]: value });
        if (name === "newUsername") {
            if (value.length > 10) {
                setUsernameError("Username cannot exceed 10 characters.");
            } else {
                setUsernameError("");
            }
        }
        if (name === "newPassword" || name === "confirmPassword") {
            validatePassword(name, value);
        }
    };

    const validatePassword = (name, value) => {
        const password = name === "newPassword" ? value : passwordData.newPassword;
        const confirmPassword = name === "confirmPassword" ? value : passwordData.confirmPassword;
        const errors = {};

        if (password) {
            if (password.length < 6 || password.length > 15) {
                errors.newPassword = "Password must be between 6 and 15 characters.";
            } else if (!/[A-Z]/.test(password)) {
                errors.newPassword = "Password must contain at least one uppercase letter.";
            } else if (!/[0-9]/.test(password)) {
                errors.newPassword = "Password must contain at least one number.";
            } else if (!/[!@#$%^&*]/.test(password)) {
                errors.newPassword = "Password must contain at least one special character.";
            }
        }

        if (password && confirmPassword && password !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match.";
        }

        setPasswordErrors(errors);
    };

    const handleProfileSubmit = async () => {
        try {
            const userRef = doc(db, "Users", username);
            const profileDataToSave = {
                name: profileData.name,
                profilePicture: profileData.profilePicture || null,
                role: "admin",
            };
            await setDoc(userRef, profileDataToSave, { merge: true });
            setSuccessMessage("Profile updated successfully.");
            setErrorMessage("");
        } catch (error) {
            setErrorMessage("Failed to update profile: " + error.message);
        }
    };

    const handleUsernameSubmit = async () => {
        if (usernameError) {
            setErrorMessage("Please fix the username error before submitting.");
            return;
        }
        if (!passwordData.newUsername) {
            setErrorMessage("New username is required.");
            return;
        }

        try {
            const oldUserRef = doc(db, "Users", username);
            const userSnap = await getDoc(oldUserRef);
            if (!userSnap.exists()) {
                setErrorMessage("User data not found.");
                return;
            }

            const userData = userSnap.data();
            const newUserRef = doc(db, "Users", passwordData.newUsername);

            await setDoc(
                newUserRef,
                {
                    username: passwordData.newUsername,
                    password: userData.password,
                    name: userData.name || profileData.name,
                    profilePicture: userData.profilePicture || profileData.profilePicture,
                    role: "admin",
                    orgName: userData.orgName,
                    theme: userData.theme || localThemeMode,
                },
                { merge: true }
            );

            await deleteDoc(oldUserRef);

            sessionStorage.setItem("username", passwordData.newUsername);
            setPasswordData((prev) => ({ ...prev, currentUsername: passwordData.newUsername, newUsername: "" }));
            setSuccessMessage("Username updated successfully.");
            setErrorMessage("");
        } catch (error) {
            setErrorMessage("Failed to update username: " + error.message);
        }
    };

    const handlePasswordSubmit = async () => {
        if (Object.keys(passwordErrors).length > 0) {
            setErrorMessage("Please fix the password errors before submitting.");
            return;
        }
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setErrorMessage("All password fields are required.");
            return;
        }

        try {
            const userRef = doc(db, "Users", username);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists() || userSnap.data().password !== passwordData.currentPassword) {
                setErrorMessage("Current password is incorrect.");
                return;
            }

            await setDoc(
                userRef,
                {
                    password: passwordData.newPassword,
                    passwordChange: false, // Add this to set passwordChange to false
                    role: "admin",
                },
                { merge: true }
            );

            setSuccessMessage("Password updated successfully.");
            setErrorMessage("");
            setPasswordData((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));
        } catch (error) {
            setErrorMessage("Failed to update password: " + error.message);
        }
    };

    const handleThemeChange = (e) => {
        const newTheme = e.target.value;
        setLocalThemeMode(newTheme);
        setThemeMode(newTheme);
        const userRef = doc(db, "Users", username);
        setDoc(userRef, { theme: newTheme }, { merge: true });
    };

    const handleLogoutClick = () => {
        if (onLogout) {
            onLogout();
        } else {
            setLogoutDialogOpen(true);
        }
    };

    const handleLogoutConfirm = () => {
        setLogoutDialogOpen(false);
        sessionStorage.removeItem("username");
        window.location.href = "/Login";
    };

    const currentTheme = themeOptions[localThemeMode] || themeOptions.light;

    return (
        <ThemeProvider theme={currentTheme}>
            <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 600 }, mx: "auto", p: { xs: 2, sm: 3 } }}>
                <Typography
                    variant="h5"
                    sx={{
                        mb: 3,
                        color: "#123499",
                        fontSize: { xs: "1.2rem", sm: "1.4rem" },
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                    }}
                >
                    Admin Settings
                </Typography>

                {/* Profile Information */}
                <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)", p: 2 }}>
                    <CardContent
                        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                        onClick={() => handleSectionToggle("profile")}
                    >
                        <Typography
                            sx={{ fontWeight: 600, fontSize: { xs: "1rem", sm: "1.1rem" }, color: "#1976D2" }}
                        >
                            Profile Information
                        </Typography>

                    </CardContent>
                    <Collapse in={expandedSection === "profile"} timeout="auto" unmountOnExit>
                        <CardContent sx={{ p: 0 }}>
                            <Box sx={{ mb: 3, textAlign: "center" }}>
                                <Typography variant="body2" sx={{ mb: 2, color: "#444", fontFamily: "'Inter', sans-serif" }}>
                                    Profile Picture
                                </Typography>
                                <label htmlFor="profile-picture-upload">
                                    <input
                                        id="profile-picture-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfilePictureChange}
                                        style={{ display: "none" }}
                                    />
                                    <Box
                                        sx={{
                                            width: 120,
                                            height: 120,
                                            border: "2px dashed #1976D2",
                                            borderRadius: 8,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            mx: "auto",
                                            mb: 2,
                                            "&:hover": { backgroundColor: "#e9f3fa" },
                                        }}
                                    >
                                        {profileData.profilePicture ? (
                                            <img
                                                src={profileData.profilePicture}
                                                alt="Profile Preview"
                                                style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 4 }}
                                            />
                                        ) : (
                                            <Typography color="text.secondary">Upload Image</Typography>
                                        )}
                                    </Box>
                                </label>
                                <TextField
                                    fullWidth
                                    label="Name"
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleProfileChange}
                                    sx={{ mb: 2 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleProfileSubmit}
                                    sx={{ mt: 2, width: "100%", maxWidth: 200, mx: "auto", display: "block" }}
                                >
                                    Save Profile
                                </Button>
                            </Box>
                        </CardContent>
                    </Collapse>
                </Card>

                {/* Change Password */}
                <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}>
                    <CardContent
                        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                        onClick={() => handleSectionToggle("password")}
                    >
                        <Typography
                            sx={{ fontWeight: 600, fontSize: { xs: "1rem", sm: "1.1rem" }, color: "#1976D2" }}
                        >
                            Change Password
                        </Typography>
                        {expandedSection === "password" ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </CardContent>
                    <Collapse in={expandedSection === "password"} timeout="auto" unmountOnExit>
                        <CardContent>
                            <Box sx={{ mb: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Current Username"
                                    value={passwordData.currentUsername}
                                    disabled
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="New Username"
                                    name="newUsername"
                                    value={passwordData.newUsername}
                                    onChange={handlePasswordChange}
                                    error={!!usernameError}
                                    helperText={usernameError || "Maximum 10 characters."}
                                    sx={{ mb: 2 }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleUsernameSubmit}
                                    sx={{ mt: 1, width: "100%", maxWidth: 200 }}
                                >
                                    Save Username
                                </Button>
                            </Box>
                            <Box>
                                <TextField
                                    fullWidth
                                    label="Current Password"
                                    name="currentPassword"
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="New Password"
                                    name="newPassword"
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    error={!!passwordErrors.newPassword}
                                    helperText={passwordErrors.newPassword}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Confirm Password"
                                    name="confirmPassword"
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    error={!!passwordErrors.confirmPassword}
                                    helperText={passwordErrors.confirmPassword}
                                    sx={{ mb: 2 }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ mb: 2, color: "#444", fontFamily: "'Inter', sans-serif" }}
                                >
                                    Password must be 6-15 characters long, include at least one uppercase letter, one number, and one special character.
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handlePasswordSubmit}
                                    sx={{ mt: 1, width: "100%", maxWidth: 200 }}
                                >
                                    Save Password
                                </Button>
                            </Box>
                        </CardContent>
                    </Collapse>
                </Card>

                {/* Change Theme */}
                <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}>
                    <CardContent
                        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                        onClick={() => handleSectionToggle("theme")}
                    >
                        <Typography
                            sx={{ fontWeight: 600, fontSize: { xs: "1rem", sm: "1.1rem" }, color: "#1976D2" }}
                        >
                            Change Theme
                        </Typography>
                        {expandedSection === "theme" ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </CardContent>
                    <Collapse in={expandedSection === "theme"} timeout="auto" unmountOnExit>
                        <CardContent>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Theme</InputLabel>
                                <Select
                                    value={localThemeMode}
                                    onChange={handleThemeChange}
                                    label="Theme"
                                >
                                    <MenuItem value="light">Light</MenuItem>
                                    <MenuItem value="dark">Dark</MenuItem>
                                    <MenuItem value="device">Device</MenuItem>
                                </Select>
                            </FormControl>
                        </CardContent>
                    </Collapse>
                </Card>

                {/* Logout */}
                <Card sx={{ mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}>
                    <CardContent
                        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                        onClick={() => handleSectionToggle("logout")}
                    >
                        <Typography
                            sx={{ fontWeight: 600, fontSize: { xs: "1rem", sm: "1.1rem" }, color: "#1976D2" }}
                        >
                            Logout
                        </Typography>
                        {expandedSection === "logout" ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </CardContent>
                    <Collapse in={expandedSection === "logout"} timeout="auto" unmountOnExit>
                        <CardContent>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleLogoutClick}
                                sx={{ mt: 1, width: "100%", maxWidth: 200 }}
                            >
                                Logout
                            </Button>
                        </CardContent>
                    </Collapse>
                </Card>

                {/* Success/Error Messages */}
                {successMessage && (
                    <Typography color="success.main" sx={{ mt: 2, fontFamily: "'Inter', sans-serif" }}>
                        {successMessage}
                    </Typography>
                )}
                {errorMessage && (
                    <Typography color="error.main" sx={{ mt: 2, fontFamily: "'Inter', sans-serif" }}>
                        {errorMessage}
                    </Typography>
                )}

                {/* Logout Confirmation Dialog */}
                <Dialog
                    open={logoutDialogOpen}
                    onClose={() => setLogoutDialogOpen(false)}
                    sx={{ "& .MuiDialog-paper": { maxWidth: { xs: "90%", sm: 400 } } }}
                >
                    <DialogTitle sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                        Confirm Logout
                    </DialogTitle>
                    <DialogContent>
                        <Typography sx={{ fontFamily: "'Inter', sans-serif" }}>
                            Are you sure you want to logout?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setLogoutDialogOpen(false)}
                            color="primary"
                            sx={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLogoutConfirm}
                            color="error"
                            variant="contained"
                            sx={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            Logout
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </ThemeProvider>
    );
};

export default AdminSettings;