import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, AppState, AppStateStatus, Linking, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';

export default function ZenScreen() {
  const { user } = useAuth();
  const [zenActive, setZenActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [intention, setIntention] = useState('Exam Revision');
  const appState = useRef(AppState.currentState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [totalZenMinutes, setTotalZenMinutes] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);

  useEffect(() => {
    loadZenStats();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => { subscription.remove(); clearTimer(); };
  }, []);

  useEffect(() => {
    if (zenActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearTimer();
            endZenSession(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimer();
  }, [zenActive]);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (zenActive && appState.current === 'active' && nextState === 'background') {
      appState.current = nextState;
    } else if (appState.current !== 'active' && nextState === 'active' && zenActive) {
      Alert.alert(
        'Focus Preserved',
        'You navigated outside ExamPrep. Return to your study environment to complete your session.',
        [{ text: 'Resume Sprint', style: 'default' }]
      );
    }
    appState.current = nextState;
  };

  const loadZenStats = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('zen_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('created_at', today);
      if (data) {
        setTotalZenMinutes(data.reduce((a, s) => a + (s.duration_minutes || 0), 0));
        setSessionsToday(data.length);
      }
    } catch (err) {
      console.warn('Zen stats fetch note:', err);
    }
  };

  const openScreenTime = async () => {
    try {
      await Linking.openURL('App-prefs:SCREEN_TIME&path=APP_LIMITS');
    } catch {
      try {
        await Linking.openURL('App-prefs:SCREEN_TIME');
      } catch {
        Alert.alert(
          'iOS Screen Time Limits',
          'To restrict distracting apps during deep work:\n\n1. Open Settings on your iPhone\n2. Select Screen Time > App Limits\n3. Tap Add Limit and select Social/Entertainment apps\n4. Set 1-minute limit and enable Screen Time passcode',
          [{ text: 'Got It' }]
        );
      }
    }
  };

  const startZen = () => {
    setTimeLeft(sessionDuration * 60);
    setSessionStart(new Date());
    setZenActive(true);
  };

  const endZenSession = async (completed = false) => {
    clearTimer();
    setZenActive(false);
    const elapsed = sessionStart
      ? Math.round((Date.now() - sessionStart.getTime()) / 60000)
      : sessionDuration;

    if (user && elapsed > 0) {
      try {
        await supabase.from('zen_sessions').insert({
          user_id: user.id,
          duration_minutes: elapsed,
          blocked_apps: [intention],
          completed,
          created_at: new Date().toISOString(),
        });
        loadZenStats();
      } catch (err) {
        console.warn('Save zen session note:', err);
      }
    }

    if (completed) {
      Alert.alert('Session Concluded', `Great work. You sustained ${elapsed} minutes of focused study.`);
    }
    setSessionStart(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const durations = [
    { label: 'Short', mins: 15 },
    { label: 'Pomodoro', mins: 25 },
    { label: 'Deep Work', mins: 50 },
    { label: 'Long Sprint', mins: 90 },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Focus Sprint</Text>
        <Text style={styles.headerSub}>Monitored deep work intervals & distraction control</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Metric Strip */}
        <View style={styles.metricStrip}>
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{totalZenMinutes}m</Text>
            <Text style={styles.metricLbl}>Focus Today</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{sessionsToday}</Text>
            <Text style={styles.metricLbl}>Completed</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{sessionDuration}m</Text>
            <Text style={styles.metricLbl}>Target Sprint</Text>
          </View>
        </View>

        {zenActive ? (
          /* Active Timer View */
          <View style={styles.timerCard}>
            <View style={styles.activePill}>
              <View style={styles.pulseDot} />
              <Text style={styles.activePillText}>Sprint in Progress</Text>
            </View>

            <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerSub}>{intention}</Text>

            <TouchableOpacity style={styles.endButton} onPress={() => endZenSession(false)} activeOpacity={0.8}>
              <Text style={styles.endButtonText}>Conclude Session Early</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Pre-session Setup */
          <>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Session Focus</Text>
              <TextInput
                style={styles.input}
                value={intention}
                onChangeText={setIntention}
                placeholder="e.g. Calculus Chapter 4 Review"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={[styles.cardHeading, { marginTop: 16 }]}>Duration</Text>
              <View style={styles.durationsGrid}>
                {durations.map(d => (
                  <TouchableOpacity
                    key={d.mins}
                    style={[styles.durationChip, sessionDuration === d.mins && styles.durationChipActive]}
                    onPress={() => setSessionDuration(d.mins)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.durationMins, sessionDuration === d.mins && styles.durationMinsActive]}>
                      {d.mins}m
                    </Text>
                    <Text style={[styles.durationLabel, sessionDuration === d.mins && styles.durationLabelActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={startZen} style={styles.startButton} activeOpacity={0.85}>
                <Ionicons name="play" size={14} color="#FFFFFF" />
                <Text style={styles.startButtonText}>Begin {sessionDuration}-Minute Sprint</Text>
              </TouchableOpacity>
            </View>

            {/* iOS Screen Time Helper */}
            <TouchableOpacity onPress={openScreenTime} style={styles.screenTimeCard} activeOpacity={0.8}>
              <View style={styles.screenTimeHeader}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.textPrimary} />
                <Text style={styles.screenTimeTitle}>Enforce via iOS Screen Time</Text>
                <Ionicons name="open-outline" size={14} color={Colors.textTertiary} style={{ marginLeft: 'auto' }} />
              </View>
              <Text style={styles.screenTimeDesc}>
                Open Settings to configure 1-minute limits on social apps while studying.
              </Text>
            </TouchableOpacity>
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
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 110,
  },
  metricStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLbl: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
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
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  durationsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  durationChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.primary,
  },
  durationMins: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  durationMinsActive: {
    color: Colors.primary,
  },
  durationLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  durationLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 11,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Timer View
  timerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.card,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 20,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  timerDisplay: {
    fontSize: 54,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  timerSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 24,
  },
  endButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: '#FEF2F2',
  },
  endButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  // Screen Time
  screenTimeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadows.card,
  },
  screenTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  screenTimeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  screenTimeDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
