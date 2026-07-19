import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import InstructorDashboard from './pages/InstructorDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Settings from './pages/Settings';
import StudentProgress from './pages/StudentProgress';
import './index.css';
import SkillMatrixCreator from './components/SkillMatrixCreator/SkillMatrixCreator';
import SkillAssignmentInterface from './components/SkillAssignmentInterface/SkillAssignmentInterface';
import StudentBadgesTest from './components/StudentBadgesTest/StudentBadgesTest';
import StudentPublicBadges from './pages/StudentPublicBadges';
import RequireRole from './components/common/RequireRole';
import RoleHome from './components/common/RoleHome';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes - no login required */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/badges/:studentId" element={<StudentPublicBadges />} />

      {/* Either role - just needs to be logged in */}
      <Route element={<RequireRole roles={['student', 'instructor']} />}>
        <Route path="/" element={<RoleHome />} />
        <Route
          path="/settings"
          element={
            <Layout>
              <Settings />
            </Layout>
          }
        />
      </Route>

      {/* Instructor only */}
      <Route element={<RequireRole roles={['instructor']} />}>
        <Route
          path="/instructor-dashboard"
          element={
            <Layout>
              <InstructorDashboard />
            </Layout>
          }
        />
        <Route
          path="/skill-matrix"
          element={
            <Layout>
              <SkillMatrixCreator />
            </Layout>
          }
        />
        <Route
          path="/skill-assignment"
          element={
            <Layout>
              <SkillAssignmentInterface />
            </Layout>
          }
        />
        <Route
          path="/progress"
          element={
            <Layout>
              <StudentProgress />
            </Layout>
          }
        />
        <Route
          path="/badges-test"
          element={
            <Layout>
              <StudentBadgesTest />
            </Layout>
          }
        />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
