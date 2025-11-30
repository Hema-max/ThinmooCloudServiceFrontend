

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  CircularProgress,
  Grid,
  Stack,
  MenuItem,
  IconButton,
  Typography,
  Menu,
} from "@mui/material";
import axios from "axios";
import EmployeeDialog from "./EmployeeDialog";
import * as XLSX from "xlsx";
import { useLocation } from "react-router-dom";
import { DeleteForever, Add, MoreVert, Edit, Delete, Visibility } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AuthorizedDriverBulim() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const communityId = queryParams.get("communityId") || 57104;
  const pageTitle = queryParams.get("title") || "Bulim";

  const [filters, setFilters] = useState({
    name: "",
    empNo: "",
    cardNo: "",
    dept: "",
  });
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0); // UI page (0-based)
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false); // for list fetching
  const [actionLoading, setActionLoading] = useState(false); // for save/delete/export/etc
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("view");
  const [selectedEmployee, setSelectedEmployee] = useState({});

  // selection
  const [selectedRows, setSelectedRows] = useState([]); // selected ids on current page
  const [selectAll, setSelectAll] = useState(false); // UI checkbox state
  const [selectAllGlobal, setSelectAllGlobal] = useState(false); // "select across all pages" intent

  // menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // refs
  const activeRequestRef = useRef(null);
  const isMountedRef = useRef(true);

  // ---------- Helpers ----------
  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ---------- Fetch departments ----------
  const fetchDepartments = useCallback(async (cid = communityId) => {
    try {
      const res = await axios.get("http://localhost:5000/api/departments", {
        params: {
          accessToken: localStorage.getItem("token"),
          extCommunityId: cid,
        },
      });
      if (res.data?.code === 0) setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err?.message || err);
    }
  }, [communityId]);

  // ---------- Fetch list (optimized) ----------
  // ✅ STABLE fetchList — won't reload every second
  const fetchList = useCallback(async (currPage, pageSize, appliedFilters) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Session expired. Please login again.");
      window.location.href = "/login";
      return;
    }

    // Send token to backend for cron usage
    await fetch("http://localhost:5000/api/set-cloud-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    setActionLoading(true);
    setError("");

    try {
      if (activeRequestRef.current) {
        activeRequestRef.current.cancel("New request triggered");
      }
      const cancelToken = axios.CancelToken.source();
      activeRequestRef.current = cancelToken;

      const params = {
        accessToken: token,
        extCommunityId: communityId,
        extCommunityUuid: "01000",
        currPage: currPage || page + 1,
        pageSize: pageSize || rowsPerPage,
        ...(appliedFilters?.name && { name: appliedFilters.name }),
        ...(appliedFilters?.empNo && { empNo: appliedFilters.empNo }),
        ...(appliedFilters?.cardNo && { cardNo: appliedFilters.cardNo }),
        ...(appliedFilters?.dept && { dept: appliedFilters.dept }),
      };

      const res = await axios.get("http://localhost:5000/api/employees", {
        params,
        cancelToken: cancelToken.token,
      });

      if (res.data?.code === 0) {
        setRows(res.data.data.list || []);
        setTotalCount(res.data.data.totalCount || 0);
      } else if (res.data?.msg === "Invalid token") {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
      } else {
        setError(res.data?.msg || "Unexpected response");
        setRows([]);
        setTotalCount(0);
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error("Fetch list error:", err);
        setError(err.message || "Fetch error");
        setRows([]);
        setTotalCount(0);
      }
    } finally {
      activeRequestRef.current = null;
      setActionLoading(false);
    }
  }, [communityId, page, rowsPerPage]); // ✅ stable deps only (no filters object!)


  // on mount: fetch deps & initial data
  useEffect(() => {
    isMountedRef.current = true;
    fetchDepartments();
    // cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (activeRequestRef.current) {
        activeRequestRef.current.cancel("Component unmounted");
      }
    };
  }, [fetchDepartments]);

  // Debounce fetchList when page/rowsPerPage/filters/communityId changes
  // ✅ when filters change, call fetchList manually
  useEffect(() => {
    fetchList(1, rowsPerPage, filters);
  }, [filters, communityId, pageTitle]);






  // ---------- Pagination handlers ----------
  const onSearch = async () => {
    setPage(0);
    await fetchList(1, rowsPerPage, { ...filters });
  };

  const onReset = async() => {
    setFilters({ name: "", empNo: "", cardNo: "", dept: "" });
    setPage(0);
    await fetchList(1, rowsPerPage, { name: "", empNo: "", cardNo: "", dept: "" });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // When user changes page manually, keep selectAllGlobal as-is but update UI selections in fetchList
    fetchList(newPage + 1, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
    fetchList(1, newSize);
  };

  // ---------- Dialog handlers ----------
  const openDialog = (mode, emp = {}) => {
    setDialogMode(mode);
    setSelectedEmployee(emp);
    setDialogOpen(true);
  };
  const handleCloseDialog = () => setDialogOpen(false);

  // ---------- View / Edit ----------
  const handleView = async (row) => {
    handleMenuClose();
    setActionLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/employees/${row.id}`, {
        params: {
          accessToken: localStorage.getItem("token"),
          extCommunityId: communityId,
          extCommunityUuid: row.uuid,
          id: row.id,
        },
      });
      const empData = res.data?.data ?? row;
      setSelectedEmployee(empData);
      setDialogMode("view");
      setDialogOpen(true);
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setSelectedEmployee(row);
      setDialogMode("view");
      setDialogOpen(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (row) => {
    handleMenuClose();
    setActionLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/employees/${row.id}`, {
        params: {
          accessToken: localStorage.getItem("token"),
          extCommunityId: communityId,
          extCommunityUuid: row.uuid,
          id: row.id,
        },
      });
      const empData = res.data?.data ?? row;
      setSelectedEmployee(empData);
      setDialogMode("edit");
      setDialogOpen(true);
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setSelectedEmployee(row);
      setDialogMode("edit");
      setDialogOpen(true);
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- Delete single (accept id or object) ----------
  const handleDelete = async (rowOrId) => {
    handleMenuClose();
    let row = null;
    if (!rowOrId) return;
    if (typeof rowOrId === "object") row = rowOrId;
    else row = rows.find((r) => String(r.id) === String(rowOrId) || String(r.uuid) === String(rowOrId));

    if (!row) {
      toast.error("Row not found for deletion.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this employee?")) return;

    setActionLoading(true);
    try {
      const pageTitleLocal = new URLSearchParams(window.location.search).get("title") || pageTitle;
      const COMMUNITY_MAP = {
        Bulim: ["61476", "41982"],
        Mandai: ["50442", "57042"],
        Sentosa: ["73932"],
      };

      const communityIds = COMMUNITY_MAP[pageTitleLocal] || [];
      if (communityIds.length === 0) {
        toast.warning("Community IDs not configured properly for this page.");
        setActionLoading(false);
        return;
      }
      const accessToken = localStorage.getItem("token");
      const apiBase = "http://localhost:5000/api/employees";
      const apiList = `${apiBase}`;

      let allSuccess = true;
      let failedCommunities = [];
      let deletedCommunities = [];

      // Loop communities
      for (const cid of communityIds) {
        try {
          // find by cardNo
          const searchRes = await axios.get(apiList, {
            params: { accessToken, extCommunityId: cid, cardNo: row.cardNo },
          });
          const empToDelete = searchRes.data?.data?.list?.[0];
          if (empToDelete) {
            const resDel = await axios.delete(`${apiBase}/${empToDelete.id}`, {
              params: { accessToken, extCommunityId: cid },
            });
            if (resDel.data?.code === 0) deletedCommunities.push(cid);
            else {
              allSuccess = false;
              failedCommunities.push(cid);
            }
          } else {
            allSuccess = false;
            failedCommunities.push(cid);
          }
        } catch (err) {
          allSuccess = false;
          failedCommunities.push(cid);
          console.error(`Error deleting in community ${cid}:`, err?.response?.data || err?.message || err);
        }
      }

      if (allSuccess) {
        toast.success(`Employee deleted successfully from all (${pageTitleLocal}) communities!`);
      } else if (deletedCommunities.length > 0) {
        toast.warning(`Deleted in ${deletedCommunities.join(", ")}, failed in ${failedCommunities.join(", ")}`);
      } else {
        toast.error(`Failed to delete employee in communities: ${failedCommunities.join(", ")}`);
      }

      // refresh list
      await fetchList(page + 1, rowsPerPage);
    } catch (err) {
      console.error("Delete employee error:", err);
      toast.error("Error deleting employee: " + (err.response?.data?.msg || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- Bulk delete ----------
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0 && !selectAllGlobal) {
      toast.warning("Please select at least one employee to delete.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectAllGlobal ? "ALL matching" : selectedRows.length} selected employees?`)) return;

    setActionLoading(true);
    try {
      const pageTitleLocal = new URLSearchParams(window.location.search).get("title") || pageTitle;
      const COMMUNITY_MAP = {
        Bulim: ["61476", "41982"],
        Mandai: ["50442", "57042"],
        Sentosa: ["73932"],
      };
      const communityIds = COMMUNITY_MAP[pageTitleLocal] || [];
      if (communityIds.length < 1) {
        toast.warning("Community IDs not configured properly for this page.");
        setActionLoading(false);
        return;
      }

      const accessToken = localStorage.getItem("token");
      const apiDelete = "http://localhost:5000/api/employees";
      const apiList = "http://localhost:5000/api/employees";

      // If selectAllGlobal, fetch all matching rows (by filters) first, otherwise use selectedRows on current page.
      let toDeleteRows = [];

      if (selectAllGlobal) {
        // Fetch all pages (respect filters) - reuse same logic as export (but minimal fields)
        const pageSize = 500;
        let p = 1;
        let fetched = [];
        const token = localStorage.getItem("token");
        while (true) {
          const res = await axios.get(apiList, {
            params: {
              accessToken: token,
              extCommunityId: communityId,
              currPage: p,
              pageSize,
              ...(filters.name && { name: filters.name }),
              ...(filters.empNo && { empNo: filters.empNo }),
              ...(filters.cardNo && { cardNo: filters.cardNo }),
              ...(filters.dept && { dept: filters.dept }),
            },
          });
          const list = res?.data?.data?.list || [];
          if (!list.length) break;
          fetched.push(...list);
          const total = res?.data?.data?.totalCount || 0;
          if (fetched.length >= total) break;
          p++;
        }
        toDeleteRows = fetched;
      } else {
        toDeleteRows = rows.filter((r) => selectedRows.includes(r.id || r.uuid));
      }

      // Now perform deletes (best-effort across communities)
      for (const row of toDeleteRows) {
        for (const cid of communityIds) {
          try {
            const searchRes = await axios.get(apiList, {
              params: { accessToken, extCommunityId: cid, cardNo: row.cardNo },
            });
            const found = searchRes.data?.data?.list?.[0];
            if (found) {
              await axios.delete(`${apiDelete}/${found.id}`, {
                params: { accessToken, extCommunityId: cid },
              });
            }
          } catch (err) {
            console.warn("Bulk delete partial error:", err);
          }
        }
      }

      toast.success(`Delete attempt finished.`);
      setSelectedRows([]);
      setSelectAll(false);
      setSelectAllGlobal(false);
      await fetchList(page + 1, rowsPerPage);
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("Error deleting employees: " + (err.response?.data?.msg || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- Save / Update employee ----------
  const handleSaveEmployee = async (emp) => {
    setActionLoading(true);
    try {
      const pageTitleLocal = new URLSearchParams(window.location.search).get("title") || pageTitle;
      const COMMUNITY_MAP = {
        Bulim: ["61476", "41982"],
        Mandai: ["50442", "57042"],
        Sentosa: ["73932"],
      };
      const communityIds = COMMUNITY_MAP[pageTitleLocal] || [];

      if (communityIds.length === 0) {
        toast.warning("Community IDs not configured properly for this page.");
        setActionLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const apiAdd = "http://localhost:5000/api/employees/add";
      const apiUpdate = "http://localhost:5000/api/employees/update";
      const apiDept = "http://localhost:5000/api/departments";
      const apiList = "http://localhost:5000/api/employees";

      const translateError = (msg) => {
        if (!msg) return msg;
        return msg
          .replace("部门不存在", "Department does not exist")
          .replace("成功", "Success")
          .replace("失败", "Failed")
          .replace("未找到", "Not found")
          .replace("权限不足", "Permission denied")
          .replace("用户不存在", "User not found")
          .replace("卡号已存在", "Card number already exists");
      };

      const mainCommunityId = communityIds[0];
      const selectedDept = departments.find((d) => String(d.id) === String(emp.dept));
      if (!selectedDept) {
        toast.error("Please select a valid department from the dropdown.");
        setActionLoading(false);
        return;
      }
      const deptName = selectedDept.name?.trim();
      if (!deptName) {
        toast.error("Selected department has no name. Can't match across communities.");
        setActionLoading(false);
        return;
      }

      const originalCardNo = emp.originalCardNo ?? emp.cardNo;
      const succeededCommunities = [];
      const failedCommunities = [];

      // preload departments
      const deptResponses = await Promise.allSettled(
        communityIds.map((cid) => axios.get(apiDept, { params: { accessToken: token, extCommunityId: cid } }))
      );

      const deptCache = {};
      deptResponses.forEach((res, i) => {
        const cid = communityIds[i];
        if (res.status === "fulfilled") {
          deptCache[cid] = res.value.data?.data || [];
        } else {
          failedCommunities.push(`${cid}: Failed to load departments`);
        }
      });

      // prepare dept mapping
      const deptMapping = {};
      for (const cid of communityIds) {
        if (String(cid) === String(mainCommunityId)) {
          deptMapping[cid] = emp.dept;
        } else {
          const match = (deptCache[cid] || []).find(
            (d) => d.name && d.name.trim().toLowerCase() === deptName.toLowerCase()
          );
          if (match) deptMapping[cid] = match.id;
          else failedCommunities.push(`${cid}: Department "${deptName}" not found`);
        }
      }

      // for edit mode: prefetch employees
      let empListCache = {};
      if (dialogMode === "edit") {
        const listResponses = await Promise.allSettled(
          communityIds.map((cid) =>
            axios.get(apiList, {
              params: { accessToken: token, extCommunityId: cid, cardNo: originalCardNo },
            })
          )
        );
        listResponses.forEach((res, i) => {
          const cid = communityIds[i];
          if (res.status === "fulfilled") {
            empListCache[cid] = res.value.data?.data?.list || [];
          } else {
            failedCommunities.push(`${cid}: Failed to fetch employee list`);
          }
        });
      }

      // save/update in parallel
      const savePromises = communityIds.map(async (cid) => {
        const deptIdToUse = deptMapping[cid];
        if (!deptIdToUse) return { cid, success: false, msg: "No dept mapping" };

        try {
          let apiUrl, payload;
          if (dialogMode === "add") {
            apiUrl = apiAdd;
            payload = { ...emp, accessToken: token, extCommunityId: cid, dept: deptIdToUse, uuid: emp.empNo };
          } else {
            const existingList = empListCache[cid] || [];
            const empFound = existingList.find((e) => e.cardNo === originalCardNo);
            const employeeIdToUse = empFound?.id;
            if (employeeIdToUse) {
              apiUrl = apiUpdate;
              payload = { ...emp, id: employeeIdToUse, accessToken: token, extCommunityId: cid, dept: deptIdToUse, uuid: emp.empNo };
            } else {
              apiUrl = apiAdd;
              payload = { ...emp, accessToken: token, extCommunityId: cid, dept: deptIdToUse, uuid: emp.empNo };
            }
          }
          const res = await axios.post(apiUrl, payload);
          if (res.data?.code === 0) return { cid, success: true };
          else return { cid, success: false, msg: translateError(res.data?.msg) };
        } catch (err) {
          const apiMsg = err.response?.data?.msg ? translateError(err.response.data.msg) : err.message;
          return { cid, success: false, msg: apiMsg };
        }
      });

      const results = await Promise.all(savePromises);

      results.forEach((r) => {
        if (r?.success) succeededCommunities.push(r.cid);
        else failedCommunities.push(`${r.cid}: ${r?.msg || "Failed"}`);
      });

      if (succeededCommunities.length && failedCommunities.length === 0) {
        toast.success(`Employee ${dialogMode === "add" ? "added" : "updated"} successfully in all communities (${succeededCommunities.join(", ")})`);
      } else if (succeededCommunities.length && failedCommunities.length) {
        toast.warning(`Saved in ${succeededCommunities.join(", ")}; failed/skipped: ${failedCommunities.join("; ")}`, { autoClose: 7000 });
      } else {
        toast.error(`Failed in all communities: ${failedCommunities.join("; ")}`);
      }

      await fetchList(page + 1, rowsPerPage);
      setDialogOpen(false);
    } catch (err) {
      console.error("💥 Save employee global error:", err);
      const apiMsg = err.response?.data?.msg || err.message;
      toast.error(`Unexpected error while saving employee: ${apiMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- Export (keeps action loading) ----------
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setActionLoading(true);
    try {
      if (!selectAllGlobal && selectedRows.length === 0) {
        toast.error("Please select at least one record to export.");
        return;
      }

      let exportData = [];

      if (selectAllGlobal) {
        // Fetch all pages from your employees API using safe batching
        const token = localStorage.getItem("token");
        const apiList = "http://localhost:5000/api/employees";
        const batchSize = 500;
        let p = 1;
        let all = [];
        const total = totalCount || 0; // use state totalCount if available

        while (true) {
          const res = await axios.get(apiList, {
            params: {
              accessToken: token,
              extCommunityId: communityId,
              currPage: p,
              pageSize: batchSize,
              ...(filters.name && { name: filters.name }),
              ...(filters.empNo && { empNo: filters.empNo }),
              ...(filters.cardNo && { cardNo: filters.cardNo }),
              ...(filters.dept && { dept: filters.dept }),
            },
          });

          const list = res?.data?.data?.list || [];
          if (!Array.isArray(list) || list.length === 0) break;
          all.push(...list);
          // if totalCount present, stop when collected
          const apiTotal = res?.data?.data?.totalCount ?? 0;
          if (apiTotal && all.length >= apiTotal) break;
          // fallback: if less than batchSize returned, we reached end
          if (list.length < batchSize) break;
          p++;
        }

        exportData = all;
      } else {
        // Export only selected rows from current `rows`
        exportData = rows.filter((r) => selectedRows.includes(r.id || r.uuid));
      }

      if (!exportData || exportData.length === 0) {
        toast.warning("No records found to export.");
        return;
      }

      // Prepare the sheet columns you want
      const worksheet = XLSX.utils.json_to_sheet(
        exportData.map((emp) => ({
          ID: emp.id,
          "Card No": emp.cardNo,
          Name: emp.name,
          Department: emp.deptName || emp.dept,
          "Created Time": emp.createTime,
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
      XLSX.writeFile(workbook, `EmployeeList_${pageTitle}.xlsx`);

      toast.success("Excel exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel: " + (err?.response?.data?.msg || err?.message || ""));
    } finally {
      setExporting(false);
      setActionLoading(false);
    }
  };

  // ---------- Render ----------
  return (
    <Box sx={{ p: 3, backgroundColor: "#f7faff", minHeight: "100vh", position: "relative" }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: "#333" }}>
        Authorized Drivers - {pageTitle}
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", background: "#ffffff" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Staff Pass ID" name="cardNo" value={filters.cardNo} onChange={handleChange} size="small" />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Driver Name" name="name" value={filters.name} onChange={handleChange} size="small" />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Driver ID" name="empNo" value={filters.empNo} onChange={handleChange} size="small" />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              select
              label="Department"
              name="dept"
              value={filters.dept}
              onChange={handleChange}
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 180, md: 200 },
                "& .MuiOutlinedInput-root": { minHeight: 40 },
                "& .MuiSelect-select": { display: "flex", alignItems: "center", paddingY: 1, paddingX: 1.5, fontSize: "0.9rem" },
              }}
              SelectProps={{ MenuProps: { PaperProps: { sx: { "& .MuiMenuItem-root": { minHeight: 40, py: 1, fontSize: "0.9rem" } } } } }}
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((dep) => (
                <MenuItem key={dep.id} value={dep.id}>
                  {dep.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Grid item xs={12} sm={2.5}>
            <Button variant="contained" startIcon={<SearchIcon />} color="primary" fullWidth onClick={onSearch} sx={{ mt: 1 }}>
              Search
            </Button>
          </Grid>
          <Grid item xs={12} sm={2.5}>
            <Button variant="contained" startIcon={<RestartAltIcon />} color="secondary" fullWidth onClick={onReset} sx={{ mt: 1, backgroundColor: "#5c6bc0" }}>
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", backgroundColor: "#fff" }}>
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => openDialog("add")}>
              Add Employee
            </Button>
            <Button variant="contained" color="error" startIcon={<DeleteForever />} onClick={handleBulkDelete}>
              Delete
            </Button>
          </Stack>

          <Button variant="contained" color="success" sx={{ borderRadius: 2 }}  startIcon={<DownloadIcon />} onClick={handleExport} disabled={exporting || actionLoading}>
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#e8eaf6" }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectAll(checked);
                          if (checked) {
                            // Mark that user wants "select across all pages"
                            setSelectAllGlobal(true);
                            // show current page checkboxes as checked (UI)
                            setSelectedRows(rows.map((r) => r.id || r.uuid));
                          } else {
                            setSelectAllGlobal(false);
                            setSelectedRows([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell style={{ display: "none" }} sx={{ fontWeight: "bold" }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Driver Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Driver ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Staff Pass ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {error ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ color: "red" }}>
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const rowKey = r.id || r.uuid;
                      const checked = selectedRows.includes(r.id || r.uuid);
                      return (
                        <TableRow key={rowKey} hover>
                          <TableCell padding="checkbox">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                // Any manual change -> user is not selecting "all pages" anymore, keep selectAllGlobal true only if header was set and user wants that — but safer to clear it when user toggles individual row
                                if (!isChecked) {
                                  setSelectAll(false);
                                }
                                setSelectAllGlobal(false);
                                setSelectedRows((prev) => {
                                  if (isChecked) {
                                    const newSel = [...prev, r.id || r.uuid];
                                    if (newSel.length === rows.length) setSelectAll(true);
                                    return newSel;
                                  } else {
                                    return prev.filter((id) => id !== (r.id || r.uuid));
                                  }
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell style={{ display: "none" }}>{r.id}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.uuid || r.empNo}</TableCell>
                          <TableCell>{r.cardNo}</TableCell>
                          <TableCell>{r.deptName || r.dept}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, r)}>
                              <MoreVert />
                            </IconButton>

                            {selectedRow?.id === r.id && (
                              <Box>
                                <Box component="div" sx={{ position: "absolute", zIndex: 1200 }} onClick={(e) => e.stopPropagation()} />
                              </Box>
                            )}

                            {selectedRow?.id === r.id && (
                              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} transformOrigin={{ vertical: "top", horizontal: "center" }}>
                                <MenuItem onClick={() => handleView(selectedRow)} sx={{ py: 1.2, px: 2 }}>
                                  <Visibility fontSize="small" sx={{ mr: 1, color: "primary.main" }} /> View
                                </MenuItem>
                                <MenuItem onClick={() => handleEdit(selectedRow)} sx={{ py: 1.2, px: 2 }}>
                                  <Edit fontSize="small" sx={{ mr: 1, color: "secondary.main" }} /> Edit
                                </MenuItem>
                                <MenuItem onClick={() => handleDelete(selectedRow)} sx={{ py: 1.2, px: 2 }}>
                                  <Delete fontSize="small" sx={{ mr: 1, color: "error.main" }} /> Delete
                                </MenuItem>
                              </Menu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {rows.length > 0 && (
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
          </>
        )}
      </Paper>

      <EmployeeDialog open={dialogOpen} mode={dialogMode} employee={selectedEmployee} onClose={handleCloseDialog} onSave={handleSaveEmployee} departments={departments} />

      {/* Action loading overlay */}
      {actionLoading && (
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

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable theme="colored" />
    </Box>
  );
}
