import React from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import InstructorDashboard from './pages/InstructorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentCourses from './pages/StudentCourses';
import StudentCourseDetail from './pages/StudentCourseDetail';
import StudentSkills from './pages/StudentSkills';
import StudentSkillVideos from './pages/StudentSkillVideos';
import StudentBadges from './pages/StudentBadges';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Settings from './pages/Settings';
import StudentProgress from './pages/StudentProgress';
import SkillMatrixCreator from './components/SkillMatrixCreator/SkillMatrixCreator';
import SkillAssignmentInterface from './components/SkillAssignmentInterface/SkillAssignmentInterface';
import SkillVideoCurator from './pages/SkillVideoCurator';
import StudentPublicBadges from './pages/StudentPublicBadges';
import RequireRole from './components/common/RequireRole';
import RoleHome from './components/common/RoleHome';

// Supports deep-linking from search: /skill-matrix?courseId=123
const SkillMatrixRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  return <SkillMatrixCreator courseId={searchParams.get('courseId') ?? undefined} />;
};

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
              <SkillMatrixRoute />
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
          path="/skill-videos"
          element={
            <Layout>
              <SkillVideoCurator />
            </Layout>
          }
        />
      </Route>

      {/* Student only */}
      <Route element={<RequireRole roles={['student']} />}>
        <Route
          path="/student-dashboard"
          element={
            <Layout>
              <StudentDashboard />
            </Layout>
          }
        />
        <Route
          path="/courses"
          element={
            <Layout>
              <StudentCourses />
            </Layout>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <Layout>
              <StudentCourseDetail />
            </Layout>
          }
        />
        <Route
          path="/skills"
          element={
            <Layout>
              <StudentSkills />
            </Layout>
          }
        />
        <Route
          path="/badges"
          element={
            <Layout>
              <StudentBadges />
            </Layout>
          }
        />
        <Route
          path="/my-skill-videos"
          element={
            <Layout>
              <StudentSkillVideos />
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
