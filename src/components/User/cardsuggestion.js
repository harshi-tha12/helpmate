import React, { useState } from "react";
import { Card, CardContent, Button, Typography, List, ListItem, ListItemText } from "@mui/material";

export default function AiSuggestionCard({ suggestions, onIgnore }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!suggestions?.length) return null;

  return (
    <Card
      sx={{
        mb: 2,
        p: 2,
        borderRadius: "8px",
        background: "linear-gradient(135deg, #E6F0FA 0%, #F5F5F5 100%)",
      }}
    >
      <CardContent>
        {!showDetails ? (
          <>
            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                color: "#123499",
                fontSize: { xs: "0.9rem", sm: "1rem" },
                mb: 1,
              }}
            >
              We found similar past tickets. Would you like to see suggestions?
            </Typography>
            <Button
              onClick={() => setShowDetails(true)}
              sx={{
                fontFamily: "'Outfit', sans-serif",
                color: "#123499",
                borderColor: "#123499",
                mr: 1,
                "&:hover": { borderColor: "#0e287d", bgcolor: "#DDE9FF" },
              }}
              variant="outlined"
            >
              See Suggestions
            </Button>
            <Button
              onClick={onIgnore}
              sx={{
                fontFamily: "'Outfit', sans-serif",
                color: "#123499",
                borderColor: "#123499",
                "&:hover": { borderColor: "#0e287d", bgcolor: "#DDE9FF" },
              }}
              variant="outlined"
            >
              Ignore
            </Button>
          </>
        ) : (
          <>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'Outfit', sans-serif",
                color: "#123499",
                fontWeight: 600,
                mb: 1,
              }}
            >
              Related Past Solutions:
            </Typography>
            <List>
              {suggestions.map((s) => (
                <ListItem
                  key={s.ticketId}
                  sx={{
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    mb: 1,
                    p: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <>
                        <strong>Problem:</strong> {s.problem}
                      </>
                    }
                    secondary={
                      <>
                        <strong>Solution:</strong> {s.remarks}
                        <br />
                        <Typography
                          component="span"
                          sx={{ fontSize: "0.8rem", color: "#123499" }}
                        >
                          Similarity: {(s.similarity * 100).toFixed(1)}%
                        </Typography>
                      </>
                    }
                    sx={{ fontFamily: "'Outfit', sans-serif", color: "#123499" }}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              onClick={onIgnore}
              sx={{
                fontFamily: "'Outfit', sans-serif",
                color: "#123499",
                borderColor: "#123499",
                "&:hover": { borderColor: "#0e287d", bgcolor: "#DDE9FF" },
              }}
              variant="outlined"
            >
              Hide Suggestions
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}