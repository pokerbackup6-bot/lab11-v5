import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Play, CheckCircle, ChevronDown, ChevronUp,
  Clock, Lock, BookOpen, List
} from 'lucide-react';
import { supabase } from '../utils/supabase.ts';

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

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  sort_order: number;
  lessons: Lesson[];
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  watched_seconds: number;
}

interface LessonPlayerProps {
  lesson: Lesson;
  course: Course;
  userId: string;
  onBack: () => void;
  onSelectLesson: (lesson: Lesson) => void;
}

// Extract YouTube embed URL
const getYouTubeEmbedUrl = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1&autoplay=1` : null;
};

// Google Drive embed URL
const getDriveEmbedUrl = (url: string): string | null => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
};

const getEmbedUrl = (url: string): string | null => {
  return getYouTubeEmbedUrl(url) || getDriveEmbedUrl(url);
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const LessonPlayer: React.FC<LessonPlayerProps> = ({
  lesson,
  course,
  userId,
  onBack,
  onSelectLesson,
}) => {
  const [lessonProgress, setLessonProgress] = useState<Map<string, LessonProgress>>(new Map());
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const embedUrl = getEmbedUrl(lesson.video_url);

  const currentIdx = course.lessons.findIndex(l => l.id === lesson.id);
  const nextLesson = currentIdx < course.lessons.length - 1 ? course.lessons[currentIdx + 1] : null;
  const prevLesson = currentIdx > 0 ? course.lessons[currentIdx - 1] : null;

  const completedCount = useMemo(() => {
    return course.lessons.filter(l => lessonProgress.get(l.id)?.completed).length;
  }, [course.lessons, lessonProgress]);

  useEffect(() => {
    loadProgress();
    return () => {
      saveProgress();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Reset timer on lesson change
  useEffect(() => {
    startTimeRef.current = Date.now();
    setWatchedSeconds(0);

    // Auto-save progress every 30 seconds
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setWatchedSeconds(elapsed);
      saveProgressSilent(elapsed);
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lesson.id]);

  const loadProgress = async () => {
    const { data } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed, watched_seconds')
      .eq('user_id', userId);
    if (data) {
      const map = new Map<string, LessonProgress>();
      data.forEach((p: LessonProgress) => map.set(p.lesson_id, p));
      setLessonProgress(map);
    }
  };

  const saveProgress = async () => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    await saveProgressSilent(elapsed);
  };

  const saveProgressSilent = async (elapsed: number) => {
    const existing = lessonProgress.get(lesson.id);
    const totalWatched = (existing?.watched_seconds || 0) + elapsed;

    await supabase.from('lesson_progress').upsert({
      user_id: userId,
      lesson_id: lesson.id,
      watched_seconds: totalWatched,
      completed: existing?.completed || false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });
  };

  const markCompleted = async () => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const existing = lessonProgress.get(lesson.id);
    const totalWatched = (existing?.watched_seconds || 0) + elapsed;

    await supabase.from('lesson_progress').upsert({
      user_id: userId,
      lesson_id: lesson.id,
      watched_seconds: totalWatched,
      completed: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });

    setLessonProgress(prev => {
      const next = new Map(prev);
      next.set(lesson.id, { lesson_id: lesson.id, completed: true, watched_seconds: totalWatched });
      return next;
    });

    // Auto-advance to next lesson
    if (nextLesson) {
      setTimeout(() => onSelectLesson(nextLesson), 500);
    }
  };

  const isCompleted = lessonProgress.get(lesson.id)?.completed || false;

  return (
    <div className="w-full min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 md:px-8 md:py-5 border-b border-white/5 shrink-0">
        <button
          onClick={() => { saveProgress(); onBack(); }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold text-sky-500 uppercase tracking-widest truncate">{course.title}</div>
          <div className="text-[12px] font-black text-white truncate">{lesson.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-gray-600">
            {currentIdx + 1}/{course.lessons.length}
          </span>
          <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            className={`p-2 rounded-xl border transition-all ${
              showPlaylist
                ? 'bg-sky-500/20 border-sky-500/30 text-sky-400'
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Player */}
        <div className="flex-1 flex flex-col">
          <div className="relative aspect-video bg-black w-full">
            {embedUrl ? (
              <iframe
                key={lesson.id}
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <BookOpen className="w-10 h-10 text-gray-700" />
                <p className="text-gray-600 text-[10px] font-bold">Vídeo não disponível</p>
                <a
                  href={lesson.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-sky-500 transition-all"
                >
                  Abrir Link Externo
                </a>
              </div>
            )}
          </div>

          {/* Lesson Controls */}
          <div className="p-4 md:p-6 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mark as Complete */}
              <button
                onClick={markCompleted}
                disabled={isCompleted}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {isCompleted ? 'Concluída' : 'Marcar como Concluída'}
              </button>

              {/* Navigation */}
              {prevLesson && (
                <button
                  onClick={() => { saveProgress(); onSelectLesson(prevLesson); }}
                  className="px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Anterior
                </button>
              )}
              {nextLesson && (
                <button
                  onClick={() => { saveProgress(); onSelectLesson(nextLesson); }}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                >
                  Próxima Aula
                </button>
              )}

              {/* Progress counter */}
              <span className="ml-auto text-[9px] font-bold text-gray-600">
                {completedCount}/{course.lessons.length} concluídas
              </span>
            </div>

            {/* Description */}
            {lesson.description && (
              <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <p className="text-[11px] font-medium text-gray-400 leading-relaxed">{lesson.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Playlist Sidebar (desktop always, mobile toggle) */}
        <div className={`${
          showPlaylist ? 'block' : 'hidden lg:block'
        } w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0a0a0a] overflow-y-auto`}>
          <div className="p-4 border-b border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
              Playlist — {course.title}
            </h3>
            <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{ width: `${course.lessons.length > 0 ? (completedCount / course.lessons.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="p-2">
            {course.lessons.map((l, idx) => {
              const isCurrent = l.id === lesson.id;
              const completed = lessonProgress.get(l.id)?.completed || false;
              return (
                <button
                  key={l.id}
                  onClick={() => { if (!isCurrent) { saveProgress(); onSelectLesson(l); } }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isCurrent
                      ? 'bg-sky-500/10 border border-sky-500/20'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    completed ? 'bg-emerald-500/20' :
                    isCurrent ? 'bg-sky-500/20' : 'bg-white/5'
                  }`}>
                    {completed ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Play className="w-3 h-3 text-sky-400 ml-0.5" />
                    ) : (
                      <span className="text-[9px] font-black text-gray-600">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-bold truncate ${
                      isCurrent ? 'text-sky-400' : completed ? 'text-gray-400' : 'text-white'
                    }`}>{l.title}</div>
                    {l.duration_minutes > 0 && (
                      <span className="text-[8px] font-bold text-gray-700">{formatDuration(l.duration_minutes)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;
