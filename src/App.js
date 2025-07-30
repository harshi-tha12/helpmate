
// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SplashScreen from "./components/splashscreen"; // Adjust path if needed
import Login from "./pages/Login"; // Replace with your actual SuperAdmin login component
import RoleSelection from "./components/roleselection";
import SuperAdminDashboard from './pages/superadmindashboard';
import AdminDashboard from "./components/Admin/adminhome";
import AgentDashboard from "./components/Agent/agenthome";
import UserHome from "./components/User/userhome";
import TicketDetails from "./components/Admin/ticketdetails";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/superadmindashboard" element={<SuperAdminDashboard />} />
        <Route path="/admindashboard" element={<AdminDashboard />} />
        <Route path="/agentdashboard" element={<AgentDashboard />} />
        <Route path="/userdashboard" element={<UserHome />} />
        
        

      </Routes>
    </Router>
  );
}

export default App;
