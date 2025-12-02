
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
} from "@mui/material";
import axios from "axios";

export default function DeviceDialog({
  open,
  onClose,
  device,
  mode,
  communityId,
  communityUuid,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    name: "",
    devSn: "",
    positionId: "",
  });

  const [positions, setPositions] = useState([]);

  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isAddMode = mode === "add";
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  //const cloudBase =  "https://thinmoocloudservice-production.up.railway.app/";

  const cloudBase = "/";


  useEffect(() => {
    if (device) {
      setFormData({
        id: device.id || "",
        name: device.name || "",
        devSn: device.devSn || "",
        positionId: device.positionId || "",
      });
    } else {
      setFormData({
        id: "",
        name: "",
        devSn: "",
        positionId: "",
      });
    }
  }, [device]);

  useEffect(() => {
    if (!communityId && !communityUuid) return;

    const fetchPositions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${cloudBase}api/devices/building-units`,
          {
            params: {
              accessToken: token,
              extCommunityId: communityId,
              extCommunityUuid: communityUuid,
              currPage: 1,
              pageSize: 100,
            },
          }
        );
        const units = res.data?.data?.list || [];
        setPositions(units);
      } catch (err) {
        console.error("Failed to fetch positions:", err);
        setPositions([]);
      }
    };

    fetchPositions();
  }, [communityId, communityUuid]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Device name is required";
    }

    if (!formData.devSn.trim()) {
      newErrors.devSn = "Serial number is required";
    }

    if (!formData.positionId) {
      newErrors.positionId = "Position / Building is required";
    }

    setErrors(newErrors);

    // ❌ Stop submit if validation failed
    if (Object.keys(newErrors).length > 0) return;
    setLoading(true);  // 🔥 Start Loading
    const token = localStorage.getItem("token");
    try {
      if (isAddMode) {
        await axios.post(`${cloudBase}api/devices/add`, {
          accessToken: token,
          extCommunityId: communityId,
          extCommunityUuid: communityUuid,
          devSn: formData.devSn,
          name: formData.name,
          positionId: formData.positionId,
        });
      } else if (isEditMode) {
        await axios.post(`${cloudBase}api/devices/update`, {
          accessToken: token,
          extCommunityId: communityId,
          extCommunityUuid: communityUuid,
          id: device.id,
          name: formData.name,
          positionId: formData.positionId,
        });
      }

      onClose();
      onSuccess?.();
    } catch (err) {
      alert("Failed: " + err.message);
    }
    finally {
      setLoading(false); // ✅ End Loading
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          color: "#1976d2",
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        {isAddMode && "Add New Device"}
        {isEditMode && "Edit Device"}
        {isViewMode && "View Device"}
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          bgcolor: "#fafafa",
          borderRadius: 2,
          px: 3,
          py: 2,
        }}
      >
        {isViewMode ? (
          // ✅ VIEW MODE (clean layout like EmployeeDialog)
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { label: "Device Name", value: formData.name },
              { label: "Serial Number", value: formData.devSn },
              {
                label: "Building / Position",
                value:
                  positions.find((p) => p.id === formData.positionId)?.name ||
                  formData.positionId ||
                  "-",
              },
            ].map((field, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 1.2,
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  backgroundColor: "#fff",
                }}
              >
                <strong style={{ width: "40%", color: "#444" }}>
                  {field.label} :
                </strong>
                <span
                  style={{
                    width: "60%",
                    textAlign: "left",
                    color: "#222",
                    wordBreak: "break-word",
                  }}
                >
                  {field.value || "-"}
                </span>
              </Box>
            ))}
          </Box>
        ) : (
          // ✅ ADD / EDIT MODE (same style)
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Device Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />

            <TextField
              fullWidth
              label="Serial Number"
              name="devSn"
              value={formData.devSn}
              onChange={handleChange}
              disabled={!isAddMode}
              error={!!errors.devSn}
              helperText={errors.devSn}
            />

            <TextField
              select
              fullWidth
              label="Building / Position"
              name="positionId"
              value={formData.positionId}
              onChange={handleChange}
              error={!!errors.positionId}
              helperText={errors.positionId}
            >
              <MenuItem value="">Select Position</MenuItem>
              {positions.length > 0 ? (
                positions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No Positions Found</MenuItem>
              )}
            </TextField>
            {loading && (
              <Box
                sx={{
                  position: "fixed",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.12)",
                  zIndex: 1400,
                }}
              >
                <Paper sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
                  <CircularProgress />
                  <Typography>Processing... please wait</Typography>
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="secondary"
          sx={{ textTransform: "none" }}
        >
          Close
        </Button>
        {!isViewMode && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            sx={{ textTransform: "none" }}
          >
            {isEditMode ? "Update" : "Save"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}


