import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Stack,
  CircularProgress,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Add, Edit, Visibility, Delete, ChangeCircle, DeleteForever } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SyncIcon from "@mui/icons-material/Sync";
import DownloadIcon from "@mui/icons-material/Download";

import { Tooltip, Menu } from "@mui/material";
import axios from "axios";
import DeviceDialog from "../components/DeviceDialog";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx"; // ✅ Added for Excel export
import { Checkbox } from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { MoreVert } from "@mui/icons-material";


export default function DeviceBulim() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const communityId = queryParams.get("communityId");
  const communityUuid = queryParams.get("communityUuid") || "01000";
  const pageTitle = queryParams.get("title") || "Bulim";

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [dialogMode, setDialogMode] = useState("view");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replaceData, setReplaceData] = useState({ oldDevSn: "", newDevSn: "" });
  const [newDeviceAvailable, setNewDeviceAvailable] = useState(true);
  const [exporting, setExporting] = useState(false); // ✅ new state
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  //const cloudBase =  "https://thinmoocloudservice-production.up.railway.app/";

  const cloudBase = "/";



  const [lastSeenMap, setLastSeenMap] = useState({});


  const [filters, setFilters] = useState({ name: "", devSn: "", status: "" });
  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);




  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };


  // Fetch lastSeen map from local DB route
  const fetchLastSeenMap = async () => {
    try {
      const params = {
        accessToken: token,
        extCommunityId: communityId,
        extCommunityUuid: communityUuid,
      };
      const res = await axios.get(`${cloudBase}api/local/lastseen/map`, { params });
      if (res.data?.code === 0 && res.data.data?.map) {
        setLastSeenMap(res.data.data.map);
        localStorage.setItem("deviceLastSeen", JSON.stringify(res.data.data.map));
        return res.data.data.map;
      }
      return {};
    } catch (err) {
      console.error("fetchLastSeenMap error:", err);
      return {};
    }
  };

  const [syncLoading, setSyncLoading] = useState(false);


  // Manual full-community sync (calls backend sync endpoint then reloads local map)
  const handleManualLastSeenSync = async () => {
    try {
      setSyncLoading(true);
      // use token from localStorage
      const params = {
        accessToken: token,
        extCommunityId: communityId,
        extCommunityUuid: communityUuid,
      };

      // GET sync (we added GET /sync in backend)
      const res = await axios.get(`${cloudBase}api/local/lastseen/sync`, { params });
      if (res.data?.code === 0) {
        toast.success(`LastSeen sync done — processed ${res.data.processed ?? "0"} devices`);
        // update local map after sync
        await fetchLastSeenMap();
        // reload device list so UI picks up lastSeen values
        await fetchDevices(1, rowsPerPage);
      } else {
        toast.warning(res.data?.msg || "Sync did not succeed");
      }
    } catch (err) {
      console.error("Manual lastseen sync error:", err);
      toast.error("Error triggering sync: " + (err.response?.data?.msg || err.message));
    } finally {
      setSyncLoading(false);
    }
  };





  const fetchDevices = async (currPage = 1, pageSize = rowsPerPage) => {
    setGlobalLoading(true);
    setError("");
    // Send token to backend for cron usage
    await fetch(`${cloudBase}api/set-cloud-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    try {
      const params = {
        accessToken: token,
        extCommunityId: communityId,
        extCommunityUuid: communityUuid,
        name: filters.name || undefined,
        devSn: filters.devSn || undefined,
        status: filters.status !== "" ? Number(filters.status) : undefined, // ✅ filter: 0=offline, 1=online
        currPage,
        pageSize,
      };

      // Step 1️⃣: Fetch cloud device list
      const res = await axios.post(`${cloudBase}api/devices/list`, { params });

      if (res.data?.code === 0 && res.data.data?.list) {
        const { list, totalCount, currPage, pageSize } = res.data.data;

        // Step 2️⃣: Fetch local LastSeen map from DB
        let localMap = {};
        try {
          const mapParams = {
            accessToken: token,
            extCommunityId: communityId,
            extCommunityUuid: communityUuid,
          };
          const mapRes = await axios.get(`${cloudBase}api/local/lastseen/map`, {
            params: mapParams,
          });
          if (mapRes.data?.code === 0 && mapRes.data.data?.map) {
            localMap = mapRes.data.data.map;
          }
        } catch (mapErr) {
          console.warn("⚠️ Failed to load local LastSeen map:", mapErr.message);
        }

        // Step 3️⃣: Merge lastSeen info
        // const updatedDevices = list.map((d) => {
        //   const lastSeen =
        //     localMap[d.devSn] ||
        //     (d.connectionStatus === 1
        //       ? new Date().toISOString()
        //       : " ");
        //   return { ...d, lastSeen };
        // });

        // Step 3️⃣: Merge lastSeen info
        const updatedDevices = list.map((d) => {
          const lastSeen =
            d.connectionStatus === 1
              ? ""                    // ONLINE → show empty lastSeen
              : (localMap[d.devSn] || ""); // OFFLINE → fetch from DB

          return { ...d, lastSeen };
        });


        // Step 4️⃣: Update state
        setDevices(updatedDevices);
        setLastSeenMap(localMap);
        localStorage.setItem("deviceLastSeen", JSON.stringify(localMap));

        setTotalCount(totalCount || 0);
        setPage(currPage - 1); // backend pages start at 1
        setRowsPerPage(pageSize || 10);
      } else {
        setDevices([]);
        setError(res.data?.msg || "Unexpected response");
      }
    } catch (err) {
      console.error("Device fetch error:", err);
      setDevices([]);
      setError(err.message || "Error fetching devices");

      if (err.response?.data?.error === "Invalid token") {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return;
      }
    } finally {
      setGlobalLoading(false);
    }
  };


  useEffect(() => { fetchDevices(1, rowsPerPage); }, [communityId]);


  // ✅ Runs when filters are cleared
  useEffect(() => {
    if (!filters.name && !filters.devSn && !filters.status) {
      fetchDevices(1, rowsPerPage);
    }
    // eslint-disable-next-line
  }, [filters]);


  useEffect(() => {
    const timer = setInterval(() => {
      setLastSeenMap((prev) => ({ ...prev })); // triggers re-render only for “x min ago”
    }, 60000); // update every 1 minute for display

    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const savedMap = JSON.parse(localStorage.getItem("deviceLastSeen") || "{}");
    setLastSeenMap(savedMap);
  }, []);



  const getLastSeenText = (device) => {
    const ts = lastSeenMap[device.devSn];
    if (!ts || ts === " ") return " ";

    const last = new Date(ts);
    if (isNaN(last.getTime())) return " "; // guard invalid date

    const diff = Math.floor((Date.now() - last.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return last.toLocaleString();
  };



  const onSearch = async () => { setPage(0); await fetchDevices(1, rowsPerPage); };
  const onReset = async () => {

    const resetFilters = { name: "", devSn: "", status: "" };
    setFilters(resetFilters);
    setPage(0);
    await fetchDevices(1, rowsPerPage, resetFilters);

  };

  const handleChangePage = (event, newPage) => { setPage(newPage); fetchDevices(newPage + 1, rowsPerPage); };
  const handleChangeRowsPerPage = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
    fetchDevices(1, newSize);
  };

  const fetchDeviceDetails = async (dev) => {
    setGlobalLoading(true);
    try {
      const res = await axios.post(`${cloudBase}api/devices/get`, {
        accessToken: token,
        extCommunityId: communityId,
        extCommunityUuid: communityUuid,
        id: dev.id,
        devSn: dev.devSn,
      });
      if (res.data?.code === 0 && res.data.data) return res.data.data;
      toast.warning(res.data?.msg || "Failed to fetch device details");
      return null;
    } catch (err) {
      toast.error("Error fetching device details: " + err.message);
      return null;
    } finally { setGlobalLoading(false); }
  };

  const handleView = async (device) => { setGlobalLoading(true); handleMenuClose(); const detailedDevice = await fetchDeviceDetails(device); if (!detailedDevice) return; setDialogMode("view"); setSelectedDevice(detailedDevice); setOpenDialog(true); setGlobalLoading(false); };
  const handleEdit = async (device) => { setGlobalLoading(true); handleMenuClose(); const detailedDevice = await fetchDeviceDetails(device); if (!detailedDevice) return; setDialogMode("edit"); setSelectedDevice(detailedDevice); setOpenDialog(true); setGlobalLoading(false); };
  const handleAdd = () => { setDialogMode("add"); setSelectedDevice(null); setOpenDialog(true); };
  const handleDelete = (device) => { setGlobalLoading(true); handleMenuClose(); setSelectedDevice(device); setDeleteConfirm(true); setGlobalLoading(false); };

  const confirmDelete = async () => {
    try {
      setGlobalLoading(true);
      await axios.post(`${cloudBase}api/devices/delete`, {
        accessToken: token,
        extCommunityId: communityId,
        extCommunityUuid: communityUuid,
        devSns: selectedDevice.devSn,
      });
      setDeleteConfirm(false);
      fetchDevices(1, rowsPerPage);
    } catch (err) {
      toast.error("Failed to delete device: " + err.message);
    } finally { setGlobalLoading(false); }
  };

  // ===== Thinmoo-compatible Replace Device Logic =====
  const handleReplace = (device) => {
    handleMenuClose();
    setReplaceData({ oldDevSn: device.devSn, newDevSn: "" });
    setNewDeviceAvailable(true);
    setReplaceDialogOpen(true);
  };


  const [deviceStatus, setDeviceStatus] = useState(null); // -1 / 0 / 1
  const [checking, setChecking] = useState(false);

  // 🔹 Function to check if new device is valid/unbound
  const checkNewDevice = async (devSn) => {
    if (!devSn) {
      setNewDeviceAvailable(true);
      setDeviceStatus(null);
      return;
    }

    setChecking(true);
    try {
      const res = await axios.post(`${cloudBase}api/devices/check`, {
        accessToken: token,
        devSn,
      });

      const status = res.data?.data?.status;
      setDeviceStatus(status);

      // ✅ Status meaning:
      // -1 = not found, 0 = unbound (ok), 1 = bound
      if (status === 0) {
        setNewDeviceAvailable(true); // available
      } else {
        setNewDeviceAvailable(false); // not available
      }
    } catch (err) {
      console.error("Device check error:", err);
      setNewDeviceAvailable(true); // default allow
      setDeviceStatus(null);
    } finally {
      setChecking(false);
    }
  };
  // Confirm Replace
  const confirmReplace = async () => {
    const newSn = replaceData.newDevSn?.trim();
    if (!newSn) {
      toast.warning("Please enter new device serial number");
      return;
    }
    if (!newDeviceAvailable) {
      toast.warning("This new device is already registered or bound. Please choose another device.");
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await axios.post(`${cloudBase}api/devices/replace`, {
        accessToken: token,
        extCommunityId: communityId,
        extCommunityUuid: communityUuid,
        oldDevSn: replaceData.oldDevSn,
        newDevSn: newSn,
      });

      if (res.data?.code === 0 || res.data?.success) {
        toast.success("Device replaced successfully!");
        setReplaceDialogOpen(false);
        fetchDevices(1, rowsPerPage);
      } else {
        toast.warning(res.data?.msg || "Failed to replace device");
      }
    } catch (err) {
      toast.error("Error replacing device: " + (err.response?.data?.error || err.message));
    } finally {
      setGlobalLoading(false);
    }
  };


  const handleExport = async () => {
    setGlobalLoading(true);
    try {
      setExporting(true);

      // ⭐ Fetch LastSeen map (real values)
      const lastSeenMapRes = await axios.get(`${cloudBase}api/local/lastseen/map`, {
        params: { extCommunityId: communityId },
      });
      const lastSeenMap = lastSeenMapRes.data?.data.map || {};

      // ---------------- SELECTED ROWS EXPORT ----------------
      if (selectedRows.length > 0) {
        let exportData = [];

        const isAllSelected = selectedRows.length === devices.length;

        if (isAllSelected) {
          // Fetch total count
          const metaRes = await axios.post(`${cloudBase}api/devices/list`, {
            params: {
              accessToken: token,
              extCommunityId: communityId,
              extCommunityUuid: communityUuid,
              name: filters.name || undefined,
              devSn: filters.devSn || undefined,
              status: filters.status || undefined,
              currPage: 1,
              pageSize: 1,
            },
          });

          const totalCountAll = metaRes.data.data?.totalCount ?? 0;
          const batchSize = 1000;
          const totalPages = Math.ceil(totalCountAll / batchSize);
          const allRecords = [];

          for (let p = 1; p <= totalPages; p++) {
            const res = await axios.post(`${cloudBase}api/devices/list`, {
              params: {
                accessToken: token,
                extCommunityId: communityId,
                extCommunityUuid: communityUuid,
                name: filters.name || undefined,
                devSn: filters.devSn || undefined,
                status: filters.status || undefined,
                currPage: p,
                pageSize: batchSize,
              },
            });

            const list = res.data.data?.list || [];
            const updated = list.map((d) => ({
              ...d,
              lastSeen: lastSeenMap[d.devSn] || "-",   // ⭐ REAL LASTSEEN
            }));

            allRecords.push(...updated);
          }

          exportData = allRecords;
        } else {
          // Selected rows from current page only
          exportData = devices
            .filter((d) => selectedRows.includes(d.id || d.devSn))
            .map((d) => ({
              ...d,
              lastSeen: lastSeenMap[d.devSn] || "-",  // ⭐ REAL LASTSEEN
            }));
        }

        if (exportData.length === 0) {
          toast.warning("No records to export!");
          return;
        }

        const worksheet = XLSX.utils.json_to_sheet(
          exportData.map((d) => ({
            "Device Name": d.name || "-",
            "Device SN": d.devSn,
            Model: d.model || "-",
            Status: d.status === 1 ? "Online" : "Offline",
            "Last Seen": d.lastSeen || "-",  // ⭐ REAL LASTSEEN
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, worksheet, "Devices");
        XLSX.writeFile(wb, `DeviceList_${pageTitle}.xlsx`);
        return;
      }

      // ---------------- EXPORT ALL ----------------
      const metaRes = await axios.post(`${cloudBase}api/devices/list`, {
        params: {
          accessToken: token,
          extCommunityId: communityId,
          extCommunityUuid: communityUuid,
          name: filters.name || undefined,
          devSn: filters.devSn || undefined,
          status: filters.status || undefined,
          currPage: 1,
          pageSize: 1,
        },
      });

      const totalCountAll = metaRes.data.data?.totalCount ?? 0;
      const batchSize = 1000;
      const totalPages = Math.ceil(totalCountAll / batchSize);
      const allRecords = [];

      for (let p = 1; p <= totalPages; p++) {
        const res = await axios.post(`${cloudBase}api/devices/list`, {
          params: {
            accessToken: token,
            extCommunityId: communityId,
            extCommunityUuid: communityUuid,
            name: filters.name || undefined,
            devSn: filters.devSn || undefined,
            status: filters.status || undefined,
            currPage: p,
            pageSize: batchSize,
          },
        });

        const list = res.data.data?.list || [];
        const updated = list.map((d) => ({
          ...d,
          lastSeen: lastSeenMap[d.devSn] || "-",   // ⭐ REAL LASTSEEN
        }));
        allRecords.push(...updated);
      }

      const worksheet = XLSX.utils.json_to_sheet(
        allRecords.map((d) => ({
          "Device Name": d.name || "-",
          "Device SN": d.devSn,
          Model: d.deviceModelName || "-",
          Status: d.connectionStatus === 1 ? "Online" : "Offline",
          "Last Seen": d.lastSeen || "-",  // ⭐ REAL LASTSEEN
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Devices");
      XLSX.writeFile(workbook, `DeviceList_${pageTitle}.xlsx`);
      setGlobalLoading(false);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Error exporting data: " + (err.response?.data?.msg || err.message));
    } finally {
      setExporting(false);
    }
  };


  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false); // ✅ new dialog state


  // ✅ BULK DELETE HANDLER
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      toast.warning("Please select at least one device to delete.");
      return;
    }
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {

    try {
      setGlobalLoading(true);
      const devSns = devices
        .filter((d) => selectedRows.includes(d.id || d.devSn))
        .map((d) => d.devSn);

      if (devSns.length === 0) {
        toast.warning("No valid devices found to delete!");
        setBulkDeleteConfirm(false);
        setGlobalLoading(false);
        return;
      }

      await axios.post(`${cloudBase}api/devices/delete`, {
        accessToken: token,
        extCommunityId: communityId,
        extCommunityUuid: communityUuid,
        devSns,
      });

      toast.success(`${devSns.length} device(s) deleted successfully!`);
      setBulkDeleteConfirm(false);
      setSelectedRows([]);
      setSelectAll(false);
      fetchDevices(1, rowsPerPage);
    } catch (err) {
      toast.error("Failed to delete devices: " + err.message);
    } finally {

      setGlobalLoading(false);
    }
  };


  return (
    <Box sx={{ p: 3, backgroundColor: "#f7faff", minHeight: "100vh" }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: "#333" }}>
        Devices - {pageTitle}
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", background: "#fff" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Device Name" name="name" value={filters.name} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Device Serial" name="devSn" value={filters.devSn} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" select label="Status" name="status"
              sx={{
                // Responsive sizing
                minWidth: { xs: "100%", sm: 180, md: 200 },
                "& .MuiOutlinedInput-root": {
                  minHeight: 40,
                },
                "& .MuiSelect-select": {
                  display: "flex",
                  alignItems: "center",
                  paddingY: 1,
                  paddingX: 1.5,
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                },
              }}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: {
                      "& .MuiMenuItem-root": {
                        minHeight: 40,
                        py: 1,
                        fontSize: "0.9rem",
                      },
                    },
                  },
                },
              }}
              value={filters.status} onChange={handleChange}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value={1}>Online</MenuItem>
              <MenuItem value={0}>Offline</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Grid item xs={12} sm={2.5}><Button variant="contained" startIcon={<SearchIcon />} color="primary" fullWidth onClick={onSearch}>Search</Button></Grid>
          <Grid item xs={12} sm={2.5}><Button variant="contained" startIcon={<RestartAltIcon />} color="secondary" fullWidth onClick={onReset} sx={{ backgroundColor: "#5c6bc0" }}>Reset</Button></Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", backgroundColor: "#fff" }}>


        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleAdd}
            >
              Add Device
            </Button>

            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteForever />}
              onClick={handleBulkDelete}
              disabled={selectedRows.length === 0 || loading}
            >
              Delete
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SyncIcon />}
              onClick={handleManualLastSeenSync}
              disabled={syncLoading}
            >
              {syncLoading ? "Syncing..." : "Manual Last Seen Sync"}
            </Button>


          </Stack>

          <Button
            variant="contained"
            color="success"
            sx={{ borderRadius: 2 }}
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </Stack>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer >
              <Table size="small" >
                <TableHead sx={{ backgroundColor: "#e8eaf6" }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectAll}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectAll(checked);
                          if (checked)
                            setSelectedRows(devices.map((d) => d.id || d.devSn));
                          else setSelectedRows([]);
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Serial No</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Model</TableCell>
                    {/* <TableCell sx={{ fontWeight: "bold" }}>IP Address</TableCell> */}
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Last Seen</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {error ? <TableRow><TableCell colSpan={7} align="center" sx={{ color: "red" }}>{error}</TableCell></TableRow> :
                    devices.length === 0 ? <TableRow><TableCell colSpan={7} align="center">No Devices Found</TableCell></TableRow> :
                      devices.map((d, i) => (
                        <TableRow key={i} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedRows.includes(d.id || d.devSn)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked)
                                  setSelectedRows([...selectedRows, d.id || d.devSn]);
                                else
                                  setSelectedRows(
                                    selectedRows.filter((x) => x !== (d.id || d.devSn))
                                  );
                              }}
                            />
                          </TableCell>
                          <TableCell>{d.name}</TableCell>
                          <TableCell>{d.devSn}</TableCell>
                          <TableCell>{d.deviceModelName}</TableCell>
                          {/* <TableCell>{d.ipAddress || "-"}</TableCell> */}
                          <TableCell><Chip label={d.connectionStatus === 1 ? "Online" : "Offline"} color={d.connectionStatus === 1 ? "success" : "error"} size="small" /></TableCell>
                          <TableCell>{d.connectionStatus === 1 ? "" : getLastSeenText(d)}</TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, d)}  // ✅ Pass row here
                            >
                              <MoreVert />
                            </IconButton>

                            {selectedRow?.id === d.id && (
                              <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                                anchorOrigin={{
                                  vertical: "bottom",
                                  horizontal: "center",
                                }}
                                transformOrigin={{
                                  vertical: "top",
                                  horizontal: "center",
                                }}
                              >
                                <MenuItem
                                  onClick={() => handleView(selectedRow)} // ✅ Use selectedRow
                                  sx={{ py: 1.2, px: 2 }}
                                >
                                  <Visibility fontSize="small" sx={{ mr: 1, color: "primary.main" }} /> View
                                </MenuItem>

                                <MenuItem
                                  onClick={() => handleEdit(selectedRow)} // ✅ Use selectedRow
                                  sx={{ py: 1.2, px: 2 }}
                                >
                                  <Edit fontSize="small" sx={{ mr: 1, color: "secondary.main" }} /> Edit
                                </MenuItem>
                                <MenuItem
                                  onClick={() => handleReplace(selectedRow)} // ✅ Use selectedRow
                                  sx={{ py: 1.2, px: 2 }}
                                >
                                  <ChangeCircle fontSize="small" sx={{ mr: 1, color: "warning.main" }} /> Replace
                                </MenuItem>

                                <MenuItem
                                  onClick={() => handleDelete(selectedRow)} // ✅ Use selectedRow
                                  sx={{ py: 1.2, px: 2 }}
                                >
                                  <Delete fontSize="small" sx={{ mr: 1, color: "error.main" }} /> Delete
                                </MenuItem>
                              </Menu>
                            )}
                          </TableCell>

                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
            {devices.length > 0 && <TablePagination component="div" count={totalCount} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 20, 50]} />}

            {/* ===== Replace Device Dialog ===== */}
            <Dialog open={replaceDialogOpen} onClose={() => setReplaceDialogOpen(false)}>
              <DialogTitle>Replace Device</DialogTitle>
              <DialogContent sx={{ pt: 2 }}>
                {/* Old Device */}
                <TextField
                  label="Old Device Serial"
                  fullWidth
                  margin="dense"
                  value={replaceData.oldDevSn}
                  disabled
                />

                {/* New Device */}
                <TextField
                  label="New Device Serial"
                  fullWidth
                  margin="dense"
                  value={replaceData.newDevSn}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setReplaceData({ ...replaceData, newDevSn: val });
                    checkNewDevice(val);
                  }}
                  error={!newDeviceAvailable && replaceData.newDevSn !== ""}
                  helperText={
                    replaceData.newDevSn !== "" && !newDeviceAvailable
                      ? deviceStatus === -1
                        ? "Device not found in Thinmoo Cloud!"
                        : "This device is already registered or bound!"
                      : ""
                  }
                  disabled={checking}
                />
              </DialogContent>

              <DialogActions>
                <Button onClick={() => setReplaceDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={confirmReplace}
                  variant="contained"
                  color="warning"
                  disabled={!replaceData.newDevSn || !newDeviceAvailable}
                >
                  Replace
                </Button>
              </DialogActions>
            </Dialog>

            {/* ✅ BULK DELETE CONFIRMATION DIALOG */}
            <Dialog
              open={bulkDeleteConfirm}
              onClose={() => setBulkDeleteConfirm(false)}
            >
              <DialogTitle>Delete Selected Devices</DialogTitle>
              <DialogContent>
                Are you sure you want to delete{" "}
                <b>{selectedRows.length}</b> selected device(s)?
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={confirmBulkDelete}
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>

          </>
        )}
      </Paper>

      {/* Add/Edit/View Dialog */}
      <DeviceDialog open={openDialog} onClose={() => setOpenDialog(false)} device={selectedDevice} mode={dialogMode} communityId={communityId} communityUuid={communityUuid} onSuccess={() => fetchDevices(1, rowsPerPage)} />

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)}>
        <DialogTitle>Delete Device</DialogTitle>
        <DialogContent>Are you sure you want to delete this device?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
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
      {globalLoading && (
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
  );
}


