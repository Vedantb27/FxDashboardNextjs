// pages/api/auth/signup.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const response = await axios.post('http://localhost:8000/api/auth/signup', req.body);
      res.status(201).json(response.data);
    } catch (err) {
      res.status(err.response?.status || 500).json(err.response?.data || { error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}