import axios from "axios";

// Only export the function, NOT a React component!
export async function getAgentSuggestions({ description, organization }) {
  try {
    const response = await axios.post(
      "http://localhost:4000/api/agentsuggestion",
      { description, organization }
    );
    return response.data?.suggestions || [];
  } catch (error) {
    console.error("Failed to fetch AI suggestions for agent:", error);
    return [];
  }
}