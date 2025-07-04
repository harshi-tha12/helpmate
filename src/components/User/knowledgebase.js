import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Collapse,
  Paper
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";

const KnowledgeBase = ({ type }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(null); // For toggling open item

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const path = type === "faq" ? "knowledgeBase/faqs/items" : "knowledgeBase/articles/items";
        const querySnapshot = await getDocs(collection(db, path));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching knowledge base data:", error);
        setLoading(false);
      }
    };

    fetchKnowledge();
  }, [type]);

  const handleToggle = index => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontFamily: "'PT Serif', serif", color: "#123499" }}
      >
        {type === "faq" ? "Frequently Asked Questions" : "Knowledge Articles"}
      </Typography>

      {loading ? (
        <CircularProgress color="primary" />
      ) : (
        <List>
          {items.length > 0 ? (
            items.map((item, index) => (
              <Paper
                key={item.id}
                elevation={2}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: "#f9f9f9",
                  transition: "all 0.3s",
                  "&:hover": {
                    backgroundColor: "#f0f0ff",
                    cursor: "pointer"
                  }
                }}
              >
                <ListItem onClick={() => handleToggle(index)}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="h6"
                        sx={{
                          fontFamily: "'Playfair Display', serif",
                          color: "#0A2472"
                        }}
                      >
                        {type === "faq" ? item.question : item.title}
                      </Typography>
                    }
                  />
                </ListItem>
                <Collapse in={openIndex === index} timeout="auto" unmountOnExit>
                  <Box sx={{ px: 3, pb: 2 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontFamily: "'PT Serif', serif",
                        color: "#333",
                        whiteSpace: "pre-line"
                      }}
                    >
                      {type === "faq" ? item.answer : item.content}
                    </Typography>
                  </Box>
                </Collapse>
              </Paper>
            ))
          ) : (
            <Typography>No {type === "faq" ? "FAQs" : "Articles"} found.</Typography>
          )}
        </List>
      )}
    </Box>
  );
};

export default KnowledgeBase;
