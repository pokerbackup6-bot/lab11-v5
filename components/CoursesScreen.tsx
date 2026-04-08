import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Play, Clock, CheckCircle, ChevronLeft, ChevronRight,
  BookOpen, Lock, Search, X, Layers
} from 'lucide-react';
import { supabase } from '../utils/supabase.ts';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  sort_order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_minutes: number;
  sort_order: number;
  is_free: boolean;
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  watched_seconds: number;
}

interface CoursesScreenProps {
  userId: string;
  onBack: () => void;
  onPlayLesson: (lesson: Lesson, course: Course) => void;
}

// Extract YouTube video ID from URL
const getYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};

const getYouTubeThumbnail = (url: string): string | null => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const CoursesScreen: React.FC<CoursesScreenProps> = ({ userId, onBack, onPlayLesson }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Map<string, LessonProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    const [coursesRes, progressRes] = await Promise.all([
      supabase
        .from('courses')
        .select('*, lessons(*)')
        .eq('is_published', true)
        .order('sort_order'),
      supabase
        .from('lesson_progress')
        .select('lesson_id, completed, watched_seconds')
        .eq('user_id', userId),
    ]);

    if (coursesRes.data) {
      const sorted = coursesRes.data.map((c: any) => ({
        ...c,
        lessons: (c.lessons || []).sort((a: Lesson, b: Lesson) => a.sort_order - b.sort_order),
      }));
      setCourses(sorted);
    }

    if (progressRes.data) {
      const map = new Map<string, LessonProgress>();
      progressRes.data.forEach((p: LessonProgress) => map.set(p.lesson_id, p));
      setProgress(map);
    }
    setLoading(false);
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(courses.map(c => c.category))).sort();
    return cats;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let result = courses;
    if (selectedCategory !== 'ALL') {
      result = result.filter(c => c.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.lessons.some(l => l.title.toLowerCase().includes(q))
      );
    }
    return result;
  }, [courses, selectedCategory, searchQuery]);

  // Group by category for Netflix rows
  const coursesByCategory = useMemo(() => {
    const map = new Map<string, Course[]>();
    filteredCourses.forEach(c => {
      const list = map.get(c.category) || [];
      list.push(c);
      map.set(c.category, list);
    });
    return map;
  }, [filteredCourses]);

  // Continue watching
  const continueWatching = useMemo(() => {
    const inProgress: { lesson: Lesson; course: Course; progressPct: number }[] = [];
    courses.forEach(course => {
      course.lessons.forEach(lesson => {
        const p = progress.get(lesson.id);
        if (p && !p.completed && p.watched_seconds > 0) {
          const pct = lesson.duration_minutes > 0
            ? Math.round((p.watched_seconds / (lesson.duration_minutes * 60)) * 100)
            : 0;
          inProgress.push({ lesson, course, progressPct: pct });
        }
      });
    });
    return inProgress.sort((a, b) => b.progressPct - a.progressPct).slice(0, 6);
  }, [courses, progress]);

  const getCourseProgress = (course: Course) => {
    if (course.lessons.length === 0) return 0;
    const completed = course.lessons.filter(l => progress.get(l.id)?.completed).length;
    return Math.round((completed / course.lessons.length) * 100);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Carregando conteúdos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-[#050505] text-white pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 md:p-8 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[13px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            Conteúdos
          </h1>
          <p className="text-[10px] text-gray-600 mt-0.5">Aulas e estratégias do Lab11</p>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="px-6 md:px-8 py-4 border-b border-white/5">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar conteúdos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-600"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-sky-600 text-white'
                  : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white'
                    : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-6 space-y-10">
        {/* Continue Watching */}
        {continueWatching.length > 0 && selectedCategory === 'ALL' && !searchQuery && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 mb-4 flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-sky-500" />
              Continue Assistindo
            </h2>
            <CarouselRow>
              {continueWatching.map(({ lesson, course, progressPct }) => (
                <ContinueCard
                  key={lesson.id}
                  lesson={lesson}
                  course={course}
                  progressPct={progressPct}
                  onClick={() => onPlayLesson(lesson, course)}
                />
              ))}
            </CarouselRow>
          </section>
        )}

        {/* Courses by Category */}
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <BookOpen className="w-12 h-12 text-gray-800" />
            <p className="text-gray-600 text-[11px] font-black uppercase tracking-widest text-center">
              Nenhum conteúdo disponível ainda.<br />
              <span className="text-gray-700 normal-case font-normal tracking-normal text-[10px]">
                Os cursos aparecerão aqui quando forem publicados.
              </span>
            </p>
          </div>
        ) : (
          Array.from(coursesByCategory.entries()).map(([category, categoryCourses]) => (
            <section key={category}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 mb-4 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-500" />
                {category}
              </h2>
              <CarouselRow>
                {categoryCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    progress={getCourseProgress(course)}
                    onPlay={() => {
                      // Find first unwatched lesson, or first lesson
                      const nextLesson = course.lessons.find(l => !progress.get(l.id)?.completed) || course.lessons[0];
                      if (nextLesson) onPlayLesson(nextLesson, course);
                    }}
                  />
                ))}
              </CarouselRow>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

// Carousel Row with scroll buttons
const CarouselRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll);
    return () => { if (el) el.removeEventListener('scroll', checkScroll); };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity -ml-3 hover:bg-black"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity -mr-3 hover:bg-black"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// Course Card
const CourseCard: React.FC<{
  course: Course;
  progress: number;
  onPlay: () => void;
}> = ({ course, progress, onPlay }) => {
  const totalDuration = course.lessons.reduce((acc, l) => acc + l.duration_minutes, 0);
  const thumbnailUrl = course.thumbnail_url
    || (course.lessons[0]?.video_url ? getYouTubeThumbnail(course.lessons[0].video_url) : null);

  return (
    <div
      onClick={onPlay}
      className="group shrink-0 w-[260px] md:w-[300px] bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-sky-500/40 transition-all hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-900/20 to-purple-900/20">
            <BookOpen className="w-10 h-10 text-gray-700" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
            <Play className="w-5 h-5 text-black ml-0.5" />
          </div>
        </div>
        {/* Progress bar */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className={`h-full rounded-r-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-[12px] font-black uppercase leading-tight text-white group-hover:text-sky-400 transition-colors mb-2 line-clamp-2 min-h-[2rem]">
          {course.title}
        </h3>
        <div className="flex items-center gap-3 text-[9px] font-bold text-gray-600">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {course.lessons.length} aula{course.lessons.length !== 1 ? 's' : ''}
          </span>
          {totalDuration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(totalDuration)}
            </span>
          )}
          {progress >= 100 && (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle className="w-3 h-3" />
              Completo
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Continue Watching Card (smaller, horizontal)
const ContinueCard: React.FC<{
  lesson: Lesson;
  course: Course;
  progressPct: number;
  onClick: () => void;
}> = ({ lesson, course, progressPct, onClick }) => {
  const thumbnailUrl = getYouTubeThumbnail(lesson.video_url);

  return (
    <div
      onClick={onClick}
      className="group shrink-0 w-[280px] bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-sky-500/40 transition-all flex"
    >
      {/* Mini thumbnail */}
      <div className="relative w-[120px] shrink-0 bg-black/40 overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={lesson.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-gray-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div className="h-full bg-sky-500 rounded-r-full" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
      <div className="p-3 flex-1 min-w-0">
        <div className="text-[10px] font-black text-white truncate mb-0.5">{lesson.title}</div>
        <div className="text-[8px] font-bold text-gray-600 truncate">{course.title}</div>
        <div className="text-[8px] font-bold text-sky-500 mt-1">{progressPct}% concluído</div>
      </div>
    </div>
  );
};

export default CoursesScreen;
