import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const cloudBase =  "https://thinmoocloudservice-production.up.railway.app";

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (email === 'Admin123' && password === 'Test@123' || email === 'hr123' && password === 'hr@123') {
        const res = await axios.post(`${cloudBase}/api/auth/login`, {}
        );
        localStorage.setItem('username', email);
        localStorage.setItem('password', password);
        localStorage.setItem('token', res.data.data.accessToken);
        localStorage.setItem('expiresIn', res.data.data.expiresIn);
        toast.success("Login successfully!");
        const token = res.data.data.accessToken; // ✅ define token

        // Save for all frontend pages
        localStorage.setItem("accessToken", token);

        // Send token to backend for cron usage
        await fetch(`${cloudBase}/api/set-cloud-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        navigate('/dashboard');
      }
      else {
        toast.error("Invalid username or password");

      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');

    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: '#f4f9fc',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card
        sx={{
          width: 380,
          padding: 4,
          boxShadow: 3,
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        <img
          src="/logo.ico"
          alt="MConnect Logo"
          style={{ width: 150, marginBottom: 10 }}
        />
        <Typography
          variant="h6"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            fontWeight: 600,
            color: '#333',
          }}
        >
          <LockIcon fontSize="small" sx={{ mr: 1 }} /> LOGIN
        </Typography>

        <form onSubmit={submit}>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* <FormControlLabel
            control={<Checkbox defaultChecked />}
            label="Remember Me"
            sx={{ mt: 1, mb: 1 }}
          /> */}

          {error && (
            <Typography color="error" sx={{ fontSize: 14, mb: 1 }}>
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 1,
              mb: 2,
              py: 1.2,
              background: 'linear-gradient(90deg, #0078d4, #00a2ff)',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              letterSpacing: 1,
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'LOGIN'}
          </Button>
        </form>

        <Typography variant="body2" sx={{ mt: 2, color: '#888' }}>
          © 2025 Mconnect Consulting. All rights reserved.
        </Typography>
      </Card>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </Box>
  );
}

