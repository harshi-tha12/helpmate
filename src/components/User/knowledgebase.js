import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  useTheme,
  useMediaQuery,
  Collapse,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArticleIcon from "@mui/icons-material/Article";
import QuizIcon from "@mui/icons-material/Quiz";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";

// Blue palette consistent with ViewTickets
const palette = {
  mainBg: "#f4f8fc",
  headerBg: "#e0eafd",
  accent: "#1976d2",
  accentLight: "#e3f2fd",
  accentDark: "#115293",
  text: "#153570",
  border: "#b3c7e6",
};

const KnowledgeBase = ({ organization, type }) => {
  const [items, setItems] = useState({ articles: [], ticketRemarks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableOrgs, setAvailableOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(organization || "");
  const [expandedItemId, setExpandedItemId] = useState(null);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme?.breakpoints?.down("sm") ?? ((theme) => theme.breakpoints.down("sm")));

  // Normalize organization name
  const normalizeOrgName = (org) => {
    if (!org) return "";
    return org.toLowerCase().replace(/\s+/g, "_").replace(/\./g, "_");
  };

  // Fetch available organizations from knowledgeBase
  const fetchOrganizations = useCallback(async () => {
    try {
      const orgSnapshot = await getDocs(collection(db, "knowledgeBase"));
      const orgs = orgSnapshot.docs.map((doc) => doc.id);
      console.log("Available organizations:", orgs);
      setAvailableOrgs(orgs);
      if (orgs.length === 0) {
        setError("No organizations found in the knowledge base. Please contact support to set up your organization.");
      } else if (!organization && orgs.length > 0) {
        setSelectedOrg(orgs[0]);
        console.log("Selected default organization:", orgs[0]);
      } else if (orgs.includes(organization)) {
        setSelectedOrg(organization);
        console.log("Selected passed organization:", organization);
      } else if (organization) {
        const normalizedOrg = normalizeOrgName(organization);
        if (orgs.includes(normalizedOrg)) {
          setSelectedOrg(normalizedOrg);
          console.log("Selected normalized organization:", normalizedOrg);
        } else {
          setError(
            `Organization "${organization}" not found. Please select a valid organization.`
          );
          setSelectedOrg(orgs[0] || "");
          console.warn(
            `Organization "${organization}" not found. Available: ${orgs.join(", ")}`
          );
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      setError(`Failed to load organizations: ${error.message}`);
    }
  }, [organization]);

  // Fetch knowledge base for selected organization
  const fetchKnowledge = useCallback(async () => {
    if (!selectedOrg || !type) {
      setError("Please select a valid organization and type.");
      setLoading(false);
      console.warn("Missing selectedOrg or type:", { selectedOrg, type });
      return;
    }

    setLoading(true);
    setError("");
    setItems({ articles: [], ticketRemarks: [] });

    // Try both original and normalized org names
    const orgNamesToTry = [selectedOrg, normalizeOrgName(selectedOrg)];
    let dataFetched = false;
    let lastError = null;

    for (const org of orgNamesToTry) {
      try {
        if (type === "faq") {
          console.log(`Fetching FAQs from: knowledgeBase/${org}/faqs`);
          const querySnapshot = await getDocs(
            collection(db, "knowledgeBase", org, "faqs")
          );
          const data = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log(`FAQs found for ${org}: ${data.length}`);
          if (data.length > 0) {
            setItems({ articles: [], ticketRemarks: data });
            dataFetched = true;
            break;
          }
        } else if (type === "article") {
          console.log(`Fetching articles from: knowledgeBase/${org}/articles`);
          const articlesSnapshot = await getDocs(
            collection(db, "knowledgeBase", org, "articles")
          );
          const articleItems = articlesSnapshot.docs.map((doc) => ({
            id: doc.id,
            title: doc.data().title || "Untitled Article",
            content: doc.data().content || "No content provided.",
          }));
          console.log(`Articles found for ${org}: ${articleItems.length}`);
          if (articleItems.length > 0) {
            setItems({ articles: articleItems, ticketRemarks: [] });
            dataFetched = true;
            break;
          }
        }
      } catch (error) {
        lastError = error;
        console.error(`Error fetching ${type} for ${org}:`, error);
      }
    }

    if (!dataFetched) {
      setError(
        lastError
          ? `Failed to load ${type === "faq" ? "FAQs" : "Articles"} for ${selectedOrg}: ${lastError.message}`
          : `No ${type === "faq" ? "FAQs" : "Articles"} found for ${selectedOrg}.`
      );
    }
    setLoading(false);
    console.log("Loading state set to false");
  }, [selectedOrg, type]);

  useEffect(() => {
    console.log("Props received:", { organization, type });
    fetchOrganizations();
  }, [fetchOrganizations, organization, type]);

  useEffect(() => {
    if (selectedOrg) {
      fetchKnowledge();
    }
  }, [selectedOrg, type, fetchKnowledge]);

  const handleOrgChange = (event) => {
    setSelectedOrg(event.target.value);
    setExpandedItemId(null);
    console.log("Organization changed to:", event.target.value);
  };

  const handleToggle = (id) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const filteredItems = useMemo(() => ({
    articles: items.articles,
    ticketRemarks: items.ticketRemarks,
  }), [items]);

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2, md: 4 },
        py: { xs: 2, sm: 3, md: 4 },
        maxWidth: "1000px",
        mx: "auto",
        background: palette.mainBg,
        minHeight: "100vh",
      }}
      role="main"
      aria-label={`${type === "faq" ? "FAQs" : "Knowledge Articles"} section`}
    >
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'PT Serif', serif",
          color: palette.accent,
          fontWeight: "bold",
          letterSpacing: 1,
          fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
          mb: { xs: 2, sm: 3 },
          textAlign: "left",
        }}
        role="heading"
        aria-level="1"
      >
        {type === "faq" ? "Frequently Asked Questions" : "Knowledge Articles"}
      </Typography>

      {availableOrgs.length > 0 && (
        <FormControl
          fullWidth
          size="small"
          sx={{
            mb: { xs: 2, sm: 3 },
            maxWidth: { xs: "100%", sm: 340 },
          }}
        >
          <InputLabel
            id="org-select-label"
            sx={{
              fontFamily: "Outfit",
              color: palette.accent,
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
          >
            Organization
          </InputLabel>
          <Select
            labelId="org-select-label"
            value={selectedOrg}
            onChange={handleOrgChange}
            label="Organization"
            sx={{
              fontFamily: "Outfit",
              background: "#fff",
              borderRadius: 2,
              color: palette.accent,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: palette.border,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: palette.accent,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: palette.accentDark,
              },
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
            inputProps={{ "aria-label": "Select organization" }}
          >
            {availableOrgs.map((org) => (
              <MenuItem
                key={org}
                value={org}
                sx={{ fontFamily: "Outfit", fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
              >
                {org}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            fontFamily: "Outfit",
            background: "#e3e7ff",
            color: palette.accentDark,
            fontSize: { xs: "0.8rem", sm: "0.875rem" },
            borderRadius: 2,
            textAlign: "left",
          }}
        >
          {error}
          {availableOrgs.length > 0 && (
            <Typography
              variant="body2"
              sx={{
                mt: 1,
                fontFamily: "Outfit",
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
              }}
            >
              Available organizations: {availableOrgs.join(", ")}
            </Typography>
          )}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress sx={{ color: palette.accent }} size={32} />
        </Box>
      ) : isSmallScreen ? (
        <Box role="list" aria-label={`${type === "faq" ? "FAQ" : "Article"} list`}>
          {type === "faq" ? (
            filteredItems.ticketRemarks.length > 0 ? (
              filteredItems.ticketRemarks.map((item) => (
                <Card
                  key={item.id}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(18, 52, 153, 0.1)",
                    background: "#fff",
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
                        <QuizIcon sx={{ color: palette.accent, fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        <Typography
                          sx={{
                            fontFamily: "'PT Serif', serif",
                            fontWeight: 600,
                            color: palette.accent,
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                          }}
                        >
                          {item.question || "Untitled FAQ"}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={() => handleToggle(item.id)}
                        sx={{ color: palette.accent, minHeight: 48, minWidth: 48 }}
                        aria-label={`Toggle details for FAQ ${item.question || item.id}`}
                        aria-expanded={expandedItemId === item.id}
                      >
                        {expandedItemId === item.id ? (
                          <ExpandLessIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        ) : (
                          <ExpandMoreIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        )}
                      </IconButton>
                    </Box>
                    <Collapse in={expandedItemId === item.id} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 1, p: 1.5, background: palette.accentLight, borderRadius: 1 }}>
                        <Typography
                          sx={{
                            fontFamily: "'Roboto Slab', serif",
                            color: palette.text,
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                            lineHeight: 1.7,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {item.answer || "No answer provided."}
                        </Typography>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography
                sx={{
                  fontFamily: "Outfit",
                  color: palette.accent,
                  fontStyle: "italic",
                  textAlign: "center",
                  mt: 2,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                No FAQs found for {selectedOrg || "this organization"}.
              </Typography>
            )
          ) : (
            filteredItems.articles.length > 0 ? (
              filteredItems.articles.map((item) => (
                <Card
                  key={item.id}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(18, 52, 153, 0.1)",
                    background: "#fff",
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
                        <ArticleIcon sx={{ color: palette.accent, fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        <Typography
                          sx={{
                            fontFamily: "'PT Serif', serif",
                            fontWeight: 600,
                            color: palette.accent,
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                          }}
                        >
                          {item.title || "Untitled Article"}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={() => handleToggle(item.id)}
                        sx={{ color: palette.accent, minHeight: 48, minWidth: 48 }}
                        aria-label={`Toggle details for article ${item.title || item.id}`}
                        aria-expanded={expandedItemId === item.id}
                      >
                        {expandedItemId === item.id ? (
                          <ExpandLessIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        ) : (
                          <ExpandMoreIcon sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        )}
                      </IconButton>
                    </Box>
                    <Collapse in={expandedItemId === item.id} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 1, p: 1.5, background: palette.accentLight, borderRadius: 1 }}>
                        <Typography
                          sx={{
                            fontFamily: "'Roboto Slab', serif",
                            color: palette.text,
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                            lineHeight: 1.7,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {item.content || "No content provided."}
                        </Typography>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography
                sx={{
                  fontFamily: "Outfit",
                  color: palette.accent,
                  fontStyle: "italic",
                  textAlign: "center",
                  mt: 2,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                No Articles found for {selectedOrg || "this organization"}.
              </Typography>
            )
          )}
        </Box>
      ) : (
        <>
          {type === "faq" ? (
            filteredItems.ticketRemarks.length > 0 ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 4,
                  boxShadow: "0 4px 24px #b0c4e7",
                  overflowX: "auto",
                }}
                role="list"
                aria-label="FAQ list"
              >
                {filteredItems.ticketRemarks.map((item, index) => (
                  <Accordion
                    key={item.id}
                    TransitionProps={{ unmountOnExit: true }}
                    sx={{
                      borderRadius: 2,
                      boxShadow: "0 2px 8px rgba(18, 52, 153, 0.1)",
                      mb: 2,
                      backgroundColor: "#fff",
                      border: `1px solid ${palette.border}`,
                      "&:before": { display: "none" },
                      textAlign: "left",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: palette.accent, fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />}
                      aria-controls={`panel-${index}-content`}
                      id={`panel-${index}-header`}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <QuizIcon sx={{ color: palette.accent, fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                        <Typography
                          sx={{
                            fontFamily: "'PT Serif', serif",
                            fontWeight: 600,
                            color: palette.accent,
                            fontSize: { xs: "1rem", sm: "1.1rem", md: "1.2rem" },
                          }}
                        >
                          {item.question || "Untitled FAQ"}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{
                        backgroundColor: palette.accentLight,
                        px: { xs: 2, sm: 3 },
                        py: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: "'Roboto Slab', serif",
                          color: palette.text,
                          fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" },
                          lineHeight: 1.7,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {item.answer || "No answer provided."}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Paper>
            ) : (
              <Typography
                sx={{
                  fontFamily: "Outfit",
                  color: palette.accent,
                  fontStyle: "italic",
                  textAlign: "left",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  mt: 2,
                }}
              >
                No FAQs found for {selectedOrg || "this organization"}.
              </Typography>
            )
          ) : (
            <>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: "'PT Serif', serif",
                  color: palette.accent,
                  fontWeight: 600,
                  mt: 2,
                  mb: 2,
                  fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
                }}
              >
                Articles
              </Typography>
              {filteredItems.articles.length > 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    boxShadow: "0 4px 24px #b0c4e7",
                    overflowX: "auto",
                    mb: 4,
                  }}
                  role="list"
                  aria-label="Article list"
                >
                  {filteredItems.articles.map((item, index) => (
                    <Accordion
                      key={item.id}
                      TransitionProps={{ unmountOnExit: true }}
                      sx={{
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(18, 52, 153, 0.1)",
                        mb: 2,
                        backgroundColor: "#fff",
                        border: `1px solid ${palette.border}`,
                        "&:before": { display: "none" },
                        textAlign: "left",
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: palette.accent, fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />}
                        aria-controls={`panel-${index}-content`}
                        id={`panel-${index}-header`}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <ArticleIcon sx={{ color: palette.accent, fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                          <Typography
                            sx={{
                              fontFamily: "'PT Serif', serif",
                              fontWeight: 600,
                              color: palette.accent,
                              fontSize: { xs: "1rem", sm: "1.1rem", md: "1.2rem" },
                            }}
                          >
                            {item.title || "Untitled Article"}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails
                        sx={{
                          backgroundColor: palette.accentLight,
                          px: { xs: 2, sm: 3 },
                          py: 2,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: "'Roboto Slab', serif",
                            color: palette.text,
                            fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" },
                            lineHeight: 1.7,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {item.content || "No content provided."}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Paper>
              ) : (
                <Typography
                  sx={{
                    fontFamily: "Outfit",
                    color: palette.accent,
                    fontStyle: "italic",
                    textAlign: "left",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    mb: 4,
                  }}
                >
                  No Articles found for {selectedOrg || "this organization"}.
                </Typography>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default KnowledgeBase;