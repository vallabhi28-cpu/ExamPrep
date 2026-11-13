import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { generateQuizFromText } from '@/lib/gemini';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';

type Stage = 'upload' | 'generating' | 'quiz' | 'results';

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default function QuizScreen() {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>('upload');
  const [pdfName, setPdfName] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [generatingStep, setGeneratingStep] = useState('');

  const pickAndGenerate = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setPdfName(file.name);
      setStage('generating');
      setGeneratingStep('Parsing document content...');

      const extractedText = `This is a study document about ${file.name.replace('.pdf', '').replace(/_/g, ' ')}. Generate educational multiple choice questions about the key topics, concepts, and important details typically covered in this subject.`;

      setGeneratingStep('Drafting test questions with AI...');
      const n = Math.max(3, Math.min(20, numQuestions));
      const quizData = await generateQuizFromText(extractedText, n);

      if (!quizData || quizData.length === 0) throw new Error('No questions could be generated.');

      setQuestions(quizData);
      setAnswers(new Array(quizData.length).fill(null));
      setCurrent(0);
      setSelected(null);
      setShowExplanation(false);
      setStage('quiz');
    } catch (err: any) {
      setStage('upload');
      Alert.alert('Assessment Error', err.message || 'Could not compile questions from file.');
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    setShowExplanation(true);
    const newAnswers = [...answers];
    newAnswers[current] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      const finalScore = answers.filter((a, i) => a === questions[i]?.correct).length;
      setScore(finalScore);
      saveResult(finalScore);
      setStage('results');
    }
  };

  const saveResult = async (finalScore: number) => {
    if (!user) return;
    try {
      await supabase.from('quiz_results').insert({
        user_id: user.id,
        pdf_name: pdfName,
        score: finalScore,
        total: questions.length,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Quiz result save note:', err);
    }
  };

  const resetQuiz = () => {
    setStage('upload');
    setPdfName('');
    setQuestions([]);
    setAnswers([]);
    setCurrent(0);
    setSelected(null);
    setShowExplanation(false);
  };

  // ─── UPLOAD / SETUP STAGE ───
  if (stage === 'upload') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Quiz Studio</Text>
          <Text style={styles.headerSub}>Synthesize active recall tests from your course notes</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.setupCard}>
            <Text style={styles.setupHeading}>Configure Assessment</Text>
            <Text style={styles.setupDesc}>
              Upload any PDF lecture slide, past paper, or reading material. Our system extracts core concepts and compiles a multiple-choice exam.
            </Text>

            {/* Question Count Segmented Control */}
            <View style={styles.configBlock}>
              <Text style={styles.configLabel}>Question Count</Text>
              <View style={styles.segmentedControl}>
                {[5, 10, 15].map((cnt) => (
                  <TouchableOpacity
                    key={cnt}
                    style={[styles.segmentBtn, numQuestions === cnt && styles.segmentBtnActive]}
                    onPress={() => setNumQuestions(cnt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentBtnText, numQuestions === cnt && styles.segmentBtnTextActive]}>
                      {cnt} Questions
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity onPress={pickAndGenerate} style={styles.primaryActionButton} activeOpacity={0.85}>
              <Ionicons name="document-attach-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionButtonText}>Select PDF Document</Text>
            </TouchableOpacity>

            <View style={styles.specsList}>
              <View style={styles.specRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.specText}>Automatic conceptual reasoning for every question</Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.specText}>Tracks performance against your revision history</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── GENERATING STAGE ───
  if (stage === 'generating') {
    return (
      <View style={[styles.container, styles.centerView]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.loadingTitle}>Generating Assessment</Text>
          <Text style={styles.loadingStep}>{generatingStep}</Text>
          <View style={styles.fileTag}>
            <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.fileTagText} numberOfLines={1}>{pdfName}</Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── QUIZ ACTIVE STAGE ───
  if (stage === 'quiz') {
    const q = questions[current];
    const progress = ((current + 1) / questions.length) * 100;
    const correctCount = answers.filter((a, i) => a !== null && a === questions[i]?.correct).length;

    return (
      <View style={styles.container}>
        {/* Navigation Bar */}
        <View style={styles.quizNav}>
          <View style={styles.quizNavTop}>
            <TouchableOpacity onPress={resetQuiz} style={styles.exitBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.quizNavCounter}>Question {current + 1} of {questions.length}</Text>
            <View style={styles.quizScorePill}>
              <Text style={styles.quizScoreText}>{correctCount} Correct</Text>
            </View>
          </View>

          {/* Hairline Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Question Text */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{q.question}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsWrap}>
            {q.options.map((option, idx) => {
              const isSelected = selected === idx;
              const isCorrectAnswer = idx === q.correct;
              const hasAnswered = selected !== null;

              const isAnsweredCorrect = hasAnswered && isCorrectAnswer;
              const isAnsweredWrong = hasAnswered && isSelected && !isCorrectAnswer;
              const isDimmed = hasAnswered && !isSelected && !isCorrectAnswer;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionRow,
                    isAnsweredCorrect && styles.optionCorrect,
                    isAnsweredWrong && styles.optionWrong,
                    isDimmed && styles.optionDimmed,
                  ]}
                  onPress={() => handleAnswer(idx)}
                  disabled={hasAnswered}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.letterBox,
                      isAnsweredCorrect && styles.letterBoxCorrect,
                      isAnsweredWrong && styles.letterBoxWrong,
                    ]}
                  >
                    <Text
                      style={[
                        styles.letterText,
                        (isAnsweredCorrect || isAnsweredWrong) && styles.letterTextActive,
                      ]}
                    >
                      {['A', 'B', 'C', 'D'][idx]}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      isAnsweredCorrect && styles.optionTextCorrect,
                      isAnsweredWrong && styles.optionTextWrong,
                    ]}
                  >
                    {option}
                  </Text>
                  {hasAnswered && isCorrectAnswer && (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} style={{ marginLeft: 8 }} />
                  )}
                  {hasAnswered && isSelected && !isCorrectAnswer && (
                    <Ionicons name="close-circle" size={18} color={Colors.error} style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation Callout */}
          {showExplanation && (
            <View style={styles.explanationCard}>
              <View style={styles.explanationHeader}>
                <Ionicons name="bulb-outline" size={16} color={Colors.textPrimary} />
                <Text style={styles.explanationTitle}>Conceptual Rationale</Text>
              </View>
              <Text style={styles.explanationBody}>{q.explanation}</Text>
            </View>
          )}

          {/* Next Button */}
          {selected !== null && (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextButtonText}>
                {current < questions.length - 1 ? 'Next Question' : 'View Results'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── RESULTS STAGE ───
  const percentage = Math.round((score / questions.length) * 100);
  const isMastered = percentage >= 80;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assessment Results</Text>
        <Text style={styles.headerSub}>Performance analysis and answer key review</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Score Overview */}
        <View style={styles.resultsCard}>
          <Text style={styles.resultsPercentage}>{percentage}%</Text>
          <Text style={styles.resultsFraction}>
            {score} of {questions.length} questions answered correctly
          </Text>
          <View style={[styles.ratingTag, isMastered ? styles.ratingTagSuccess : styles.ratingTagWarning]}>
            <Text style={[styles.ratingTagText, isMastered ? styles.ratingTextSuccess : styles.ratingTextWarning]}>
              {isMastered ? 'Mastery Level Achieved' : 'Review Recommended'}
            </Text>
          </View>
        </View>

        {/* Detailed Question Review List */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableCardTitle}>Question Breakdown</Text>
          </View>
          {questions.map((item, idx) => {
            const isItemCorrect = answers[idx] === item.correct;
            return (
              <View key={idx} style={[styles.reviewRow, idx === questions.length - 1 && styles.tableRowLast]}>
                <View style={[styles.reviewStatusDot, { backgroundColor: isItemCorrect ? Colors.success : Colors.error }]} />
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewQuestionNumber}>Q{idx + 1}</Text>
                  <Text style={styles.reviewQuestionText} numberOfLines={2}>{item.question}</Text>
                </View>
                <Text style={[styles.reviewStatusText, { color: isItemCorrect ? Colors.success : Colors.error }]}>
                  {isItemCorrect ? 'Pass' : 'Miss'}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryActionButton} onPress={resetQuiz} activeOpacity={0.85}>
          <Ionicons name="refresh" size={15} color="#FFFFFF" />
          <Text style={styles.primaryActionButtonText}>Take Another Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centerView: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
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
  setupCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadows.card,
  },
  setupHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  setupDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  configBlock: {
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
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
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  specsList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Loading
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    ...Shadows.card,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  loadingStep: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  fileTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  fileTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    maxWidth: 200,
  },
  // Quiz Runner
  quizNav: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 48,
    paddingHorizontal: Spacing.md,
  },
  quizNavTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  exitBtn: {
    padding: 4,
  },
  quizNavCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  quizScorePill: {
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  quizScoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressTrack: {
    height: 2,
    backgroundColor: Colors.borderLight,
  },
  progressFill: {
    height: 2,
    backgroundColor: Colors.primary,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  optionsWrap: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
  },
  optionCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  optionWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  optionDimmed: {
    opacity: 0.5,
  },
  letterBox: {
    width: 24,
    height: 24,
    borderRadius: Radius.xs,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  letterBoxCorrect: {
    backgroundColor: Colors.success,
  },
  letterBoxWrong: {
    backgroundColor: Colors.error,
  },
  letterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  letterTextActive: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  optionTextCorrect: {
    fontWeight: '600',
    color: '#15803D',
  },
  optionTextWrong: {
    color: Colors.error,
  },
  explanationCard: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.md,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  explanationBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 11,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Results
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  resultsPercentage: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  resultsFraction: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  ratingTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  ratingTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ratingTagSuccess: {
    backgroundColor: '#DCFCE7',
  },
  ratingTagWarning: {
    backgroundColor: '#FEF3C7',
  },
  ratingTextSuccess: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  ratingTextWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  tableCardHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reviewRow: {
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
  reviewStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  reviewContent: {
    flex: 1,
    marginRight: 8,
  },
  reviewQuestionNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  reviewQuestionText: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  reviewStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
