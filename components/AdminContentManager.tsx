import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp,
  GripVertical, Play, Eye, EyeOff, BookOpen, Clock, Save, X, Search
} from 'lucide-react';
import { supabase } from '../utils/supabase.ts';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';

// ─── Types ───────────────────────────────────────────────────────────

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_minutes: number;
  sort_order: number;
  is_free: boolean;
  created_at?: string;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  sort_order: number;
  is_published: boolean;
  created_by: string | null;
  created_at?: string;
  lessons: Lesson[];
}

interface AdminContentManagerProps {
  userId: string;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const CATEGORIES = ['Pré-Flop', 'Pós-Flop', 'Fundamentos', 'Mentalidade', 'Bankroll', 'Torneios', 'Cash Game', 'Geral'];

const getYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};

const getYouTubeThumbnail = (url: string): string | null => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
};

// ─── Component ───────────────────────────────────────────────────────

const AdminContentManager: React.FC<AdminContentManagerProps> = ({ userId, onBack }) => {
  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Course editing
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [isNewCourse, setIsNewCourse] = useState(false);

  // Lesson editing
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [isNewLesson, setIsNewLesson] = useState(false);
  const [editingLessonCourseId, setEditingLessonCourseId] = useState<string | null>(null);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'course' | 'lesson'; id: string; name: string } | null>(null);

  // ─── Load ────────────────────────────────────────────────────────

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*, lessons(*)')
      .order('sort_order', { ascending: true });

    if (data) {
      const sorted = data.map((c: any) => ({
        ...c,
        lessons: (c.lessons || []).sort((a: Lesson, b: Lesson) => a.sort_order - b.sort_order),
      }));
      setCourses(sorted);
    }
    if (error) showFeedback('error', 'Erro ao carregar cursos.');
    setLoading(false);
  };

  // ─── Feedback ────────────────────────────────────────────────────

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    if (type === 'success') setTimeout(() => setFeedback(null), 2500);
  };

  // ─── Filter ──────────────────────────────────────────────────────

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase().trim();
    return courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.lessons.some(l => l.title.toLowerCase().includes(q))
    );
  }, [courses, searchQuery]);

  // ─── Course CRUD ─────────────────────────────────────────────────

  const openNewCourse = () => {
    setEditingCourse({
      title: '',
      description: '',
      thumbnail_url: '',
      category: 'Geral',
      sort_order: courses.length,
      is_published: false,
    });
    setIsNewCourse(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse({ ...course });
    setIsNewCourse(false);
  };

  const saveCourse = async () => {
    if (!editingCourse?.title?.trim()) {
      showFeedback('error', 'Título é obrigatório.');
      return;
    }

    setSaving(true);
    const payload = {
      title: editingCourse.title!.trim(),
      description: editingCourse.description?.trim() || null,
      thumbnail_url: editingCourse.thumbnail_url?.trim() || null,
      category: editingCourse.category || 'Geral',
      sort_order: editingCourse.sort_order ?? 0,
      is_published: editingCourse.is_published ?? false,
    };

    if (isNewCourse) {
      const { error } = await supabaseAdmin
        .from('courses')
        .insert({ ...payload, created_by: userId });
      if (error) {
        showFeedback('error', `Erro ao criar curso: ${error.message}`);
      } else {
        showFeedback('success', 'Curso criado!');
        setEditingCourse(null);
      }
    } else {
      const { error } = await supabaseAdmin
        .from('courses')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingCourse.id);
      if (error) {
        showFeedback('error', `Erro ao salvar: ${error.message}`);
      } else {
        showFeedback('success', 'Curso atualizado!');
        setEditingCourse(null);
      }
    }
    setSaving(false);
    await loadCourses();
  };

  const deleteCourse = async (id: string) => {
    setSaving(true);
    const { error } = await supabaseAdmin.from('courses').delete().eq('id', id);
    if (error) {
      showFeedback('error', `Erro ao excluir: ${error.message}`);
    } else {
      showFeedback('success', 'Curso excluído!');
      if (expandedCourseId === id) setExpandedCourseId(null);
    }
    setConfirmDelete(null);
    setSaving(false);
    await loadCourses();
  };

  const duplicateCourse = async (course: Course) => {
    setSaving(true);
    // Insert duplicated course
    const { data: newCourse, error: courseErr } = await supabaseAdmin
      .from('courses')
      .insert({
        title: `${course.title} (cópia)`,
        description: course.description,
        thumbnail_url: course.thumbnail_url,
        category: course.category,
        sort_order: courses.length,
        is_published: false,
        created_by: userId,
      })
      .select()
      .single();

    if (courseErr || !newCourse) {
      showFeedback('error', `Erro ao duplicar: ${courseErr?.message}`);
      setSaving(false);
      return;
    }

    // Duplicate lessons
    if (course.lessons.length > 0) {
      const lessonsCopy = course.lessons.map(l => ({
        course_id: newCourse.id,
        title: l.title,
        description: l.description,
        video_url: l.video_url,
        duration_minutes: l.duration_minutes,
        sort_order: l.sort_order,
        is_free: l.is_free,
      }));
      const { error: lessonsErr } = await supabaseAdmin.from('lessons').insert(lessonsCopy);
      if (lessonsErr) {
        showFeedback('error', `Curso duplicado, mas erro nas aulas: ${lessonsErr.message}`);
        setSaving(false);
        await loadCourses();
        return;
      }
    }

    showFeedback('success', `Curso duplicado com ${course.lessons.length} aulas!`);
    setSaving(false);
    await loadCourses();
  };

  const togglePublish = async (course: Course) => {
    const { error } = await supabaseAdmin
      .from('courses')
      .update({ is_published: !course.is_published, updated_at: new Date().toISOString() })
      .eq('id', course.id);
    if (error) {
      showFeedback('error', `Erro: ${error.message}`);
    } else {
      showFeedback('success', course.is_published ? 'Curso despublicado.' : 'Curso publicado!');
    }
    await loadCourses();
  };

  // ─── Lesson CRUD ─────────────────────────────────────────────────

  const openNewLesson = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setEditingLesson({
      title: '',
      description: '',
      video_url: '',
      duration_minutes: 0,
      sort_order: course?.lessons.length ?? 0,
      is_free: false,
    });
    setEditingLessonCourseId(courseId);
    setIsNewLesson(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson({ ...lesson });
    setEditingLessonCourseId(lesson.course_id);
    setIsNewLesson(false);
  };

  const saveLesson = async () => {
    if (!editingLesson?.title?.trim()) {
      showFeedback('error', 'Título da aula é obrigatório.');
      return;
    }
    if (!editingLesson?.video_url?.trim()) {
      showFeedback('error', 'URL do vídeo é obrigatório.');
      return;
    }

    setSaving(true);
    const payload = {
      title: editingLesson.title!.trim(),
      description: editingLesson.description?.trim() || null,
      video_url: editingLesson.video_url!.trim(),
      duration_minutes: editingLesson.duration_minutes ?? 0,
      sort_order: editingLesson.sort_order ?? 0,
      is_free: editingLesson.is_free ?? false,
    };

    if (isNewLesson) {
      const { error } = await supabaseAdmin
        .from('lessons')
        .insert({ ...payload, course_id: editingLessonCourseId! });
      if (error) {
        showFeedback('error', `Erro ao criar aula: ${error.message}`);
      } else {
        showFeedback('success', 'Aula criada!');
        setEditingLesson(null);
        setEditingLessonCourseId(null);
      }
    } else {
      const { error } = await supabaseAdmin
        .from('lessons')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingLesson.id);
      if (error) {
        showFeedback('error', `Erro ao salvar aula: ${error.message}`);
      } else {
        showFeedback('success', 'Aula atualizada!');
        setEditingLesson(null);
        setEditingLessonCourseId(null);
      }
    }
    setSaving(false);
    await loadCourses();
  };

  const deleteLesson = async (id: string) => {
    setSaving(true);
    const { error } = await supabaseAdmin.from('lessons').delete().eq('id', id);
    if (error) {
      showFeedback('error', `Erro: ${error.message}`);
    } else {
      showFeedback('success', 'Aula excluída!');
    }
    setConfirmDelete(null);
    setSaving(false);
    await loadCourses();
  };

  const duplicateLesson = async (lesson: Lesson) => {
    setSaving(true);
    const course = courses.find(c => c.id === lesson.course_id);
    const { error } = await supabaseAdmin.from('lessons').insert({
      course_id: lesson.course_id,
      title: `${lesson.title} (cópia)`,
      description: lesson.description,
      video_url: lesson.video_url,
      duration_minutes: lesson.duration_minutes,
      sort_order: (course?.lessons.length ?? 0),
      is_free: lesson.is_free,
    });
    if (error) {
      showFeedback('error', `Erro ao duplicar: ${error.message}`);
    } else {
      showFeedback('success', 'Aula duplicada!');
    }
    setSaving(false);
    await loadCourses();
  };

  // ─── Reorder helpers ─────────────────────────────────────────────

  const moveCourse = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= courses.length) return;
    const a = courses[idx];
    const b = courses[target];
    await Promise.all([
      supabaseAdmin.from('courses').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabaseAdmin.from('courses').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    await loadCourses();
  };

  const moveLesson = async (courseId: string, lessonIdx: number, dir: -1 | 1) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    const target = lessonIdx + dir;
    if (target < 0 || target >= course.lessons.length) return;
    const a = course.lessons[lessonIdx];
    const b = course.lessons[target];
    await Promise.all([
      supabaseAdmin.from('lessons').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabaseAdmin.from('lessons').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    await loadCourses();
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black uppercase tracking-tighter">Gerenciar Conteúdos</h1>
            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
              {courses.length} {courses.length === 1 ? 'curso' : 'cursos'} · {courses.reduce((s, c) => s + c.lessons.length, 0)} aulas
            </p>
          </div>
          <button
            onClick={openNewCourse}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Curso
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 p-3 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {feedback.msg}
              {feedback.type === 'error' && (
                <button onClick={() => setFeedback(null)} className="ml-3 text-red-500 hover:text-red-300">
                  <X className="w-3 h-3 inline" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            placeholder="Buscar cursos ou aulas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500/30 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Carregando cursos...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && courses.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto" />
            <p className="text-gray-500 text-xs font-bold">Nenhum curso criado ainda.</p>
            <button
              onClick={openNewCourse}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
            >
              Criar Primeiro Curso
            </button>
          </div>
        )}

        {/* Course List */}
        {!loading && filteredCourses.map((course, courseIdx) => {
          const isExpanded = expandedCourseId === course.id;
          const thumb = course.thumbnail_url || (course.lessons[0] ? getYouTubeThumbnail(course.lessons[0].video_url) : null);
          const totalDuration = course.lessons.reduce((s, l) => s + l.duration_minutes, 0);

          return (
            <motion.div
              key={course.id}
              layout
              className="mb-4 bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden"
            >
              {/* Course header row */}
              <div className="flex items-center gap-3 p-4">
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveCourse(courseIdx, -1)}
                    disabled={courseIdx === 0}
                    className="p-0.5 text-gray-700 hover:text-gray-400 disabled:opacity-20 transition-all"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => moveCourse(courseIdx, 1)}
                    disabled={courseIdx === courses.length - 1}
                    className="p-0.5 text-gray-700 hover:text-gray-400 disabled:opacity-20 transition-all"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Thumbnail */}
                <div className="w-16 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-gray-700" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-black text-white truncate">{course.title}</h3>
                    {course.is_published ? (
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] font-black text-emerald-400 uppercase shrink-0">
                        Publicado
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-[7px] font-black text-yellow-400 uppercase shrink-0">
                        Rascunho
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[8px] font-bold text-gray-600">{course.category}</span>
                    <span className="text-[8px] font-bold text-gray-700">{course.lessons.length} aulas</span>
                    {totalDuration > 0 && (
                      <span className="text-[8px] font-bold text-gray-700">
                        <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                        {totalDuration}min
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePublish(course)}
                    title={course.is_published ? 'Despublicar' : 'Publicar'}
                    className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {course.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => openEditCourse(course)}
                    title="Editar"
                    className="p-2 rounded-lg text-gray-600 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => duplicateCourse(course)}
                    title="Duplicar"
                    className="p-2 rounded-lg text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'course', id: course.id, name: course.title })}
                    title="Excluir"
                    className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                    className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-sky-500/10 text-sky-400' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded: Lessons */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5 p-4 bg-white/[0.01]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                          Aulas ({course.lessons.length})
                        </h4>
                        <button
                          onClick={() => openNewLesson(course.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-sky-400 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Nova Aula
                        </button>
                      </div>

                      {course.lessons.length === 0 && (
                        <p className="text-center py-6 text-gray-700 text-[10px] font-bold">
                          Nenhuma aula neste curso.
                        </p>
                      )}

                      <div className="space-y-1.5">
                        {course.lessons.map((lesson, lessonIdx) => {
                          const lessonThumb = getYouTubeThumbnail(lesson.video_url);
                          return (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl group"
                            >
                              {/* Reorder */}
                              <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => moveLesson(course.id, lessonIdx, -1)}
                                  disabled={lessonIdx === 0}
                                  className="p-0.5 text-gray-700 hover:text-gray-400 disabled:opacity-20"
                                >
                                  <ChevronUp className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() => moveLesson(course.id, lessonIdx, 1)}
                                  disabled={lessonIdx === course.lessons.length - 1}
                                  className="p-0.5 text-gray-700 hover:text-gray-400 disabled:opacity-20"
                                >
                                  <ChevronDown className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              {/* Lesson number */}
                              <span className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[8px] font-black text-gray-600 shrink-0">
                                {lessonIdx + 1}
                              </span>

                              {/* Thumb */}
                              {lessonThumb && (
                                <div className="w-12 h-8 rounded bg-white/5 overflow-hidden shrink-0">
                                  <img src={lessonThumb} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-white truncate">{lesson.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {lesson.duration_minutes > 0 && (
                                    <span className="text-[8px] font-bold text-gray-700">{lesson.duration_minutes}min</span>
                                  )}
                                  {lesson.is_free && (
                                    <span className="text-[7px] font-black text-emerald-500 uppercase">Grátis</span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => openEditLesson(lesson)}
                                  className="p-1.5 rounded-lg text-gray-600 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => duplicateLesson(lesson)}
                                  className="p-1.5 rounded-lg text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ type: 'lesson', id: lesson.id, name: lesson.title })}
                                  className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Course Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editingCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { if (!saving) setEditingCourse(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-sm font-black uppercase tracking-tighter mb-6">
                {isNewCourse ? 'Novo Curso' : 'Editar Curso'}
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Título *</label>
                  <input
                    type="text"
                    value={editingCourse.title || ''}
                    onChange={e => setEditingCourse(prev => ({ ...prev!, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-sky-500/30 transition-all"
                    placeholder="Ex: Fundamentos do Pré-Flop"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Descrição</label>
                  <textarea
                    value={editingCourse.description || ''}
                    onChange={e => setEditingCourse(prev => ({ ...prev!, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-sky-500/30 transition-all resize-none"
                    placeholder="Breve descrição do curso..."
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setEditingCourse(prev => ({ ...prev!, category: cat }))}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                          editingCourse.category === cat
                            ? 'bg-sky-500/20 border-sky-500/30 text-sky-400'
                            : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thumbnail URL */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">
                    URL da Thumbnail <span className="text-gray-700">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={editingCourse.thumbnail_url || ''}
                    onChange={e => setEditingCourse(prev => ({ ...prev!, thumbnail_url: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-sky-500/30 transition-all"
                    placeholder="https://..."
                  />
                  <p className="text-[8px] text-gray-700 mt-1">Deixe vazio para usar thumbnail automática do YouTube da primeira aula.</p>
                </div>

                {/* Sort order */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Ordem</label>
                  <input
                    type="number"
                    value={editingCourse.sort_order ?? 0}
                    onChange={e => setEditingCourse(prev => ({ ...prev!, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500/30 transition-all"
                  />
                </div>

                {/* Published toggle */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <button
                    onClick={() => setEditingCourse(prev => ({ ...prev!, is_published: !prev!.is_published }))}
                    className={`w-10 h-5 rounded-full transition-all relative ${
                      editingCourse.is_published ? 'bg-emerald-500' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${
                      editingCourse.is_published ? 'left-5.5' : 'left-0.5'
                    }`}
                    style={{ left: editingCourse.is_published ? '22px' : '2px' }}
                    />
                  </button>
                  <div>
                    <p className="text-[10px] font-black text-white">
                      {editingCourse.is_published ? 'Publicado' : 'Rascunho'}
                    </p>
                    <p className="text-[8px] font-bold text-gray-600">
                      {editingCourse.is_published ? 'Visível para todos os alunos' : 'Apenas admins podem ver'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5">
                <button
                  onClick={() => setEditingCourse(null)}
                  disabled={saving}
                  className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCourse}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Lesson Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editingLesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { if (!saving) { setEditingLesson(null); setEditingLessonCourseId(null); } }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-sm font-black uppercase tracking-tighter mb-6">
                {isNewLesson ? 'Nova Aula' : 'Editar Aula'}
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Título *</label>
                  <input
                    type="text"
                    value={editingLesson.title || ''}
                    onChange={e => setEditingLesson(prev => ({ ...prev!, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-sky-500/30 transition-all"
                    placeholder="Ex: Ranges de abertura UTG"
                  />
                </div>

                {/* Video URL */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">URL do Vídeo *</label>
                  <input
                    type="text"
                    value={editingLesson.video_url || ''}
                    onChange={e => setEditingLesson(prev => ({ ...prev!, video_url: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-sky-500/30 transition-all"
                    placeholder="https://youtube.com/watch?v=... ou drive.google.com/..."
                  />
                  {/* Preview */}
                  {editingLesson.video_url && getYouTubeThumbnail(editingLesson.video_url) && (
                    <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden bg-white/5">
                      <img src={getYouTubeThumbnail(editingLesson.video_url)!} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Descrição</label>
                  <textarea
                    value={editingLesson.description || ''}
                    onChange={e => setEditingLesson(prev => ({ ...prev!, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-sky-500/30 transition-all resize-none"
                    placeholder="Descrição da aula..."
                  />
                </div>

                {/* Duration + Order + Free */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Duração (min)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingLesson.duration_minutes ?? 0}
                      onChange={e => setEditingLesson(prev => ({ ...prev!, duration_minutes: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Ordem</label>
                    <input
                      type="number"
                      min={0}
                      value={editingLesson.sort_order ?? 0}
                      onChange={e => setEditingLesson(prev => ({ ...prev!, sort_order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500/30 transition-all"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => setEditingLesson(prev => ({ ...prev!, is_free: !prev!.is_free }))}
                      className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                        editingLesson.is_free
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {editingLesson.is_free ? 'Grátis ✓' : 'Grátis?'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5">
                <button
                  onClick={() => { setEditingLesson(null); setEditingLessonCourseId(null); }}
                  disabled={saving}
                  className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveLesson}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Confirm Delete Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { if (!saving) setConfirmDelete(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a0a0a] border border-red-500/20 rounded-3xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tighter mb-2">Excluir {confirmDelete.type === 'course' ? 'Curso' : 'Aula'}?</h3>
              <p className="text-[10px] font-bold text-gray-500 mb-1">
                <span className="text-white">{confirmDelete.name}</span>
              </p>
              {confirmDelete.type === 'course' && (
                <p className="text-[9px] font-bold text-red-400/60 mb-6">
                  Todas as aulas deste curso também serão excluídas.
                </p>
              )}
              {confirmDelete.type === 'lesson' && <div className="mb-6" />}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={saving}
                  className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.type === 'course') deleteCourse(confirmDelete.id);
                    else deleteLesson(confirmDelete.id);
                  }}
                  disabled={saving}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50"
                >
                  {saving ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminContentManager;
