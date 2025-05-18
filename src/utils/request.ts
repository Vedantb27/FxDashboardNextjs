import axios from 'axios';
import { BASE_API_URL, AUTH_STORAGE_KEY } from './envConfig';
import { toast } from 'react-toastify';

interface RequestParams {
  method: string;
  url: string;
  data?: object;
  params?: object;
}

const Request = async ({ method, url, data = {}, params = {} }: RequestParams) => {
  function filterEmptyFields(payload: object) {
    return Object.fromEntries(
      Object.entries(payload)?.map(([key, value]) => [
        key,
        key === 'SearchTerm'
          ? value
          : value === undefined || value === null || value === ''
          ? null
          : value,
      ])
    );
  }

  const tokenData = sessionStorage.getItem(`${AUTH_STORAGE_KEY}`);
  let token: { token: string } | null = null;
  if (tokenData) {
    try {
      token = JSON.parse(tokenData);
    } catch (e) {
      console.error('Failed to parse token:', e);
      sessionStorage.removeItem(`${AUTH_STORAGE_KEY}`);
    }
  }

  const headers = {
    Authorization: token ? `Bearer ${token.token}` : '',
  };

  try {
    const response = await axios({
      method,
      url: `${BASE_API_URL}/${url}`,
      data: Array.isArray(data) ? data : filterEmptyFields(data),
      params,
      headers,
    });
    if (response?.data?.status === 201) {
      toast.success(response?.data?.message);
    }
    return response?.data;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      toast.error('Session expired. Please log in again.');
      sessionStorage.removeItem(`${AUTH_STORAGE_KEY}`);
    }
    if (error?.response?.data?.message) {
      toast.error(error?.response?.data?.message);
    }
  }
};

export default Request;