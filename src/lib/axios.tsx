import axios from "axios";

const token = import.meta.env.VITE_API_JWT_TOKEN;

export const fetchData = async (url: string) => {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};
