import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors } from '../../src/constants/colors';
import { todayDateString, dateStringForDaysFromNow, formatTime, formatDurationSeconds, formatElapsedMs } from '../../src/utils/dateUtils';
import { ResolvedDayAlarm, ResolvedDayTimer, ResolvedDayStopwatch } from '../../src/types';

export default function TodayScreen() {
  const router = useRouter();
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const settings = useAppStore((s) => s.settings);
  const getResolvedDay = useAppStore((s) => s.getResolvedDay);
  const updatePreset = useAppStore((s) => s.updatePreset);
  const activeTimers = useAppStore((s) => s.activeTimers);
  const activeStopwatches = useAppStore((s) => s.activeStopwatches);
  const completedTimers = useAppStore((s) => s.completedTimers);
  const startTimer = useAppStore((s) => s.startTimer);
  const pauseTimer = useAppStore((s) => s.pauseTimer);
  const resumeTimer = useAppStore((s) => s.resumeTimer);
  const resetTimer = useAppStore((s) => s.resetTimer);
  const markTimerDone = useAppStore((s) => s.markTimerDone);
  const startStopwatch = useAppStore((s) => s.startStopwatch);
  const pauseStopwatch = useAppStore((s) => s.pauseStopwatch);
  const resumeStopwatch = useAppStore((s) => s.resumeStopwatch);
  const resetStopwatch = useAppStore((s) => s.resetStopwatch);
  const lapStopwatch = useAppStore((s) => s.lapStopwatch);

  const today = todayDateString();
  const tomorrow = dateStringForDaysFromNow(1);
  const resolved = getResolvedDay(today);
  const tomorrowResolved = getResolvedDay(tomorrow);
  const tomorrowPresetName = tomorrowResolved.preset?.name ?? 'No preset';

  // Tick every second for timers/stopwatches
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  }, []);

  function toggleAlarm(alarm: ResolvedDayAlarm) {
    if (!resolved.preset) return;
    const updatedAlarms = resolved.preset.alarms.map((a) =>
      a.id === alarm.id ? { ...a, enabled: !a.enabled } : a
    );
    updatePreset(resolved.preset.id, { alarms: updatedAlarms });
  }

  function getTimerRemaining(timer: ResolvedDayTimer): number {
    const active = activeTimers[timer.id];
    if (!active) return timer.durationSeconds * 1000;
    if (!active.running && active.pausedRemainingMs != null) return active.pausedRemainingMs;
    const elapsed = now - active.startTimestamp;
    return Math.max(0, timer.durationSeconds * 1000 - elapsed);
  }

  function getStopwatchElapsed(sw: ResolvedDayStopwatch): number {
    const active = activeStopwatches[sw.id];
    if (!active) return 0;
    if (!active.running) return active.pausedElapsedMs ?? 0;
    return (active.pausedElapsedMs ?? 0) + (now - active.startTimestamp);
  }

  function sourceBadge(layer: 'preset' | 'customization' | 'rule' | 'ephemeral') {
    if (layer === 'customization') return <Ionicons name="create-outline" size={14} color={Colors.info} />;
    if (layer === 'rule' || layer === 'ephemeral') return <Ionicons name="flash-outline" size={14} color={Colors.warning} />;
    return null;
  }

  const use12h = settings.timeFormat === '12h';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text style={styles.headerTitle}>Today</Text>
        </View>

        {/* Active Preset Card */}
        {resolved.preset ? (
          <View style={[styles.presetCard, { borderLeftColor: resolved.preset.color }]}>
            <View style={styles.presetCardRow}>
              <View>
                <Text style={styles.presetCardLabel}>Active Preset</Text>
                <Text style={styles.presetCardName}>{resolved.preset.name}</Text>
                <View style={styles.presetCardBadges}>
                  {resolved.isOverridden && (
                    <View style={styles.overrideBadge}><Text style={styles.overrideBadgeText}>Override</Text></View>
                  )}
                  {resolved.isCustomized && (
                    <View style={styles.customBadge}><Text style={styles.customBadgeText}>Customized</Text></View>
                  )}
                </View>
              </View>
              <View style={[styles.presetIconBox, { backgroundColor: resolved.preset.color + '33' }]}>
                <Ionicons name={resolved.preset.icon as any} size={28} color={resolved.preset.color} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noPresetCard}>
            <Text style={styles.noPresetText}>No preset assigned for today</Text>
            <TouchableOpacity style={styles.assignBtn} onPress={() => router.push('/override')}>
              <Text style={styles.assignBtnText}>Assign a Preset →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/override')}>
            <Ionicons name="swap-horizontal-outline" size={14} color={Colors.text} />
            <Text style={styles.quickBtnText}> Switch Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtnSecondary} onPress={() => router.push('/customize')}>
            <Ionicons name="create-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.quickBtnSecondaryText}> Customize</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtnSecondary} onPress={() => router.push({ pathname: '/override', params: { date: tomorrow } })}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.quickBtnSecondaryText}> Tomorrow: {tomorrowPresetName}</Text>
          </TouchableOpacity>
        </View>

        {/* Alarms Section */}
        {resolved.alarms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alarms</Text>
            {resolved.alarms.map((alarm) => (
              <View key={alarm.id} style={styles.alarmRow}>
                <View style={styles.alarmLeft}>
                  {sourceBadge(alarm.sourceLayer)}
                  <View>
                    <Text style={styles.alarmTime}>{formatTime(alarm.time, use12h)}</Text>
                    {alarm.label ? <Text style={styles.alarmLabel}>{alarm.label}</Text> : null}
                  </View>
                </View>
                <Switch
                  value={alarm.enabled}
                  onValueChange={() => toggleAlarm(alarm)}
                  trackColor={{ false: Colors.alarmOff, true: Colors.alarmOn }}
                  thumbColor={Colors.text}
                  disabled={alarm.sourceLayer === 'rule'}
                />
              </View>
            ))}
          </View>
        )}

        {/* Timers Section */}
        {resolved.timers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timers</Text>
            {resolved.timers.map((timer) => {
              const active = activeTimers[timer.id];
              const remaining = getTimerRemaining(timer);
              const isRunning = active?.running ?? false;
              const isManualDone = !!completedTimers[timer.id];
              const isDone = isManualDone || (active && remaining === 0);
              return (
                <View key={timer.id} style={styles.timerRow}>
                  <View style={styles.timerLeft}>
                    {sourceBadge(timer.sourceLayer)}
                    <View>
                      <Text style={styles.timerLabel}>{timer.label}</Text>
                      <Text style={[styles.timerRemaining, isDone && styles.timerDone]}>
                        {isDone ? 'Done!' : formatElapsedMs(remaining)}
                      </Text>
                      <Text style={styles.timerTotal}>{formatDurationSeconds(timer.durationSeconds)}</Text>
                    </View>
                  </View>
                  <View style={styles.timerActions}>
                    {!active && !isManualDone && (
                      <>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => startTimer(timer.id)}>
                          <Ionicons name="play" size={12} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]} onPress={() => markTimerDone(timer.id)}>
                          <Ionicons name="checkmark" size={12} color={Colors.text} />
                        </TouchableOpacity>
                      </>
                    )}
                    {active && isRunning && (
                      <>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWarning]} onPress={() => pauseTimer(timer.id)}>
                          <Ionicons name="pause" size={12} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]} onPress={() => markTimerDone(timer.id)}>
                          <Ionicons name="checkmark" size={12} color={Colors.text} />
                        </TouchableOpacity>
                      </>
                    )}
                    {active && !isRunning && !isDone && (
                      <>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => resumeTimer(timer.id)}>
                          <Ionicons name="play" size={12} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]} onPress={() => markTimerDone(timer.id)}>
                          <Ionicons name="checkmark" size={12} color={Colors.text} />
                        </TouchableOpacity>
                      </>
                    )}
                    {active && (
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => resetTimer(timer.id)}>
                        <Ionicons name="refresh" size={12} color={Colors.text} />
                      </TouchableOpacity>
                    )}
                    {isManualDone && !active && (
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => resetTimer(timer.id)}>
                        <Ionicons name="refresh" size={12} color={Colors.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Stopwatches Section */}
        {resolved.stopwatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stopwatches</Text>
            {resolved.stopwatches.map((sw) => {
              const active = activeStopwatches[sw.id];
              const elapsed = getStopwatchElapsed(sw);
              const isRunning = active?.running ?? false;
              return (
                <View key={sw.id} style={styles.timerRow}>
                  <View style={styles.timerLeft}>
                    {sourceBadge(sw.sourceLayer)}
                    <View>
                      <Text style={styles.timerLabel}>{sw.label}</Text>
                      <Text style={styles.timerRemaining}>{formatElapsedMs(elapsed)}</Text>
                      {active && active.laps.length > 0 && (
                        <Text style={styles.lapCount}>{active.laps.length} lap{active.laps.length > 1 ? 's' : ''}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.timerActions}>
                    {!active && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => startStopwatch(sw.id)}>
                        <Ionicons name="play" size={12} color={Colors.text} />
                      </TouchableOpacity>
                    )}
                    {active && isRunning && (
                      <>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnInfo]} onPress={() => lapStopwatch(sw.id)}>
                          <Ionicons name="flag-outline" size={12} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWarning]} onPress={() => pauseStopwatch(sw.id)}>
                          <Ionicons name="pause" size={12} color={Colors.text} />
                        </TouchableOpacity>
                      </>
                    )}
                    {active && !isRunning && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => resumeStopwatch(sw.id)}>
                        <Ionicons name="play" size={12} color={Colors.text} />
                      </TouchableOpacity>
                    )}
                    {active && (
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => resetStopwatch(sw.id)}>
                        <Ionicons name="refresh" size={12} color={Colors.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {resolved.preset && resolved.alarms.length === 0 && resolved.timers.length === 0 && resolved.stopwatches.length === 0 && (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>This preset has no alarms, timers, or stopwatches.</Text>
            <TouchableOpacity onPress={() => router.push(`/preset/${resolved.preset!.id}`)}>
              <Text style={styles.emptyLink}>Edit preset →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { paddingTop: 16, paddingBottom: 8 },
  dateText: { fontSize: 13, color: Colors.textMuted, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  presetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
  },
  presetCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetCardLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  presetCardName: { fontSize: 20, fontWeight: '700', color: Colors.text },
  presetCardBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  presetIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  overrideBadge: { backgroundColor: Colors.warning + '33', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  overrideBadgeText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  customBadge: { backgroundColor: Colors.info + '33', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  customBadgeText: { fontSize: 11, color: Colors.info, fontWeight: '600' },
  noPresetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  noPresetText: { color: Colors.textSecondary, fontSize: 15, marginBottom: 12 },
  assignBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  assignBtnText: { color: Colors.text, fontWeight: '600' },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: '45%',
  },
  quickBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  quickBtnSecondary: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: '45%',
  },
  quickBtnSecondaryText: { color: Colors.textSecondary, fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  alarmLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alarmTime: { fontSize: 22, fontWeight: '700', color: Colors.text },
  alarmLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  badgeCustom: { fontSize: 14 },
  badgeRule: { fontSize: 14 },
  timerRow: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  timerLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  timerRemaining: { fontSize: 22, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  timerDone: { color: Colors.success },
  timerTotal: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  lapCount: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  timerActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  actionBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnWarning: { backgroundColor: Colors.warning },
  actionBtnDanger: { backgroundColor: Colors.error },
  actionBtnInfo: { backgroundColor: Colors.info },
  actionBtnSuccess: { backgroundColor: Colors.success },
  actionBtnSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  emptySection: { marginTop: 32, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptyLink: { color: Colors.primary, marginTop: 8, fontSize: 14 },
});
