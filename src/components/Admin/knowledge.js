import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../../firebase.js';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const Knowledge = () => {
  const [tab, setTab] = useState(0);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const fetchData = async () => {
    const faqsSnap = await getDocs(collection(db, 'knowledgeBase', 'faqs', 'items'));
    const articlesSnap = await getDocs(collection(db, 'knowledgeBase', 'articles', 'items'));
    setFaqs(faqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setArticles(articlesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFaq = async () => {
    if (!faqQuestion || !faqAnswer) return;
    await addDoc(collection(db, 'knowledgeBase', 'faqs', 'items'), { question: faqQuestion, answer: faqAnswer });
    setFaqQuestion('');
    setFaqAnswer('');
    setSuccessMessage('FAQ added successfully!');
    fetchData();
  };

  const handleAddArticle = async () => {
    if (!articleTitle || !articleContent) return;
    await addDoc(collection(db, 'knowledgeBase', 'articles', 'items'), { title: articleTitle, content: articleContent });
    setArticleTitle('');
    setArticleContent('');
    setSuccessMessage('Article added successfully!');
    fetchData();
  };

  const handleDelete = async (type, id) => {
    await deleteDoc(doc(db, 'knowledgeBase', type, 'items', id));
    fetchData();
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontFamily: 'Playfair Display' }}>
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

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={handleTabChange} indicatorColor="primary" textColor="primary" centered>
          <Tab label="Manage FAQs" />
          <Tab label="Manage Articles" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Box>
          <Typography variant="h6">Add FAQ</Typography>
          <TextField
            fullWidth
            label="Question"
            value={faqQuestion}
            onChange={(e) => setFaqQuestion(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Answer"
            multiline
            rows={3}
            value={faqAnswer}
            onChange={(e) => setFaqAnswer(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={handleAddFaq}>
            Add FAQ
          </Button>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6">Existing FAQs</Typography>
          <List>
            {faqs.map((faq) => (
              <ListItem key={faq.id}>
                <ListItemText primary={faq.question} secondary={faq.answer} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleDelete('faqs', faq.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Typography variant="h6">Add Article</Typography>
          <TextField
            fullWidth
            label="Title"
            value={articleTitle}
            onChange={(e) => setArticleTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Content"
            multiline
            rows={5}
            value={articleContent}
            onChange={(e) => setArticleContent(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={handleAddArticle}>
            Add Article
          </Button>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6">Existing Articles</Typography>
          <List>
            {articles.map((article) => (
              <ListItem key={article.id}>
                <ListItemText primary={article.title} secondary={article.content} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleDelete('articles', article.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default Knowledge;
