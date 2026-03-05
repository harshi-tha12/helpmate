import React, { useState, useEffect, useRef } from "react";
import {
  TextField, Typography, MenuItem, Button, Paper, IconButton, Box,
  FormLabel, Alert, Dialog, DialogTitle, DialogContent, CircularProgress, Fade
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTheme, useMediaQuery } from "@mui/material";
import { db } from "../../firebase.js";
import { doc, setDoc, Timestamp, getDoc } from "firebase/firestore";
import Confetti from "react-confetti";
import { prioritizeTickets } from '../../api/aipriority';
import { getAiSuggestions } from "../../api/aisuggest";

const MAX_FILE_SIZE = 750 * 1024; // 750KB, to fit Firestore 1MiB limit after Base64 encoding

const CreateTicketForm = ({ onClose, username }) => {
  const [ticketId, setTicketId] = useState("");
  const [type, setType] = useState("");
  const [problem, setProblem] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slogan, setSlogan] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [organization, setOrganization] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [problemError, setProblemError] = useState(false);
  const [typeError, setTypeError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme?.breakpoints?.down("sm") ?? ((theme) => theme.breakpoints.down("sm")));

  // Debounce for suggestion API
  const debounceTimeout = useRef();

  useEffect(() => {
    setTicketId("TICKET-" + Date.now());
    // Fetch user organization
    const fetchUserOrg = async () => {
      if (!username) {
        setError("User not logged in. Cannot fetch organization.");
        return;
      }
      try {
        const userRef = doc(db, "Users", username);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const orgName = userData.orgName || userData.organization || "";
          if (!orgName) {
            setError("Organization not set in user profile. Please contact admin.");
          }
          setOrganization(orgName);
        } else {
          setError("User not found in the database.");
        }
      } catch (error) {
        console.error("Error fetching user organization:", error);
        setError("Failed to fetch user organization. Please try again.");
      }
    };
    fetchUserOrg();
  }, [username]);

  useEffect(() => {
    // Auto-fetch suggestions as description changes
    if (description.length >= 10 && organization) {
      setSuggestionsLoading(true);
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(async () => {
        try {
          const aiSugs = await getAiSuggestions({ description, organization });
          setSuggestions(aiSugs || []);
        } catch (e) {
          console.warn("Failed to fetch AI suggestions:", e);
          setSuggestions([]);
        } finally {
          setSuggestionsLoading(false);
        }
      }, 600); // Debounce by 600ms
    } else {
      setSuggestions([]);
      setSuggestionsLoading(false);
    }
    return () => clearTimeout(debounceTimeout.current);
  }, [description, organization]);

  const handleIgnoreSuggestions = () => {
    setShowSuggestions(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/pdf",
      ];
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("File size exceeds 750KB limit for Firestore storage. Please choose a smaller file.");
        setFile(null);
        setFileName("");
        return;
      }
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Only PNG, JPG, JPEG, WEBP, and PDF files are allowed.");
        setFile(null);
        setFileName("");
        return;
      }
      setError("");
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  // Helper to convert file to base64 string
  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result); // returns "data:<mime>;base64,<base64string>"
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setProblemError(false);
    setTypeError(false);
    setDescriptionError(false);

    // Validate required fields
    let hasError = false;
    if (!problem) {
      setProblemError(true);
      setError("Please fill all required fields.");
      hasError = true;
    }
    if (!type) {
      setTypeError(true);
      setError("Please fill all required fields.");
      hasError = true;
    }
    if (!description) {
      setDescriptionError(true);
      setError("Please fill all required fields.");
      hasError = true;
    }
    if (hasError) {
      setLoading(false);
      return;
    }

    if (!username) {
      setError("User not logged in. Cannot submit ticket.");
      setLoading(false);
      return;
    }

    if (problem.length > 100) {
      setError("Problem title must be 100 characters or less.");
      setProblemError(true);
      setLoading(false);
      return;
    }

    try {
      let fileUrl = "";
      if (file) {
        fileUrl = await toBase64(file);
      }

      // Get user info
      const userRef = doc(db, "Users", username);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setError("User not found in the database.");
        setLoading(false);
        return;
      }
      const userData = userSnap.data();
      const organization = userData.orgName || userData.organization;
      if (!organization) {
        setError("Organization not set in user profile. Please contact admin.");
        setLoading(false);
        return;
      }

      // Get AI prioritization
      let priority = "Medium";
      let resolutionTime = "3 business days";
      let reason = "";
      try {
        const priorityArr = await prioritizeTickets([
          { problem, description, type },
        ]);
        const aiResult = priorityArr?.[0] || {};
        priority = aiResult.priority || "Medium";
        resolutionTime = aiResult.resolutionTime || "3 business days";
        reason = aiResult.reason || "";
      } catch (aiError) {
        console.warn("AI prioritization failed, using defaults:", aiError);
      }

      // Fetch SLA settings from root collection for the organization based on priority
      let slaSlogan = "We're here to help you quickly!";
      let days = 0, hours = 0, minutes = 0;
      try {
        const slaId = `${organization}.${priority}`;
        const slaRef = doc(db, "SLASettings", slaId);
        const slaSnap = await getDoc(slaRef);
        if (slaSnap.exists()) {
          const slaData = slaSnap.data();
          days = slaData.days ?? 0;
          hours = slaData.hours ?? 0;
          minutes = slaData.minutes ?? 0;
          slaSlogan = slaData.slogan || slaSlogan;
        } else {
          console.warn(`No SLA settings found for ${organization} and priority ${priority}. Using defaults.`);
        }
      } catch (slaError) {
        console.warn("Failed to fetch SLA settings:", slaError);
      }

      // Combine response time into a single string (e.g., "1day,2hours,5minutes")
      let combinedResponseTime = "";
      if (days > 0) combinedResponseTime += `${days}day${days > 1 ? 's' : ''},`;
      if (hours > 0) combinedResponseTime += `${hours}hour${hours > 1 ? 's' : ''},`;
      if (minutes > 0) combinedResponseTime += `${minutes}minute${minutes > 1 ? 's' : ''}`;
      // Remove trailing comma if it exists
      combinedResponseTime = combinedResponseTime.replace(/,$/, '');
      if (!combinedResponseTime) combinedResponseTime = "0day"; // Fallback if all are zero
      setResponseTime(combinedResponseTime);
      setSlogan(slaSlogan);

      // Use resolutionTime from getAiSuggestions if available in suggestions
      let aiResolutionTime = "3 business days"; // Default
      if (suggestions.length > 0 && suggestions[0].resolutionTime) {
        aiResolutionTime = suggestions[0].resolutionTime;
      }

      const ticketData = {
        ticketId,
        type,
        problem,
        description,
        createdAt: Timestamp.now(),
        createdBy: username,
        status: "Pending",
        organization,
        priority: { priority, reason }, // Store priority as object
        resolutionTime: resolutionTime,
        responseTime: combinedResponseTime,
      };

      // Attach fileUrl if present
      if (fileUrl) {
        ticketData.fileUrl = fileUrl;
        ticketData.fileName = fileName;
        ticketData.fileType = file?.type || "";
      }

      await setDoc(doc(db, "tickets", ticketId), ticketData);

      setSuccessOpen(true);
      setTimeout(() => {
        setSuccessOpen(false);
        setType("");
        setProblem("");
        setDescription("");
        setFile(null);
        setFileName("");
        setSlogan("");
        setResponseTime("");
        setSuggestions([]);
        setShowSuggestions(true);
        if (onClose) onClose();
      }, 5000);
    } catch (error) {
      console.error("Error submitting ticket:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Inline AI Suggestion Card rendering
  const renderSuggestions = () => {
    if (!showSuggestions || suggestionsLoading) return null;
    if (!suggestions.length) {
      return (
        <Box sx={{ my: 2, p: 2, border: "1px solid #b3c6e0", borderRadius: "8px", background: "#f6faff" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#123499", mb: 1 }}>
            No similar past solutions found.
          </Typography>
          <Button onClick={handleIgnoreSuggestions} color="primary" variant="outlined" sx={{ mt: 1 }}>
            Hide
          </Button>
        </Box>
      );
    }
    return (
      <Box sx={{ my: 2, p: 2, border: "1px solid #b3c6e0", borderRadius: "8px", background: "#f6faff" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#123499", mb: 1 }}>
          Related Past Solutions:
        </Typography>
        <ul style={{ paddingLeft: 0, listStyle: "none" }}>
          {suggestions.map((s) => (
            <li key={s.ticketId} style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8, borderRadius: 6 }}>
              <strong>Problem:</strong> {s.problem}<br />
              <strong>Solution:</strong> {s.remarks}<br />
              <small>Similarity: {(s.similarity * 100).toFixed(1)}%</small>
            </li>
          ))}
        </ul>
        <Button onClick={handleIgnoreSuggestions} color="primary" variant="outlined" sx={{ mt: 1 }}>
          Hide Suggestions
        </Button>
      </Box>
    );
  };

  return (
    <>
      <Fade in={true} timeout={600}>
        <Paper
          elevation={6}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: { xs: "95%", sm: 600, md: 700 },
            mx: "auto",
            mt: { xs: 2, sm: 3, md: 4 },
            background: "linear-gradient(135deg, #E6F0FA 0%, #F5F5F5 100%)",
            borderRadius: "16px",
            fontFamily: "'Outfit', sans-serif",
            position: "relative",
            boxShadow: "0 8px 24px rgba(18, 52, 153, 0.15)",
            boxSizing: "border-box",
          }}
          role="form"
          aria-label="Create New Ticket Form"
        >
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{
                position: "absolute",
                top: { xs: 8, sm: 12 },
                right: { xs: 8, sm: 12 },
                color: "#123499",
                "&:hover": { bgcolor: "#DDE9FF" },
                minWidth: 48,
                minHeight: 48,
              }}
              aria-label="Close Form"
            >
              <CloseIcon />
            </IconButton>
          )}

          <Typography
            variant="h4"
            gutterBottom
            sx={{
              textAlign: "center",
              color: "#123499",
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "0.5px",
              fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
            }}
          >
            Create a New Ticket
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{
              mb: { xs: 2, sm: 3 },
              textAlign: "center",
              color: "#123499",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Ticket ID: <strong>{ticketId}</strong>
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
              <FormLabel
                htmlFor="problem-title"
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}
              >
                Problem Title*
              </FormLabel>
              <TextField
                id="problem-title"
                placeholder="Enter the problem title"
                fullWidth
                required
                value={problem}
                onChange={(e) => {
                  setProblem(e.target.value);
                  setProblemError(false);
                }}
                variant="outlined"
                error={problemError}
                inputProps={{ maxLength: 100, "aria-label": "Problem Title" }}
                aria-describedby={problemError ? "error-message" : undefined}
                InputLabelProps={{ required: true }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover fieldset": { borderColor: "#123499" },
                    "&.Mui-focused fieldset": { borderColor: "#0e287d" },
                    minHeight: 48,
                  },
                  "& .MuiInputBase-input": {
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
              <FormLabel
                htmlFor="type-of-problem"
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}
              >
                Type of Problem*
              </FormLabel>
              <TextField
                id="type-of-problem"
                select
                fullWidth
                required
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setTypeError(false);
                }}
                variant="outlined"
                error={typeError}
                inputProps={{ "aria-label": "Type of Problem" }}
                InputLabelProps={{ required: true }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover fieldset": { borderColor: "#123499" },
                    "&.Mui-focused fieldset": { borderColor: "#0e287d" },
                    minHeight: 48,
                  },
                  "& .MuiInputBase-input": {
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  },
                }}
              >
                <MenuItem value="Software">Software</MenuItem>
                <MenuItem value="Hardware">Hardware</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
              <FormLabel
                htmlFor="description"
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}
              >
                Description*
              </FormLabel>
              <TextField
                id="description"
                placeholder="Describe the issue in detail"
                multiline
                rows={isSmallScreen ? 3 : 4}
                fullWidth
                required
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setShowSuggestions(true); // re-enable suggestions if user starts typing again
                  setDescriptionError(false);
                }}
                inputProps={{ maxLength: 500, "aria-label": "Description" }}
                aria-describedby={descriptionError ? "error-message" : undefined}
                variant="outlined"
                error={descriptionError}
                InputLabelProps={{ required: true }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover fieldset": { borderColor: "#123499" },
                    "&.Mui-focused fieldset": { borderColor: "#0e287d" },
                  },
                  "& .MuiInputBase-input": {
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: "right",
                  color: "#123499",
                  fontFamily: "'Outfit', sans-serif",
                  mt: 0.5,
                  fontSize: { xs: "0.75rem", sm: "0.8rem" },
                }}
              >
                {description.length}/500
              </Typography>
            </Box>

            {/* --- AI Suggestions Display --- */}
            {suggestionsLoading && (
              <Box sx={{ my: 2, display: "flex", alignItems: "center" }}>
                <CircularProgress size={20} sx={{ mr: 1 }} /> Checking for similar tickets...
              </Box>
            )}
            {renderSuggestions()}

            <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
              <FormLabel
                htmlFor="file-upload"
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}
              >
                Attach File (PNG, PNG, WEBP, PDF)
              </FormLabel>
              <Button
                variant="outlined"
                component="label"
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  borderColor: "#123499",
                  borderRadius: "8px",
                  textTransform: "none",
                  py: 1,
                  px: { xs: 1.5, sm: 2 },
                  minHeight: 48,
                  "&:hover": {
                    borderColor: "#0e287d",
                    bgcolor: "#DDE9FF",
                  },
                }}
                aria-label="Choose File"
              >
                {fileName || "Choose File"}
                <input
                  id="file-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  hidden
                  onChange={handleFileChange}
                  aria-describedby={error && error.includes("File") ? "error-message" : undefined}
                />
              </Button>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                }}
              >
                Maximum file size allowed: <strong>750KB</strong><br />
                Only PNG, JPG, JPEG, WEBP, and PDF files are supported.
              </Typography>
              {fileName && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  }}
                >
                  Selected: {fileName}
                </Typography>
              )}
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  fontFamily: "'Outfit', sans-serif",
                  borderRadius: "8px",
                  bgcolor: "#FFEBEE",
                  color: "#D32F2F",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
                id="error-message"
              >
                {error}
              </Alert>
            )}

            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: { xs: 2, sm: 3 } }}>
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  borderColor: "#123499",
                  borderRadius: "10px",
                  fontWeight: 600,
                  px: { xs: 2, sm: 3 },
                  py: 1,
                  minHeight: 48,
                  "&:hover": {
                    borderColor: "#0e287d",
                    bgcolor: "#DDE9FF",
                  },
                }}
                aria-label="Cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  background: "linear-gradient(45deg, #123499 30%, #0e287d 90%)",
                  color: "#fff",
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  px: { xs: 3, sm: 4 },
                  py: 1,
                  minHeight: 48,
                  borderRadius: "10px",
                  boxShadow: "0 4px 12px rgba(18, 52, 153, 0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0 6px 16px rgba(18, 52, 153, 0.4)",
                    background: "linear-gradient(45deg, #0e287d 30%, #123499 90%)",
                  },
                  "&:disabled": {
                    background: "#B0C4DE",
                    color: "#fff",
                    boxShadow: "none",
                  },
                }}
                aria-label="Submit Ticket"
                aria-describedby={error ? "error-message" : undefined}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Submit Ticket"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Fade>

      <Dialog
        open={successOpen}
        TransitionComponent={Fade}
        transitionDuration={600}
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            background: "linear-gradient(135deg, #E6F0FA 0%, #F5F5F5 100%)",
            boxShadow: "0 8px 24px rgba(18, 52, 153, 0.2)",
            maxWidth: { xs: "90%", sm: 400 },
            textAlign: "center",
            overflow: "hidden",
            position: "relative",
          },
        }}
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description"
      >
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={50}
          recycle={false}
          run={successOpen}
          tweenDuration={3000}
          colors={["#123499", "#0e287d", "#DDE9FF"]}
        />
        <DialogTitle
          id="success-dialog-title"
          sx={{
            fontFamily: "'Outfit', sans-serif",
            color: "#123499",
            fontWeight: 600,
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
            pt: { xs: 2, sm: 3 },
          }}
        >
          Ticket Submitted Successfully
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 3, sm: 4 }, fontFamily: "'Outfit', sans-serif" }}>
          <CheckCircleIcon
            sx={{ fontSize: { xs: 50, sm: 60 }, color: "#123499", mb: 2 }}
            role="img"
            aria-label="Success Icon"
          />
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: "'Outfit', sans-serif",
              color: "#123499",
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
              fontStyle: "italic",
              mb: 1,
            }}
          >
            {slogan || "We're here to help you quickly!"}
          </Typography>
          <Typography
            id="success-dialog-description"
            sx={{
              fontFamily: "'Outfit', sans-serif",
              color: "#123499",
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
            }}
          >
            Your ticket is in our system, and we aim to respond within {responseTime || "0day"}.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateTicketForm;