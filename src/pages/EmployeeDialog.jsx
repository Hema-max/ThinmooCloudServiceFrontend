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

export default function EmployeeDialog({
  open,
  mode,
  employee,
  onClose,
  onSave,
  departments,
}) {
  const [formData, setFormData] = useState({
    name: "",
    cardNo: "",
    empNo: "",
    job: "",
    dept: "",
    gender: "",
    phone: "",
  });

  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const [errors, setErrors] = useState({});


  useEffect(() => {
    if (employee) {
      setFormData({
        id: employee.id || "",
        uuid: employee.uuid || "",
        name: employee.name || employee.driverName || "",
        cardNo: employee.cardNo || employee.staffPassId || "",
        empNo: employee.empNo || employee.uuid || "",
        job: employee.job || "",
        dept: employee.deptId || employee.dept || employee.department || "",
        gender:
          typeof employee.gender === "number"
            ? employee.gender.toString()
            : employee.gender || "",
        phone: employee.phone || "",
      });
    } else {
      setFormData({
        id: "",
        uuid: "",
        name: "",
        cardNo: "",
        empNo: "",
        job: "",
        dept: "",
        gender: "",
        phone: "",
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Employee Name is required";
    // ❌ Staff ID required AND cannot be zero
    if (!formData.cardNo.trim()) {
      newErrors.cardNo = "Staff Pass ID is required";
    } else if (/^0+$/.test(formData.cardNo.trim())) {
      newErrors.cardNo = "Staff Pass ID cannot be zero";
    }
    if (!formData.empNo.trim()) newErrors.empNo = "Driver ID is required";
    if (!formData.dept) newErrors.dept = "Department is required";

    setErrors(newErrors);

    // ❌ If validation fails, do NOT save
    if (Object.keys(newErrors).length > 0) return;
    onSave(formData);
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
        {mode === "add" && "Add Employee"}
        {mode === "edit" && "Edit Employee"}
        {mode === "view" && "View Employee"}
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
          // ✅ View mode layout (like your second screenshot)
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { label: "Employee Name", value: formData.name },
              { label: "Staff Pass ID", value: formData.cardNo },
              { label: "Driver ID", value: formData.empNo },
              { label: "Job", value: formData.job },
              {
                label: "Department",
                value:
                  departments.find((d) => d.id === formData.dept)?.name ||
                  formData.dept ||
                  "-",
              },
              {
                label: "Gender",
                value:
                  formData.gender === "0"
                    ? "Male"
                    : formData.gender === "1"
                      ? "Female"
                      : "Unknown",
              },
              { label: "Phone Number", value: formData.phone },
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
          // ✅ Add/Edit mode (form layout)
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Employee Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />

            <TextField
              fullWidth
              label="Staff Pass ID"
              name="cardNo"
              value={formData.cardNo}
              onChange={handleChange}
              error={!!errors.cardNo}
              helperText={errors.cardNo}

            />

            <TextField
              fullWidth
              label="Driver ID"
              name="empNo"
              value={formData.empNo}
              onChange={handleChange}
              error={!!errors.empNo}
              helperText={errors.empNo}
            />

            <TextField
              fullWidth
              label="Job"
              name="job"
              value={formData.job}
              onChange={handleChange}
            />

            <TextField
              select
              fullWidth
              label="Department"
              name="dept"
              value={formData.dept}
              onChange={handleChange}
              error={!!errors.dept}
              helperText={errors.dept}
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments?.length > 0 ? (
                departments.map((dep) => (
                  <MenuItem key={dep.id} value={dep.id}>
                    {dep.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No Departments Found</MenuItem>
              )}
            </TextField>

            <TextField
              select
              fullWidth
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <MenuItem value="-1">Unknown</MenuItem>
              <MenuItem value="0">Male</MenuItem>
              <MenuItem value="1">Female</MenuItem>
            </TextField>

            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
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




