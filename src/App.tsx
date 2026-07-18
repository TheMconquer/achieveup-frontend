import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
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

// Protected Route Component

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Unprotected Routes*/}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes for authenticated users*/}
      <Route element={<RequireRole roles={['student', 'instructor']} />}>
        <Route path="/" element={<RoleHome />} />
      </Route>

      {/* Protected routes for instructors*/}
      <Route element={<RequireRole roles={['instructor']} />}>
        <Route
          path="/instructor-dashboard"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
      </Route>

      {/* Protected routes for students*/}
      <Route element={<RequireRole roles={['student']} />}></Route>

      <Route
        path="/skill-matrix"
        element={
          <ProtectedRoute>
            <Layout>
              <SkillMatrixCreator />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/skill-assignment"
        element={
          <ProtectedRoute>
            <Layout>
              <SkillAssignmentInterface />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <Layout>
              <StudentProgress />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/badges-test"
        element={
          <ProtectedRoute>
            <Layout>
              <StudentBadgesTest />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/badges/:studentId" element={<StudentPublicBadges />} />
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
