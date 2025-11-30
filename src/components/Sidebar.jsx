
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Cpu, LogOut } from "lucide-react";
import "./theme.css";

export default function Sidebar({ collapsed, mobileVisible, setMobileVisible, isMobile }) {
  const username = localStorage.getItem("username");
  const location = useLocation();

  const handleNavigate = () => {
    if (isMobile) setMobileVisible(false);
  };

  /**
   * Checks if the current location should mark a link active for a given communityId AND path.
   * - targetPath is the path portion of the "to" prop (before any ?query)
   * - returns true only when both pathname startsWith targetPath AND communityId matches query param
   */
  const isCommunityActive = (communityId, targetPath) => {
    if (!communityId) return false;
    const params = new URLSearchParams(location.search);
    const currentCommunity = params.get("communityId");
    // require both path match and community id match
    return currentCommunity === communityId && location.pathname.startsWith(targetPath);
  };

  const renderNavLink = (to, label, Icon, options = {}) => {
    const { end = false, communityId } = options;
    // derive target path (part before '?') so we match pathname correctly
    const targetPath = (to || "").split("?")[0] || "/";

    return (
      <NavLink
        to={to}
        className={({ isActive }) => {
          // if communityId is provided, we require both path and communityId match
          if (communityId) {
            return isCommunityActive(communityId, targetPath) ? "nav-item active" : "nav-item";
          }
          // otherwise fallback to NavLink's isActive behaviour
          return isActive ? "nav-item active" : "nav-item";
        }}
        onClick={handleNavigate}
        end={end}
      >
        <Icon className="icon" />
        {!collapsed && <span>{label}</span>}
        {collapsed && <span className="tooltip">{label}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={`sidebar 
        ${!isMobile && collapsed ? "collapsed" : ""} 
        ${isMobile ? (mobileVisible ? "mobile-visible" : "mobile-hidden") : ""}`}
      aria-hidden={isMobile ? (!mobileVisible).toString() : "false"}
    >
      <div className="sidebar-header">
        <img src="/logo.ico" alt="logo" className="sidebar-logo" />
        {!collapsed && <h2 className="sidebar-title">MCONNECT</h2>}
      </div>

      <nav className="sidebar-nav">
        {/* ===== DEVICE PAGES ===== */}
        {username === "Admin123" && (
          <>
            {renderNavLink(
              "/device?communityId=41982&communityUuid=01000&title=Bulim A",
              "Device - Bulim A",
              Cpu,
              { communityId: "41982" }
            )}
            {renderNavLink(
              "/device?communityId=61476&communityUuid=01000&title=Bulim B",
              "Device - Bulim B",
              Cpu,
              { communityId: "61476" }
            )}
            {renderNavLink(
              "/device?communityId=50442&communityUuid=01000&title=Mandai A",
              "Device - Mandai A",
              Cpu,
              { communityId: "50442" }
            )}
            {renderNavLink(
              "/device?communityId=57042&communityUuid=01000&title=Mandai B",
              "Device - Mandai B",
              Cpu,
              { communityId: "57042" }
            )}
            {renderNavLink(
              "/device?communityId=73932&communityUuid=01000&title=TTS Sentosa",
              "TTS Sentosa",
              Cpu,
              { communityId: "73932" }
            )}
          </>
        )}

        {/* ===== AUTHORIZED DRIVER PAGES ===== */}
        {renderNavLink(
          "/authorized-driver?communityId=50442&title=Mandai",
          "Authorized Drivers - Mandai",
          Users,
          { communityId: "50442" }
        )}
        {renderNavLink(
          "/authorized-driver?communityId=41982&title=Bulim",
          "Authorized Drivers - Bulim",
          Users,
          { communityId: "41982" }
        )}
        {renderNavLink(
          "/authorized-driver?communityId=73932&title=Sentosa",
          "TTS Sentosa",
          Users,
          { communityId: "73932" }
        )}
      </nav>

    </aside>
  );
}
