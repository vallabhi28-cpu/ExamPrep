import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { generateStudySchedule } from '@/lib/gemini';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { format, parseISO, differenceInDays } from 'date-fns';

interface Exam {
  id?: string;
  name: string;
  date: string; // YYYY-MM-DD
}

interface ScheduleTask {
  subject: string;
  topic: string;
  hours: number;
  type: 'new_content' | 'revision' | 'practice' | 'rest';
  completed?: boolean;
}

interface ScheduleDay {
  date: string;
  day: string;
  tasks: ScheduleTask[];
  totalHours: number;
  tip: string;
}

type TabType = 'exams' | 'schedule';

const taskTypeLabel: Record<string, string> = {
  new_content: 'New Content',
  revision: 'Revision',
  practice: 'Practice Exam',
  rest: 'Rest',
};

const DEFAULT_SCHEDULE_EXAMS: Exam[] = [
  { id: 'e1', name: 'Calculus II Final', date: format(new Date(Date.now() + 86400000 * 3), 'yyyy-MM-dd') },
  { id: 'e2', name: 'Organic Chemistry Midterm', date: format(new Date(Date.now() + 86400000 * 12), 'yyyy-MM-dd') },
];

const DEFAULT_SCHEDULE_DAYS: ScheduleDay[] = [
  {
    date: format(new Date(), 'yyyy-MM-dd'),
    day: format(new Date(), 'EEEE'),
    totalHours: 4,
    tip: 'Active recall using flashcards improves retention by up to 150% compared to passive re-reading.',
    tasks: [
      { subject: 'Calculus II', topic: 'Integration by Parts & Trigonometric Substitution', hours: 2, type: 'revision', completed: false },
      { subject: 'Organic Chemistry', topic: 'Electrophilic Aromatic Substitution Mechanisms', hours: 2, type: 'new_content', completed: false },
    ],
  },
  {
    date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    day: format(new Date(Date.now() + 86400000), 'EEEE'),
    totalHours: 3.5,
    tip: 'Take a 10-minute break between heavy problem sets to let neural pathways consolidate.',
    tasks: [
      { subject: 'Calculus II', topic: 'Practice Exam 1: Timed Section A & B', hours: 2, type: 'practice', completed: false },
      { subject: 'Organic Chemistry', topic: 'Review Synthesis Pathways & Reagent Sheet', hours: 1.5, type: 'revision', completed: false },
    ],
  },
];

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('exams');
  const [exams, setExams] = useState<Exam[]>(DEFAULT_SCHEDULE_EXAMS);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState('4');
  const [schedule, setSchedule] = useState<ScheduleDay[]>(DEFAULT_SCHEDULE_DAYS);
  const [scheduleSummary, setScheduleSummary] = useState('Priority focused on Calculus II integration techniques and Organic Chemistry aromatic reactions ahead of the 3-day deadline.');
  const [generating, setGenerating] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);

  const loadExams = useCallback(async () => {
    if (!user || user.id.includes('demo')) {
      setLoadingExams(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id)
        .gte('exam_date', new Date().toISOString().split('T')[0])
        .order('exam_date', { ascending: true });
      if (data && data.length > 0) {
        setExams(data.map(e => ({ id: e.id, name: e.name, date: e.exam_date })));
      }
    } catch (err) {
      console.warn('Exams fetch note:', err);
    } finally {
      setLoadingExams(false);
    }
  }, [user]);

  const loadSchedule = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data?.schedule_data) {
        const parsed = JSON.parse(data.schedule_data);
        setSchedule(parsed.schedule ?? []);
        setScheduleSummary(parsed.summary ?? '');
      }
    } catch (err) {
      console.warn('Schedule fetch note:', err);
    }
  }, [user]);

  useEffect(() => {
    loadExams();
    loadSchedule();
  }, [loadExams, loadSchedule]);

  const addExam = async () => {
    if (!newExamName.trim()) { Alert.alert('Field Required', 'Enter subject or course name.'); return; }
    if (!newExamDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Format Required', 'Enter date formatted as YYYY-MM-DD (e.g. 2026-12-15).');
      return;
    }

    try {
      const { data, error } = await supabase.from('exams').insert({
        user_id: user?.id || 'demo',
        name: newExamName.trim(),
        exam_date: newExamDate,
        created_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;
      setExams(prev => [...prev, { id: data.id, name: data.name, date: data.exam_date }]);
      setNewExamName('');
      setNewExamDate('');
    } catch (err: any) {
      Alert.alert('Save Note', err.message || 'Exam added.');
      setExams(prev => [...prev, { id: Date.now().toString(), name: newExamName.trim(), date: newExamDate }]);
      setNewExamName('');
      setNewExamDate('');
    }
  };

  const deleteExam = async (id: string) => {
    try {
      await supabase.from('exams').delete().eq('id', id);
    } catch (err) {
      console.warn('Delete note:', err);
    }
    setExams(prev => prev.filter(e => e.id !== id));
  };

  const generateSchedule = async () => {
    if (exams.length === 0) { Alert.alert('No Exams Added', 'Please add at least one exam first.'); return; }
    setGenerating(true);
    try {
      const result = await generateStudySchedule(
        exams.map(e => ({ name: e.name, date: e.date })),
        parseInt(hoursPerDay) || 4
      );
      setSchedule(result.schedule ?? []);
      setScheduleSummary(result.summary ?? '');

      await supabase.from('schedules').upsert({
        user_id: user?.id || 'demo',
        schedule_data: JSON.stringify(result),
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      setTab('schedule');
    } catch (err: any) {
      Alert.alert('Planner Note', err.message || 'Check Gemini key in environment.');
    }
    setGenerating(false);
  };

  const toggleTask = (dayIdx: number, taskIdx: number) => {
    setSchedule(prev => {
      const clone = [...prev];
      const targetDay = { ...clone[dayIdx] };
      const tasks = [...targetDay.tasks];
      tasks[taskIdx] = { ...tasks[taskIdx], completed: !tasks[taskIdx].completed };
      targetDay.tasks = tasks;
      clone[dayIdx] = targetDay;
      return clone;
    });
  };

  const getDaysLeft = (date: string) => differenceInDays(parseISO(date), new Date());

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Study Roadmap</Text>
        <Text style={styles.headerSub}>Examination milestones & daily revision plan</Text>

        {/* Minimal Segmented Switch */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'exams' && styles.segmentBtnActive]}
            onPress={() => setTab('exams')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, tab === 'exams' && styles.segmentBtnTextActive]}>
              Exam Dates ({exams.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'schedule' && styles.segmentBtnActive]}
            onPress={() => setTab('schedule')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, tab === 'schedule' && styles.segmentBtnTextActive]}>
              Daily Plan {schedule.length > 0 ? `(${schedule.length}d)` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'exams' ? (
          <>
            {/* Add Exam Form */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Add Examination</Text>

              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={newExamName}
                  onChangeText={setNewExamName}
                  placeholder="Subject / Course"
                  placeholderTextColor={Colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, { flex: 1.4 }]}
                  value={newExamDate}
                  onChangeText={setNewExamDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity onPress={addExam} style={styles.addBtn} activeOpacity={0.85}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Registered Exams List */}
            {loadingExams ? (
              <ActivityIndicator color={Colors.primary} size="small" style={{ marginVertical: 20 }} />
            ) : exams.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No examinations registered yet.</Text>
                <Text style={styles.emptySub}>Add course dates above to generate an automated daily study roadmap.</Text>
              </View>
            ) : (
              <View style={styles.tableCard}>
                {exams.map((exam, idx) => {
                  const daysLeft = getDaysLeft(exam.date);
                  const isImminent = daysLeft <= 3;
                  return (
                    <View
                      key={exam.id}
                      style={[styles.tableRow, idx === exams.length - 1 && styles.tableRowLast]}
                    >
                      <View style={styles.dateBlock}>
                        <Text style={styles.dateBlockMonth}>
                          {format(parseISO(exam.date), 'MMM').toUpperCase()}
                        </Text>
                        <Text style={styles.dateBlockDay}>
                          {format(parseISO(exam.date), 'd')}
                        </Text>
                      </View>
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName}>{exam.name}</Text>
                        <Text style={styles.fileDate}>{format(parseISO(exam.date), 'EEEE, MMMM d, yyyy')}</Text>
                      </View>
                      <View style={[styles.daysTag, isImminent && styles.daysTagUrgent]}>
                        <Text style={[styles.daysTagText, isImminent && styles.daysTagTextUrgent]}>
                          {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => deleteExam(exam.id!)}
                        style={styles.deleteIcon}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={15} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* AI Generator CTA */}
            {exams.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardHeading}>Compile AI Study Itinerary</Text>
                <Text style={styles.cardSub}>
                  Distributes syllabus topics, practice assessments, and rest cycles based on available hours.
                </Text>

                <View style={styles.hoursRow}>
                  <Text style={styles.hoursLabel}>Available hours per day:</Text>
                  <TextInput
                    style={styles.hoursInput}
                    value={hoursPerDay}
                    onChangeText={setHoursPerDay}
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                <TouchableOpacity
                  onPress={generateSchedule}
                  disabled={generating}
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                >
                  {generating ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Generate Study Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          /* Schedule Tab */
          <>
            {schedule.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No study schedule compiled yet.</Text>
                <TouchableOpacity onPress={() => setTab('exams')} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>Switch to Exam Dates to Generate</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {scheduleSummary ? (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>AI Strategy Summary</Text>
                    <Text style={styles.summaryBody}>{scheduleSummary}</Text>
                  </View>
                ) : null}

                <View style={styles.daysList}>
                  {schedule.slice(0, 30).map((day, dIdx) => {
                    const isToday = day.date === new Date().toISOString().split('T')[0];
                    return (
                      <View key={dIdx} style={[styles.dayCard, isToday && styles.dayCardToday]}>
                        <View style={styles.dayHeader}>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.dayDateTitle}>{format(parseISO(day.date), 'EEEE, MMM d')}</Text>
                              {isToday && (
                                <View style={styles.todayPill}>
                                  <Text style={styles.todayPillText}>Today</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.daySub}>{day.day} • {day.totalHours} hours planned</Text>
                          </View>
                        </View>

                        <View style={styles.tasksContainer}>
                          {day.tasks.map((task, tIdx) => (
                            <TouchableOpacity
                              key={tIdx}
                              style={styles.taskRow}
                              onPress={() => toggleTask(dIdx, tIdx)}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.checkbox, task.completed && styles.checkboxActive]}>
                                {task.completed && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                              </View>
                              <View style={styles.taskDetails}>
                                <Text style={[styles.taskSubject, task.completed && styles.taskCompleted]}>
                                  {task.subject}
                                </Text>
                                <Text style={[styles.taskTopic, task.completed && styles.taskCompleted]}>
                                  {task.topic}
                                </Text>
                              </View>
                              <View style={styles.taskMeta}>
                                <Text style={styles.taskHours}>{task.hours}h</Text>
                                <Text style={styles.taskTypeTag}>{taskTypeLabel[task.type] ?? task.type}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {day.tip ? (
                          <View style={styles.tipRow}>
                            <Text style={styles.tipText}>Tip: {day.tip}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingTop: 48,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.card,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 110,
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  hoursLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  hoursInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    color: Colors.textPrimary,
    width: 60,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 11,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Table
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  dateBlock: {
    width: 36,
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.xs,
    paddingVertical: 3,
    marginRight: 10,
  },
  dateBlockMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  dateBlockDay: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fileDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  daysTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
    marginRight: 8,
  },
  daysTagUrgent: {
    backgroundColor: '#FEF2F2',
  },
  daysTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  daysTagTextUrgent: {
    color: Colors.error,
  },
  deleteIcon: {
    padding: 2,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSecondary,
  },
  emptyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  // Summary
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  daysList: {
    gap: 10,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadows.card,
  },
  dayCardToday: {
    borderColor: Colors.primary,
  },
  dayHeader: {
    marginBottom: 10,
  },
  dayDateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  todayPill: {
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  todayPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
  daySub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tasksContainer: {
    gap: 6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  taskDetails: {
    flex: 1,
  },
  taskSubject: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  taskTopic: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskMeta: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  taskHours: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  taskTypeTag: {
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  tipRow: {
    marginTop: 8,
    paddingTop: 6,
  },
  tipText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
