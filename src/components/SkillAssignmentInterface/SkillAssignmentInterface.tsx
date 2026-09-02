import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Lightbulb,
  Save,
  Zap,
  Target,
  Brain,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { skillAssignmentAPI, canvasAPI, skillMatrixAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCourseList } from '../../hooks/useCourseList';
import { CanvasCourse, SkillMatrix } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';

interface CanvasQuiz {
  id: string;
  title: string;
  course_id: string;
}

interface CanvasQuestion {
  id: string;
  question_text: string;
  quiz_id: string;
  question_type?: string;
  points?: number;
}

interface QuestionSkills {
  [questionText: string]: string[];
}

interface Suggestions {
  [questionText: string]: string[];
}

interface QuestionAnalysis {
  // Backend echoes back whatever opaque id we send per question; we now send
  // the question text as that id, so this field carries text, not a Canvas id.
  questionId: string;
  suggestedSkills: string[];
}

interface FormData {
  courseId: string;
  quizId: string;
}

interface AIAnalysisStatus {
  [questionText: string]: 'pending' | 'analyzing' | 'completed' | 'error';
}

interface HumanReviewStatus {
  [questionText: string]: boolean;
}

function extractTextFromHTML(htmlString: string) {
  if (!htmlString) return '';
  var div = document.createElement('div');
  div.innerHTML = htmlString;
  return div.textContent || div.innerText || '';
}

// Question text is now the identifier used for skill assignment (state keys,
// API payloads); Canvas question ids are only kept for React list keys / search.
function getQuestionKey(question: CanvasQuestion): string {
  return extractTextFromHTML(question.question_text);
}

const SkillAssignmentInterface: React.FC = () => {
  const [quizzes, setQuizzes] = useState<CanvasQuiz[]>([]);
  const [questions, setQuestions] = useState<CanvasQuestion[]>([]);
  const [questionSkills, setQuestionSkills] = useState<QuestionSkills>({});
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [bulkSkill, setBulkSkill] = useState<string>('');
  const [autoAnalysisInProgress, setAutoAnalysisInProgress] = useState<boolean>(false);
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState<AIAnalysisStatus>({});
  const [humanReviewStatus, setHumanReviewStatus] = useState<HumanReviewStatus>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');

  // New state for skill matrix selection
  const [availableMatrices, setAvailableMatrices] = useState<SkillMatrix[]>([]);
  const [selectedMatrix, setSelectedMatrix] = useState<string>('');
  const [selectedMatrixData, setSelectedMatrixData] = useState<SkillMatrix | null>(null);
  const [loadingMatrices, setLoadingMatrices] = useState<boolean>(false);

  const [selectedPastCourse, setSelectedPastCourse] = useState<string>('');
  const [selectedPastCourseData, setSelectedPastCourseData] = useState<CanvasCourse | null>(null);
  //const [selectedCourseData, setSelectedCourseData] = useState<CanvasCourse | null>(null);
  const [showImportBox, setShowImportBox] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>();

  const watchedCourse = watch('courseId');
  const watchedQuiz = watch('quizId');

  const { isInstructor } = useAuth();
  const { courses, loading: coursesLoading, error: coursesError } = useCourseList<CanvasCourse>(isInstructor);

  useEffect(() => {
    if (coursesError) {
      toast.error('Failed to load courses. Please check your Canvas integration.');
    }
  }, [coursesError]);

  // Backend AI analysis for all questions
  const analyzeQuestionsWithAI = useCallback(
    async (questions: CanvasQuestion[]): Promise<void> => {
      if (!isInstructor || questions.length === 0) {
        return;
      }

      setAutoAnalysisInProgress(true);

      // Set all questions to analyzing status
      const analyzingStatus: AIAnalysisStatus = {};
      questions.forEach((q) => (analyzingStatus[getQuestionKey(q)] = 'analyzing'));
      setAiAnalysisStatus(analyzingStatus);

      try {
        const requestData = {
          courseId: selectedCourse,
          quizId: selectedQuiz,
          matrixId: selectedMatrix,
          questions: questions.map((q) => {
            const questionText = getQuestionKey(q);
            return {
              // Backend just echoes this back as the correlation id; using
              // question text here so suggestions come back keyed by text.
              id: questionText,
              text: questionText,
              type: q.question_type || 'multiple_choice',
              points: q.points || 1,
            };
          }),
        };

        const response = await skillAssignmentAPI.analyzeQuestions(requestData);

        // Process the response and update suggestions
        const newSuggestions: Suggestions = {};
        const completedStatus: AIAnalysisStatus = {};

        if (Array.isArray(response.data)) {
          response.data.forEach((analysis: QuestionAnalysis) => {
            if (analysis.questionId && Array.isArray(analysis.suggestedSkills)) {
              newSuggestions[analysis.questionId] = analysis.suggestedSkills;
              completedStatus[analysis.questionId] = 'completed';
            }
          });
        }

        // Set any remaining questions to completed (in case response is incomplete)
        questions.forEach((q) => {
          const questionKey = getQuestionKey(q);
          if (!completedStatus[questionKey]) {
            completedStatus[questionKey] = 'completed';
            if (!newSuggestions[questionKey]) {
              newSuggestions[questionKey] = [];
            }
          }
        });

        setSuggestions(newSuggestions);
        setAiAnalysisStatus(completedStatus);

        // Provide feedback based on results
        const totalSuggestions = Object.values(newSuggestions).reduce(
          (acc, skills) => acc + skills.length,
          0
        );
        if (totalSuggestions === 0) {
          toast.error(
            'AI analysis returned no suggestions, create custom skill'
          );
        } else {
          toast.success(
            `AI analyzed ${questions.length} questions and provided ${totalSuggestions} skill suggestions`
          );
        }
      } catch (error: unknown) {
        console.error('Error analyzing questions with AI:', error);

        const errorStatus: AIAnalysisStatus = {};
        questions.forEach((q) => (errorStatus[getQuestionKey(q)] = 'error'));
        setAiAnalysisStatus(errorStatus);

        // Provide detailed error handling with fallback message
        const axiosError = axios.isAxiosError(error) ? error : undefined;
        const status = axiosError?.response?.status;
        if (status === 400) {
          const errorMsg =
            axiosError?.response?.data?.message || axiosError?.response?.data?.error || 'Bad request format';
          toast.error(
            `Error Loading suggestion. Create Custom skill. AI service: ${errorMsg}`
          );
        } else if (status === 401) {
          toast.error('Authentication failed. Please check your instructor token in Settings.');
        } else if (status === 403) {
          toast.error('Access denied. Instructor permissions required.');
        } else {
          toast.error(
            `Error Loading suggestion. Create Custom skill. AI service temporarily unavailable.`
          );
        }
      } finally {
        setAutoAnalysisInProgress(false);
      }
    },
    // generateMockQuestionSuggestions is intentionally omitted: it's redefined
    // every render, and including it would make this callback (and everything
    // that depends on it) unstable, re-triggering the load effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isInstructor, selectedCourse, selectedQuiz, selectedMatrix]
  );

  const getSection = useCallback((courseCode: string) => {
    const parts = courseCode.split(' ');
    return parts[1]; // "0002"
  }, []);

  const getBaseCourseCode = useCallback((courseCode?: string) => {
    if (!courseCode) return '';
    return courseCode.split('-')[0];
  }, []);

  const findPastCourse = useCallback(
    (selected: CanvasCourse) => {
      const base = getBaseCourseCode(selected.code);
      const section = getSection(selected.code);
      const matches = courses.filter(
        (c) =>
          getBaseCourseCode(c.code) === base &&
          getSection(c.code) === section &&
          c.id !== selected.id &&
          c.term < selected.term
      );

      matches.sort((a, b) => b.term - a.term);

      return matches[0];
    },
    [courses, getBaseCourseCode, getSection]
  );

  const loadQuizzes = useCallback(
    async (courseId: string): Promise<void> => {
      try {
        setLoading(true);

        const response = isInstructor
          ? await canvasAPI.getInstructorQuizzes(courseId)
          : await canvasAPI.getQuizzes(courseId);

        setQuizzes(response.data);

        setSelectedCourse(courseId);
        //setSelectedCourseData(course || null);
        const statusResponse = await skillMatrixAPI.getImportStatus(courseId);
        const assignmentImported = statusResponse.data.assignments_imported;
        setShowImportBox(!assignmentImported);

        // Reset quiz selection when course changes
        setSelectedQuiz('');
        setQuestions([]);
        setValue('quizId', '');

        // Load available skill matrices for this course
        loadSkillMatrices(courseId);
      } catch (error) {
        console.error('Error loading quizzes:', error);
        toast.error('Failed to load quizzes. Please try again.');

        // Set empty arrays so UI doesn't break
        setQuizzes([]);
        setSelectedCourse(courseId);
        setSelectedQuiz('');
        setQuestions([]);
        setValue('quizId', '');
      } finally {
        setLoading(false);
      }
    },
    // loadSkillMatrices is intentionally omitted: it's redefined every render,
    // and including it would make this callback unstable and re-trigger the
    // course-change effect below on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isInstructor, setValue, courses]
  );

  useEffect(() => {
    if (!selectedCourse || courses.length === 0) return;

    const course = courses.find((c) => String(c.id) === String(selectedCourse));
    //setSelectedCourseData(course || null);

    const pastCourse = course ? findPastCourse(course) : undefined;

    if (pastCourse) {
      setSelectedPastCourse(pastCourse.id);
      setSelectedPastCourseData(pastCourse);
    } else {
      setSelectedPastCourse('');
      setSelectedPastCourseData(null);
    }
  }, [selectedCourse, courses, findPastCourse]);

  const handleImportAssignmentsFromPastCourse = async (pastCourseId: string) => {
    if (!selectedCourse) {
      toast.error('No target course selected');
      return;
    }

    if (!pastCourseId) {
      toast.error('No past course selected');
      return;
    }

    try {
      const response = await skillAssignmentAPI.importAssignmentsFromCourse(
        pastCourseId,
        selectedCourse
      );

      toast.success(
        `Imported ${response.data.imported_count} skill assignment(s) from past course`
      );
      const statusResponse = await skillMatrixAPI.getImportStatus(selectedCourse);
      const assignmentImported = statusResponse.data.assignments_imported;
      setShowImportBox(!assignmentImported);

      // optional: reload questions so UI shows new assigned skills immediately
      if (selectedQuiz) {
        await loadQuestions(selectedQuiz, selectedCourse);
      }
    } catch (error) {
      console.error('Import skill assignments failed:', error);
      toast.error('Failed to import skill assignments from past course');
    }
  };

  const loadSkillMatrices = async (courseId: string) => {
    try {
      setLoadingMatrices(true);

      const response = await skillMatrixAPI.getAllByCourse(courseId);

      setAvailableMatrices(response.data);

      // Auto-select first matrix if available
      if (response.data.length > 0) {
        setSelectedMatrix(response.data[0]._id);
        setSelectedMatrixData(response.data[0]);
      } else {
        setSelectedMatrix('');
        setSelectedMatrixData(null);

        // Show helpful guidance when no matrices exist
        toast.success(
          `No skill matrices found for this course yet. Create one first using the Skill Matrix page.`,
          {
            duration: 5000,
          }
        );
      }
    } catch (error: unknown) {
      console.error('Error loading skill matrices:', error);
      const axiosError = axios.isAxiosError(error) ? error : undefined;
      const status = axiosError?.response?.status;
      console.error('Error details:', {
        status,
        statusText: axiosError?.response?.statusText,
        data: axiosError?.response?.data,
        url: axiosError?.response?.config?.url,
        courseId: courseId,
      });

      // Provide more specific error messages and guidance based on status
      if (status === 404) {
        setAvailableMatrices([]);
        setSelectedMatrix('');
        setSelectedMatrixData(null);
        toast.error(`No skill matrices found. Please create a skill matrix first.`);
      } else if (status === 401) {
        toast.error('Authentication failed. Please check your instructor token in Settings.');
        setAvailableMatrices([]);
        setSelectedMatrix('');
        setSelectedMatrixData(null);
      } else if (status === 403) {
        console.error('403 Forbidden Error Details:', {
          message: axiosError?.response?.data?.message || 'No error message provided',
          error: axiosError?.response?.data?.error || 'No error details',
          url: axiosError?.response?.config?.url,
          method: axiosError?.response?.config?.method,
          headers: axiosError?.response?.config?.headers,
          courseId: courseId,
        });

        // Check if it's a token issue vs permission issue
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('No authentication token found. Please log in again.');
        } else {
          toast.error(
            <div className="space-y-2">
              <p>
                <strong>Access Denied (403 Forbidden)</strong>
              </p>
              <p className="text-sm">
                Your instructor token may not have permission to access matrices for this course.
              </p>
              <p className="text-sm">
                Please check your Canvas instructor permissions or try refreshing your token in
                Settings.
              </p>
            </div>,
            { duration: 8000 }
          );
        }

        setAvailableMatrices([]);
        setSelectedMatrix('');
        setSelectedMatrixData(null);

      } else if (status !== undefined && status >= 500) {
        toast.error('Server error while loading matrices.');
        setAvailableMatrices([]);
        setSelectedMatrix('');
        setSelectedMatrixData(null);
      } else {
        const message = axiosError?.message ?? (error instanceof Error ? error.message : 'Unknown error');
        console.warn('Failed to load skill matrices:', message);
        toast.error(
          `Failed to load skill matrices: ${message}. Please try again.`
        );

        // Fallback Error
        setAvailableMatrices([]);
        setSelectedMatrix('');
        setSelectedMatrixData(null);
      }
    } finally {
      setLoadingMatrices(false);
    }
  };

  const loadQuestions = useCallback(
    async (quizId: string, selectedCourse: string): Promise<void> => {
      try {
        setLoading(true);
        const response = isInstructor
          ? await canvasAPI.getInstructorQuestions(quizId, selectedCourse)
          : await canvasAPI.getQuestions(quizId);

        const sanitizedQuestions = response.data.map((q: CanvasQuestion) => ({
          ...q,
          question_text: extractTextFromHTML(q.question_text),
        }));
        setQuestions(sanitizedQuestions);
        setSelectedQuiz(quizId);

        // Pull assigned skills from AchieveUp DB, keyed by question text
        const questionTexts = sanitizedQuestions.map((q: CanvasQuestion) => getQuestionKey(q));

        const skillsResponse = await skillAssignmentAPI.getAssignments(
          selectedCourse,
          questionTexts
        );

        // Expected shape:
        // { question_skills: { [questionText]: string[] } }
        const savedSkills = skillsResponse.data?.question_skills || {};

        // Initialize question skills and status
        const initialSkills: QuestionSkills = {};
        const initialStatus: AIAnalysisStatus = {};
        const initialReviewStatus: HumanReviewStatus = {};

        sanitizedQuestions.forEach((question: CanvasQuestion) => {
          const questionKey = getQuestionKey(question);
          initialSkills[questionKey] = savedSkills[questionKey] ?? [];
          initialStatus[questionKey] = 'pending';
          initialReviewStatus[questionKey] = false;
        });

        setQuestionSkills(initialSkills);
        setAiAnalysisStatus(initialStatus);
        setHumanReviewStatus(initialReviewStatus);

        // Auto-analyze questions if instructor and questions exist
        if (isInstructor && response.data.length > 0) {
          analyzeQuestionsWithAI(response.data);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
        toast.error('Failed to load questions. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [isInstructor, analyzeQuestionsWithAI]
  );

  useEffect(() => {
    if (watchedCourse) {
      loadQuizzes(watchedCourse);
    }
  }, [watchedCourse, loadQuizzes]);

  useEffect(() => {
    if (watchedQuiz) {
      loadQuestions(watchedQuiz, watchedCourse);
    }
  }, [watchedQuiz, loadQuestions, watchedCourse]);

  const addSkillToQuestion = (questionText: string, skill: string): void => {
    setQuestionSkills((prev) => ({
      ...prev,
      [questionText]: [...(prev[questionText] || []), skill],
    }));
  };

  const removeSkillFromQuestion = (questionText: string, skillIndex: number): void => {
    setQuestionSkills((prev) => ({
      ...prev,
      [questionText]: prev[questionText].filter((_, index) => index !== skillIndex),
    }));
  };

  const addSuggestionToQuestion = (questionText: string, skill: string): void => {
    if (!questionSkills[questionText]?.includes(skill)) {
      addSkillToQuestion(questionText, skill);
    }
  };

  const handleMatrixSelection = (matrixId: string) => {
    const matrix = availableMatrices.find((m) => m._id === matrixId);
    setSelectedMatrix(matrixId);
    setSelectedMatrixData(matrix || null);
  };

  const getMatrixSkills = (): string[] => {
    return selectedMatrixData?.skills || [];
  };

  const bulkAssignSkill = (skill: string): void => {
    if (!skill) return;

    const filteredQuestions = getFilteredQuestions();
    const updatedSkills = { ...questionSkills };

    filteredQuestions.forEach((question) => {
      const questionKey = getQuestionKey(question);
      if (!updatedSkills[questionKey]?.includes(skill)) {
        updatedSkills[questionKey] = [...(updatedSkills[questionKey] || []), skill];
      }
    });

    setQuestionSkills(updatedSkills);
    setBulkSkill('');
    toast.success(`Added "${skill}" to ${filteredQuestions.length} questions`);
  };

  const bulkAssignFromSuggestions = (): void => {
    const updatedSkills = { ...questionSkills };
    let assignedCount = 0;
    let questionsWithSuggestions = 0;

    // Process all questions (not just filtered ones) that have suggestions
    questions.forEach((question) => {
      const questionKey = getQuestionKey(question);
      const questionSuggestions = suggestions[questionKey] || [];
      if (questionSuggestions.length > 0) {
        questionsWithSuggestions++;
        questionSuggestions.forEach((skill) => {
          if (!updatedSkills[questionKey]?.includes(skill)) {
            updatedSkills[questionKey] = [...(updatedSkills[questionKey] || []), skill];
            assignedCount++;
          }
        });
      }
    });

    setQuestionSkills(updatedSkills);

    if (assignedCount > 0) {
      toast.success(
        `Assigned ${assignedCount} skills from AI suggestions to ${questionsWithSuggestions} questions`
      );
    } else {
      toast.error('No new skills to assign - all AI suggestions are already assigned');
    }
  };

  const getFilteredQuestions = () => {
    if (!Array.isArray(questions)) {
      return [];
    }

    return questions.filter((question) => {
      const matchesSearch =
        question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.id.toLowerCase().includes(searchTerm.toLowerCase());

      const questionKey = getQuestionKey(question);
      const matchesSkillFilter =
        skillFilter === 'all' ||
        (skillFilter === 'assigned' && questionSkills[questionKey]?.length > 0) ||
        (skillFilter === 'unassigned' &&
          (!questionSkills[questionKey] || questionSkills[questionKey].length === 0));

      return matchesSearch && matchesSkillFilter;
    });
  };

  const getAssignmentStats = () => {
    const totalQuestions = questions.length;
    const assignedQuestions = Object.values(questionSkills).filter(
      (skills) => skills.length > 0
    ).length;
    const totalSkills = Object.values(questionSkills).reduce(
      (acc, skills) => acc + skills.length,
      0
    );
    return {
      totalQuestions,
      assignedQuestions,
      unassignedQuestions: totalQuestions - assignedQuestions,
      totalSkills,
    };
  };

  const onSubmit = async (data: FormData): Promise<void> => {
    if (!selectedCourse || !selectedQuiz) {
      toast.error('Please select a course and quiz');
      return;
    }

    setLoading(true);
    try {
      const assignmentData = {
        course_id: selectedCourse,
        question_skills: questionSkills,
      };

      await skillAssignmentAPI.assign(assignmentData);
      toast.success('Skills assigned successfully!');
    } catch (error) {
      console.error('Error assigning skills:', error);
      toast.error('Failed to assign skills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = (questionId: string) => {
    setHumanReviewStatus((prev) => ({
      ...prev,
      [questionId]: true,
    }));
  };

  // const [questionAnalysis, setQuestionAnalysis] = useState<QuestionAnalysis[]>([]);

  const stats = getAssignmentStats();
  const filteredQuestions = getFilteredQuestions();

  if (coursesLoading && courses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ucf-gold"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card
        title="Skill Assignment Interface"
        subtitle="Assign skills to quiz questions using AI-powered analysis and zero-shot classification"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Course and Quiz Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
              <select
                {...register('courseId', { required: 'Please select a course' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ucf-gold"
              >
                <option value="">Select a course</option>
                {Array.isArray(courses) &&
                  courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
              </select>
              {errors.courseId && (
                <p className="mt-1 text-sm text-red-600">{errors.courseId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Skill Matrix</label>
              <select
                value={selectedMatrix}
                onChange={(e) => handleMatrixSelection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ucf-gold"
                disabled={!selectedCourse || loadingMatrices}
              >
                <option value="">
                  {!selectedCourse
                    ? 'Select a course first'
                    : loadingMatrices
                      ? 'Loading matrices...'
                      : availableMatrices.length === 0
                        ? 'No skill matrices found'
                        : 'Select a skill matrix'}
                </option>
                {availableMatrices.map((matrix) => (
                  <option key={matrix._id} value={matrix._id}>
                    {matrix.matrix_name} ({matrix.skills.length} skills)
                  </option>
                ))}
              </select>
              {selectedCourse && availableMatrices.length === 0 && !loadingMatrices && (
                <p className="mt-1 text-sm text-blue-600">
                  <a href="/skill-matrix" className="hover:underline">
                    Create a skill matrix first
                  </a>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz</label>
              <select
                {...register('quizId', { required: 'Please select a quiz' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ucf-gold"
                disabled={!selectedCourse || loading || !selectedMatrix || availableMatrices.length === 0}
              >
                <option value="">
                  {!selectedCourse
                    ? 'Select a course first'
                    : loading
                      ? 'Loading quizzes...'
                      : 'Select a quiz'}
                </option>
                {Array.isArray(quizzes) &&
                  quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title}
                    </option>
                  ))}
              </select>
              {errors.quizId && (
                <p className="mt-1 text-sm text-red-600">{errors.quizId.message}</p>
              )}
            </div>
          </div>

          {/* No Course Selected */}
          {!selectedCourse && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a Course to Get Started
              </h3>
              <p className="text-gray-600">
                Choose one of your courses above to view and assign skills to quiz questions.
              </p>
            </div>
          )}

          {showImportBox && selectedPastCourseData && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-blue-900">Similar Course Found</h4>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={() => handleImportAssignmentsFromPastCourse(selectedPastCourse)}
                >
                  Import Assignments From {selectedPastCourseData?.name}
                </button>
              </div>
            </div>
          )}

          {/* No Quiz Selected */}
          {selectedCourse && !selectedQuiz && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Quiz</h3>
              <p className="text-gray-600">
                Choose a quiz from the dropdown above to view its questions and assign skills.
              </p>
              {quizzes.length === 0 && selectedCourse && !loading && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">No Quizzes Found</h4>
                  <p className="text-sm text-blue-700">
                    This course doesn't have any quizzes yet. Create quizzes in Canvas to start
                    assigning skills to questions.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Selected Matrix Info */}
          {selectedMatrixData && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-medium text-green-900 mb-2">
                    Using Skill Matrix: {selectedMatrixData.matrix_name}
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    {selectedMatrixData.skills.length} skills available for assignment
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatrixData.skills.slice(0, 8).map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {skill}
                      </span>
                    ))}
                    {selectedMatrixData.skills.length > 8 && (
                      <span className="text-xs text-green-600">
                        +{selectedMatrixData.skills.length - 8} more skills
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <span className="text-xs text-green-600">
                    Created: {new Date(selectedMatrixData.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* No Matrix Selected Warning */}
          {selectedCourse && availableMatrices.length > 0 && !selectedMatrix && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">No Skill Matrix Selected</h4>
                  <p className="text-sm text-yellow-700">
                    Please select a skill matrix to see available skills for assignment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats and Actions - Only show if quiz is selected */}
          {selectedQuiz && questions.length > 0 && (
            <>
              {/* Stats and Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold">{stats.totalQuestions}</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900">Total Questions</p>
                      <p className="text-xs text-blue-600">Available for assignment</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-bold">{stats.assignedQuestions}</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900">Assigned</p>
                      <p className="text-xs text-green-600">Have skills assigned</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 font-bold">{stats.unassignedQuestions}</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-900">Unassigned</p>
                      <p className="text-xs text-yellow-600">Need skill assignment</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-bold">{stats.totalSkills}</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900">Total Skills</p>
                      <p className="text-xs text-purple-600">Assigned across all questions</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Analysis Controls */}
              {isInstructor && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Brain className="w-6 h-6 text-blue-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">AI-Powered Analysis</h3>
                        <p className="text-sm text-gray-600">
                          Let AI analyze questions and suggest skills automatically
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        onClick={() => analyzeQuestionsWithAI(questions)}
                        loading={autoAnalysisInProgress}
                        disabled={questions.length === 0}
                        className="flex items-center"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Analyze Questions
                      </Button>
                      <Button
                        type="button"
                        onClick={bulkAssignFromSuggestions}
                        variant="secondary"
                        disabled={Object.values(suggestions).every((arr) => arr.length === 0)}
                        className="flex items-center"
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Bulk Assign
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ucf-gold"
                >
                  <option value="all">All Questions</option>
                  <option value="assigned">Assigned Questions</option>
                  <option value="unassigned">Unassigned Questions</option>
                </select>
              </div>

              {/* Bulk Operations */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Bulk Operations</h4>

                {/* Matrix Skills Quick Assignment */}
                {selectedMatrixData && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">
                      Quick Assign from Matrix:
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {getMatrixSkills().map((skill: string, index: number) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => bulkAssignSkill(skill)}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full hover:bg-blue-200 transition-colors"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Skill Assignment */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter custom skill name for bulk assignment..."
                      value={bulkSkill}
                      onChange={(e) => setBulkSkill(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      onClick={() => bulkAssignSkill(bulkSkill)}
                      disabled={!bulkSkill}
                      variant="secondary"
                      size="sm"
                    >
                      Add to All
                    </Button>
                    <Button
                      type="button"
                      onClick={bulkAssignFromSuggestions}
                      disabled={Object.values(suggestions).every((arr) => arr.length === 0)}
                      variant="secondary"
                      size="sm"
                    >
                      Use AI Suggestions
                    </Button>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {Array.isArray(filteredQuestions) &&
                  filteredQuestions.map((question, index) => {
                    const questionKey = getQuestionKey(question);
                    const questionSuggestions = suggestions[questionKey] || [];
                    const assignedSkills = questionSkills[questionKey] || [];
                    const analysisStatus = aiAnalysisStatus[questionKey] || 'pending';
                    const isReviewed = humanReviewStatus[questionKey] || false;
                    const questionNumber = index + 1;

                    return (
                      <Card key={question.id} className="overflow-hidden">
                        <div className="p-6">
                          {/* Question Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <h3 className="text-lg font-medium text-gray-900">
                                  Question {questionNumber}
                                </h3>
                                {analysisStatus === 'analyzing' && (
                                  <Clock className="w-4 h-4 text-blue-500 ml-2 animate-spin" />
                                )}
                                {analysisStatus === 'completed' && (
                                  <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                                )}
                                {analysisStatus === 'error' && (
                                  <AlertCircle className="w-4 h-4 text-red-500 ml-2" />
                                )}
                                {isReviewed && (
                                  <div className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    Reviewed
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-gray-800 leading-relaxed">
                                  {question.question_text}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* AI Suggestions */}
                          {questionSuggestions.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                AI Suggestions
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(questionSuggestions) &&
                                  questionSuggestions.map((skill, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => addSuggestionToQuestion(questionKey, skill)}
                                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                        assignedSkills.includes(skill)
                                          ? 'bg-green-100 text-green-800 cursor-default'
                                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                      }`}
                                      disabled={assignedSkills.includes(skill)}
                                    >
                                      <Lightbulb className="w-3 h-3 inline mr-1" />
                                      {skill}
                                      {assignedSkills.includes(skill) && (
                                        <CheckCircle className="w-3 h-3 inline ml-1" />
                                      )}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* No AI Suggestions Available */}
                          {analysisStatus === 'completed' && questionSuggestions.length === 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                AI Suggestions
                              </h4>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center">
                                  <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                                  <p className="text-sm text-yellow-800">
                                    <strong>No AI suggestions available.</strong> The AI analysis
                                    completed but didn't return any skill recommendations for this
                                    question. This appears to be a backend issue.
                                  </p>
                                </div>
                                <p className="text-xs text-yellow-700 mt-2">
                                  You can still assign skills manually using the input field below.
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedMatrixData && (
                            <div className="mb-4">
                              <h5 className="text-xs font-medium text-gray-700 mb-2">
                                Quick Assign from Matrix:
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {getMatrixSkills().map((skill: string, index: number) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => addSuggestionToQuestion(questionKey, skill)}
                                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full hover:bg-blue-200 transition-colors"
                                  >
                                    {skill}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Assigned Skills */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Assigned Skills
                            </h4>
                            {assignedSkills.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(assignedSkills) &&
                                  assignedSkills.map((skill, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                                    >
                                      {skill}
                                      <button
                                        type="button"
                                        onClick={() => removeSkillFromQuestion(questionKey, index)}
                                        className="ml-2 text-green-600 hover:text-green-800"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm italic">No skills assigned yet</p>
                            )}
                          </div>

                          {/* Manual Skill Assignment */}
                          <div className="flex items-center space-x-2">
                            <Input
                              placeholder="Add custom skill..."
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.target as HTMLInputElement;
                                  const skill = target.value.trim();
                                  if (skill && !assignedSkills.includes(skill)) {
                                    addSkillToQuestion(questionKey, skill);
                                    target.value = '';
                                  }
                                }
                              }}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              onClick={() => markAsReviewed(questionKey)}
                              variant={isReviewed ? 'success' : 'outline'}
                              size="sm"
                            >
                              {isReviewed ? 'Reviewed' : 'Mark Reviewed'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <Button type="submit" loading={loading} className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save Skill Assignments
                </Button>
              </div>
            </>
          )}

          {/* No Questions State */}
          {selectedCourse && selectedQuiz && questions.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
              <p className="text-gray-600">
                This quiz doesn't have any questions yet. Add questions in Canvas to assign skills.
              </p>
            </div>
          )}
        </form>
      </Card>
      {/* Save Button */}
      {selectedQuiz && questions.length > 0 && (
        <div className="sticky bottom-4 z-40">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="flex justify-end p-4">
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  loading={loading}
                  disabled={stats.assignedQuestions === 0}
                  className="flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Skill Assignments
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillAssignmentInterface;
