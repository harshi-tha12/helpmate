import React, { useState, useEffect } from "react";
import {
  TextField,
  Typography,
  MenuItem,
  Button,
  Paper,
  IconButton,
  Box,
  FormLabel,
  Alert,
  Dialog,
  DialogContent,
  CircularProgress,
  Fade,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { db } from "../../firebase.js";
import { doc, setDoc, Timestamp, getDoc } from "firebase/firestore";
import axios from "axios";
import Confetti from "react-confetti";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/diogwsroa/upload";
const UPLOAD_PRESET = "helpmate_upload";

const CreateTicketForm = ({ onClose, username }) => {
  const [ticketId, setTicketId] = useState("");
  const [type, setType] = useState("");
  const [problem, setProblem] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTicketId("TICKET-" + Date.now());
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/pdf",
      ];
      if (selectedFile.size > maxSize) {
        setError("File size exceeds 10MB limit.");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!username) {
      setError("User not logged in. Cannot submit ticket.");
      setLoading(false);
      return;
    }

    try {
      let fileUrl = "";
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("resource_type", "auto");

        const uploadResponse = await axios.post(CLOUDINARY_URL, formData, {
          timeout: 30000,
        });

        if (!uploadResponse.data.secure_url) {
          throw new Error("File upload failed: No secure_url returned.");
        }
        fileUrl = uploadResponse.data.secure_url;
      }

      // Fetch organization from Users/{username} doc
      const userRef = doc(db, "Users", username);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setError("User not found in the database.");
        setLoading(false);
        return;
      }
      const userData = userSnap.data();
      // FIX: Try both orgName and organization, prefer orgName if available
      const organization = userData.orgName || userData.organization;
      if (!organization) {
        setError("Organization not set in user profile. Please contact admin.");
        setLoading(false);
        return;
      }

      const ticketData = {
        ticketId,
        type,
        problem,
        department,
        description,
        fileUrl,
        createdAt: Timestamp.now(),
        createdBy: username,
        status: "Pending",
        organization, // This is stored as organization: orgname
      };

      await setDoc(doc(db, "tickets", ticketId), ticketData);

      setSuccessOpen(true);
      setTimeout(() => {
        setSuccessOpen(false);
        setType("");
        setProblem("");
        setDepartment("");
        setDescription("");
        setFile(null);
        setFileName("");
        if (onClose) onClose();
      }, 3000);
    } catch (error) {
      console.error("Error submitting ticket:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Fade in={true} timeout={600}>
        <Paper
          elevation={6}
          sx={{
            p: 4,
            maxWidth: 700,
            mx: "auto",
            mt: 4,
            background: "linear-gradient(135deg, #E6F0FA 0%, #F5F5F5 100%)",
            borderRadius: "16px",
            fontFamily: "'Outfit', sans-serif",
            position: "relative",
            boxShadow: "0 8px 24px rgba(18, 52, 153, 0.15)",
          }}
        >
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                color: "#123499",
                "&:hover": { bgcolor: "#DDE9FF" },
              }}
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
            }}
          >
            Create a New Ticket
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{
              mb: 3,
              textAlign: "center",
              color: "#123499",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
            }}
          >
            Ticket ID: <strong>{ticketId}</strong>
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2.5 }}>
              <FormLabel
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                Problem Title
              </FormLabel>
              <TextField
                placeholder="Enter the problem title"
                fullWidth
                required
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover fieldset": {
                      borderColor: "#123499",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#0e287d",
                    },
                  },
                  "& .MuiInputBase-input": {
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <FormLabel
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                Type of Problem
              </FormLabel>
              <TextField
                select
                fullWidth
                required
                value={type}
                onChange={(e) => setType(e.target.value)}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover fieldset": {
                      borderColor: "#123499",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#0e287d",
                    },
                  },
                  "& .MuiInputBase-input": {
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                  },
                }}
              >
                <MenuItem value="Software">Software</MenuItem>
                <MenuItem value="Hardware">Hardware</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <FormLabel
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                Department
              </FormLabel>
              <TextField
                placeholder="Enter the department"
                fullWidth
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover fieldset": {
                      borderColor: "#123499",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#0e287d",
                    },
                  },
                  "& .MuiInputBase-input": {
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <FormLabel
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                Description
              </FormLabel>
              <TextField
                placeholder="Describe the issue in detail"
                multiline
                rows={4}
                fullWidth
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover fieldset": {
                      borderColor: "#123499",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#0e287d",
                    },
                  },
                  "& .MuiInputBase-input": {
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <FormLabel
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "#123499",
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                Attach File (PNG, JPG, WEBP, PDF)
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
                  px: 2,
                  "&:hover": {
                    borderColor: "#0e287d",
                    bgcolor: "#DDE9FF",
                  },
                }}
              >
                {fileName || "Choose File"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {fileName && (
                <Typography
                  sx={{
                    mt: 1,
                    fontFamily: "'Outfit', sans-serif",
                    color: "#123499",
                    fontSize: "0.9rem",
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
                }}
              >
                {error}
              </Alert>
            )}

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  background: "linear-gradient(45deg, #123499 30%, #0e287d 90%)",
                  color: "#fff",
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: "1rem",
                  px: 4,
                  py: 1.5,
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
            maxWidth: 400,
            textAlign: "center",
            overflow: "hidden",
          },
        }}
      >
        <Confetti
          width={400}
          height={300}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
          colors={["#123499", "#0e287d", "#DDE9FF", "#FFFFFF"]}
        />
        <DialogContent sx={{ p: 4, fontFamily: "'Outfit', sans-serif" }}>
          <CheckCircleIcon
            sx={{ fontSize: 60, color: "#123499", mb: 2 }}
          />
          <Typography
            variant="h5"
            sx={{
              fontFamily: "'Outfit', sans-serif",
              color: "#123499",
              fontWeight: 600,
              mb: 1,
            }}
          >
            Ticket Submitted Successfully!
          </Typography>
          <Typography
            sx={{
              fontFamily: "'Outfit', sans-serif",
              color: "#123499",
              fontSize: "1.1rem",
            }}
          >
            Your ticket is in our system, and our team is on the case!
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateTicketForm;