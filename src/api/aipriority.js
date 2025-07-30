import axios from "axios";

export async function prioritizeTickets(tickets) {
  try {
    const response = await axios.post(
      "http://localhost:4000/api/prioritize",
      { tickets }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch AI prioritization:", error);
    return [];
  }
}