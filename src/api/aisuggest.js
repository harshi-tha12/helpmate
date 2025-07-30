import axios from "axios";

// Only export the function, NOT a React component!
export async function getAiSuggestions({ description, organization }) {
  try {
    const response = await axios.post(
      "http://localhost:4000/api/suggestion",
      { description, organization }
    );
    return response.data?.suggestions || [];
  } catch (error) {
    console.error("Failed to fetch AI suggestions:", error);
    return [];
  }
}