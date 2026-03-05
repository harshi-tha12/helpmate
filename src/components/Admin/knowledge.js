import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, TextField, Button, IconButton, List,
  ListItem, ListItemText, Divider, Snackbar, Alert, useTheme, useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../../firebase.js';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

/**
 * Pass orgName or orgId as a prop for correct org separation!
 * Example: <Knowledge orgName="orgName1" />
 */
const Knowledge = ({ orgName }) => {
  const [tab, setTab] = useState(0);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <600px

  const handleTabChange = (event, newValue) => setTab(newValue);

  const fetchData = async () => {
    if (!orgName) return; // Don't fetch if orgName not set
    const faqsSnap = await getDocs(collection(db, 'knowledgeBase', orgName, 'faqs'));
    const articlesSnap = await getDocs(collection(db, 'knowledgeBase', orgName, 'articles'));
    setFaqs(faqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setArticles(articlesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [orgName]);

  const handleAddFaq = async () => {
    if (!faqQuestion || !faqAnswer || !orgName) return;
    await addDoc(collection(db, 'knowledgeBase', orgName, 'faqs'), { question: faqQuestion, answer: faqAnswer });
    setFaqQuestion('');
    setFaqAnswer('');
    setSuccessMessage('FAQ added successfully!');
    fetchData();
  };

  const handleAddArticle = async () => {
    if (!articleTitle || !articleContent || !orgName) return;
    await addDoc(collection(db, 'knowledgeBase', orgName, 'articles'), { title: articleTitle, content: articleContent });
    setArticleTitle('');
    setArticleContent('');
    setSuccessMessage('Article added successfully!');
    fetchData();
  };

  const handleDelete = async (type, id) => {
    await deleteDoc(doc(db, 'knowledgeBase', orgName, type, id));
    fetchData();
  };

  if (!orgName) {
    return (
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant={isMobile ? "body1" : "h6"}>
          Please select an organization to manage its Knowledge Base.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 3, md: 4 },
        maxWidth: 800,
        margin: "0 auto",
        bgcolor: "#f4f6f8",
        borderRadius: { xs: 0, sm: 3 },
        minHeight: "80vh",
      }}
    >
      <Typography
        variant={isMobile ? "h5" : "h4"}
        gutterBottom
        sx={{ fontFamily: 'Playfair Display', textAlign: isMobile ? "center" : "left" }}
      >
        Knowledge Base Management
      </Typography>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
      <Paper
        sx={{
          mb: 3,
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
        }}
        elevation={isMobile ? 0 : 2}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered={!isMobile}
          variant={isMobile ? "fullWidth" : "standard"}
        >
          <Tab label="Manage FAQs" sx={{ fontSize: { xs: "0.95rem", sm: "1.05rem" } }} />
          <Tab label="Manage Articles" sx={{ fontSize: { xs: "0.95rem", sm: "1.05rem" } }} />
        </Tabs>
      </Paper>
      {tab === 0 && (
        <Box>
          <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 1 }}>
            Add FAQ
          </Typography>
          <TextField
            fullWidth
            label="Question"
            value={faqQuestion}
            onChange={(e) => setFaqQuestion(e.target.value)}
            sx={{ mb: 2 }}
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            fullWidth
            label="Answer"
            multiline
            rows={isMobile ? 2 : 3}
            value={faqAnswer}
            onChange={(e) => setFaqAnswer(e.target.value)}
            sx={{ mb: 2 }}
            size={isMobile ? "small" : "medium"}
          />
          <Button
            variant="contained"
            onClick={handleAddFaq}
            sx={{ width: isMobile ? "100%" : "auto", mb: 2 }}
          >
            Add FAQ
          </Button>
          <Divider sx={{ my: 3 }} />
          <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 1 }}>
            Existing FAQs
          </Typography>
          <List dense={isMobile}>
            {faqs.length === 0 && (
              <Typography color="text.secondary" sx={{ ml: 2, fontSize: isMobile ? "0.95rem" : "1rem" }}>
                No FAQs added yet.
              </Typography>
            )}
            {faqs.map((faq) => (
              <ListItem
                key={faq.id}
                alignItems={isMobile ? "flex-start" : "center"}
                sx={{
                  borderBottom: "1px solid #e0e0e0",
                  px: { xs: 1, sm: 2 },
                  py: { xs: 0.5, sm: 1.2 },
                  flexDirection: isMobile ? "column" : "row",
                }}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleDelete('faqs', faq.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={<span style={{ fontWeight: 600, fontSize: isMobile ? "1rem" : "1.08rem" }}>{faq.question}</span>}
                  secondary={<span style={{ fontSize: isMobile ? "0.97rem" : "1.05rem" }}>{faq.answer}</span>}
                  sx={{ mb: isMobile ? 1 : 0 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      {tab === 1 && (
        <Box>
          <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 1 }}>
            Add Article
          </Typography>
          <TextField
            fullWidth
            label="Title"
            value={articleTitle}
            onChange={(e) => setArticleTitle(e.target.value)}
            sx={{ mb: 2 }}
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            fullWidth
            label="Content"
            multiline
            rows={isMobile ? 3 : 5}
            value={articleContent}
            onChange={(e) => setArticleContent(e.target.value)}
            sx={{ mb: 2 }}
            size={isMobile ? "small" : "medium"}
          />
          <Button
            variant="contained"
            onClick={handleAddArticle}
            sx={{ width: isMobile ? "100%" : "auto", mb: 2 }}
          >
            Add Article
          </Button>
          <Divider sx={{ my: 3 }} />
          <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 1 }}>
            Existing Articles
          </Typography>
          <List dense={isMobile}>
            {articles.length === 0 && (
              <Typography color="text.secondary" sx={{ ml: 2, fontSize: isMobile ? "0.95rem" : "1rem" }}>
                No articles added yet.
              </Typography>
            )}
            {articles.map((article) => (
              <ListItem
                key={article.id}
                alignItems={isMobile ? "flex-start" : "center"}
                sx={{
                  borderBottom: "1px solid #e0e0e0",
                  px: { xs: 1, sm: 2 },
                  py: { xs: 0.5, sm: 1.2 },
                  flexDirection: isMobile ? "column" : "row",
                }}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleDelete('articles', article.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={<span style={{ fontWeight: 600, fontSize: isMobile ? "1rem" : "1.08rem" }}>{article.title}</span>}
                  secondary={<span style={{ fontSize: isMobile ? "0.97rem" : "1.05rem" }}>{article.content}</span>}
                  sx={{ mb: isMobile ? 1 : 0 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default Knowledge;