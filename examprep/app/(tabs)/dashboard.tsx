import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { format, differenceInDays } from 'date-fns';

interface Profile {
  full_name: string;
  email: string;
  streak: number;
  last_login: string;
}

const DEFAULT_PROFILE: Profile = {
  full_name: 'Alex Morgan',
  email: 'student@university.edu',
  streak: 4,
  last_login: new Date().toISOString(),
};

const DEFAULT_STATS = { pdfs: 3, quizzes: 8, exams: 2 };

const DEFAULT_PDFS = [
  { id: 'd1', name: 'Calculus_II_Final_Review.pdf', created_at: new Date(Date.now() - 86400000).toISOString(), size: 2450000 },
  { id: 'd2', name: 'Organic_Chemistry_Synthesis.pdf', created_at: new Date(Date.now() - 172800000).toISOString(), size: 4120000 },
  { id: 'd3', name: 'Macroeconomics_Formulas.pdf', created_at: new Date(Date.now() - 345600000).toISOString(), size: 1840000 },
];

const DEFAULT_EXAMS = [
  { id: 'e1', name: 'Calculus II Final', exam_date: new Date(Date.now() + 86400000 * 3).toISOString() },
  { id: 'e2', name: 'Organic Chemistry Midterm', exam_date: new Date(Date.now() + 86400000 * 12).toISOString() },
];

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [recentPdfs, setRecentPdfs] = useState<any[]>(DEFAULT_PDFS);
  const [upcomingExams, setUpcomingExams] = useState<any[]>(DEFAULT_EXAMS);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    // If demo account or no remote user, keep instant sample data
    if (!user || user.id.includes('demo')) {
      if (user?.user_metadata?.full_name) {
        setProfile(p => ({ ...p, full_name: user.user_metadata.full_name }));
      }
      setRefreshing(false);
      return;
    }

    // For real Supabase users, fetch with a strict 2-second timeout
    const fetchWithTimeout = async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          const lastLogin = new Date(profileData.last_login);
          const today = new Date();
          const diff = differenceInDays(today, lastLogin);

          let newStreak = profileData.streak;
          if (diff === 1) newStreak += 1;
          else if (diff > 1) newStreak = 1;

          if (diff >= 1) {
            await supabase.from('profiles').update({
              streak: newStreak,
              last_login: today.toISOString(),
            }).eq('id', user.id);
            profileData.streak = newStreak;
          }

          setProfile(profileData);
        }

        const [{ count: pdfCount }, { count: quizCount }, { count: examCount }] = await Promise.all([
          supabase.from('pdf_files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('quiz_results').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('exams').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        setStats({ pdfs: pdfCount ?? 0, quizzes: quizCount ?? 0, exams: examCount ?? 0 });

        const { data: pdfs } = await supabase
          .from('pdf_files')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
        if (pdfs && pdfs.length > 0) setRecentPdfs(pdfs);

        const { data: exams } = await supabase
          .from('exams')
          .select('*')
          .eq('user_id', user.id)
          .gte('exam_date', new Date().toISOString())
          .order('exam_date', { ascending: true })
          .limit(3);
        if (exams && exams.length > 0) setUpcomingExams(exams);
      } catch (err) {
        console.warn('Dashboard fetch note:', err);
      }
    };

    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
    await Promise.race([fetchWithTimeout(), timeoutPromise]);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Scholar';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const streak = profile?.streak ?? 1;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateKicker}>{format(new Date(), 'EEEE, MMMM d').toUpperCase()}</Text>
            <Text style={styles.title}>{greeting}, {firstName}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.iconButton} accessibilityLabel="Sign out">
            <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Hero Study Banner */}
        <View style={styles.commandCard}>
          <View style={styles.commandContent}>
            <View style={styles.commandBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.commandBadgeText}>{streak} Day Focus Streak</Text>
            </View>
            <Text style={styles.commandTitle}>Accelerate your exam recall</Text>
            <Text style={styles.commandDesc}>
              Upload syllabus notes or lecture slides. The AI will parse key formulas and test your understanding.
            </Text>
            <View style={styles.commandActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push('/(tabs)/quiz')}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Start Practice Quiz</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => router.push('/(tabs)/storage')}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={14} color={Colors.textPrimary} />
                <Text style={styles.ghostBtnText}>Upload PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Unified Metrics Bar */}
        <View style={styles.metricStrip}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{stats.pdfs}</Text>
            <Text style={styles.metricLbl}>Documents</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{stats.quizzes}</Text>
            <Text style={styles.metricLbl}>Quizzes</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{stats.exams}</Text>
            <Text style={styles.metricLbl}>Exams Tracked</Text>
          </View>
        </View>

        {/* Quick Tools Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tools</Text>
        </View>
        <View style={styles.toolsRow}>
          {[
            { label: 'AI Quiz Studio', icon: 'sparkles-outline' as const, route: '/(tabs)/quiz', desc: 'Auto-generate tests' },
            { label: 'Document Vault', icon: 'folder-outline' as const, route: '/(tabs)/storage', desc: 'Class notes & PDFs' },
            { label: 'Focus Sprint', icon: 'hourglass-outline' as const, route: '/(tabs)/zen', desc: 'Pomodoro timer' },
            { label: 'Study Roadmap', icon: 'calendar-outline' as const, route: '/(tabs)/schedule', desc: 'Exam timeline' },
          ].map((tool) => (
            <TouchableOpacity
              key={tool.label}
              style={styles.toolCard}
              onPress={() => router.push(tool.route as any)}
              activeOpacity={0.75}
            >
              <View style={styles.toolIconWrap}>
                <Ionicons name={tool.icon} size={18} color={Colors.textPrimary} />
              </View>
              <Text style={styles.toolLabel}>{tool.label}</Text>
              <Text style={styles.toolDesc}>{tool.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Study Materials */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Documents</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/storage')}>
            <Text style={styles.seeAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {recentPdfs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No course materials stored yet</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/storage')} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Upload your first PDF</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {recentPdfs.map((pdf, idx) => (
              <View
                key={pdf.id}
                style={[styles.tableRow, idx === recentPdfs.length - 1 && styles.tableRowLast]}
              >
                <View style={styles.fileIconBox}>
                  <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
                </View>
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>{pdf.name}</Text>
                  <Text style={styles.fileDate}>{format(new Date(pdf.created_at), 'MMM d, yyyy')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.rowActionBtn}
                  onPress={() => router.push('/(tabs)/quiz')}
                >
                  <Text style={styles.rowActionText}>Quiz</Text>
                  <Ionicons name="arrow-forward" size={11} color={Colors.brand} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Examinations Timeline */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Examination Calendar</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')}>
            <Text style={styles.seeAll}>Manage</Text>
          </TouchableOpacity>
        </View>
        {upcomingExams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exams scheduled</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Add upcoming exam date</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {upcomingExams.map((exam, idx) => {
              const examDate = new Date(exam.exam_date);
              const daysLeft = differenceInDays(examDate, new Date());
              const isImminent = daysLeft <= 3;

              return (
                <View
                  key={exam.id}
                  style={[styles.tableRow, idx === upcomingExams.length - 1 && styles.tableRowLast]}
                >
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateBlockMonth}>{format(examDate, 'MMM').toUpperCase()}</Text>
                    <Text style={styles.dateBlockDay}>{format(examDate, 'd')}</Text>
                  </View>
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>{exam.name}</Text>
                    <Text style={styles.fileDate}>{format(examDate, 'EEEE')}</Text>
                  </View>
                  <View style={[styles.daysTag, isImminent && styles.daysTagUrgent]}>
                    <Text style={[styles.daysTagText, isImminent && styles.daysTagTextUrgent]}>
                      {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
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
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: 48,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  dateKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Hero Command Card
  commandCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  commandContent: {},
  commandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgSecondary,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  commandBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  commandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  commandDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  commandActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  // Metrics Bar
  metricStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  metricLbl: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  // Tools
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.brand,
  },
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  toolCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    ...Shadows.card,
  },
  toolIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  toolDesc: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  // Table Cards
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
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
  fileIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.xs,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
  rowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    backgroundColor: Colors.brandLight,
  },
  rowActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.brand,
  },
  dateBlock: {
    width: 38,
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.xs,
    paddingVertical: 4,
    marginRight: 10,
  },
  dateBlockMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  dateBlockDay: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  daysTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
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
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  emptyBtn: {
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
});
