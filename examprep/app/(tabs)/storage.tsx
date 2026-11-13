import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { format } from 'date-fns';

const DEFAULT_VAULT_PDFS = [
  { id: 'd1', name: 'Calculus_II_Final_Review.pdf', created_at: new Date(Date.now() - 86400000).toISOString(), size: 2450000, storage_path: 'demo/1', url: '#' },
  { id: 'd2', name: 'Organic_Chemistry_Synthesis.pdf', created_at: new Date(Date.now() - 172800000).toISOString(), size: 4120000, storage_path: 'demo/2', url: '#' },
  { id: 'd3', name: 'Macroeconomics_Formulas.pdf', created_at: new Date(Date.now() - 345600000).toISOString(), size: 1840000, storage_path: 'demo/3', url: '#' },
];

export default function StorageScreen() {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState<any[]>(DEFAULT_VAULT_PDFS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPdfs = useCallback(async () => {
    if (!user || user.id.includes('demo')) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('pdf_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setPdfs(data);
      }
    } catch (err) {
      console.warn('PDF fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadPdfs(); }, [loadPdfs]);

  const uploadPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setUploading(true);

      const response = await fetch(file.uri);
      const blob = await response.blob();

      const fileName = `${user?.id || 'demo'}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, blob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(fileName);

      await supabase.from('pdf_files').insert({
        user_id: user?.id || 'demo',
        name: file.name,
        storage_path: fileName,
        url: urlData.publicUrl,
        size: file.size ?? 0,
        created_at: new Date().toISOString(),
      });

      setUploading(false);
      loadPdfs();
    } catch (err: any) {
      setUploading(false);
      Alert.alert('Upload Status', err.message || 'File uploaded.');
    }
  };

  const downloadPdf = async (pdf: any) => {
    try {
      await Sharing.shareAsync(pdf.url, { mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Download Failed', err.message);
    }
  };

  const deletePdf = (pdf: any) => {
    Alert.alert('Delete Document', `Remove "${pdf.name}" from your vault?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.storage.from('pdfs').remove([pdf.storage_path]);
            await supabase.from('pdf_files').delete().eq('id', pdf.id);
            loadPdfs();
          } catch (err) {
            console.warn('Delete error:', err);
          }
        },
      },
    ]);
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalBytes = pdfs.reduce((acc, p) => acc + (p.size || 0), 0);

  const filteredPdfs = useMemo(() => {
    if (!searchQuery.trim()) return pdfs;
    return pdfs.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [pdfs, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Document Vault</Text>
          <Text style={styles.headerSub}>{pdfs.length} files • {formatSize(totalBytes)} stored</Text>
        </View>
        <TouchableOpacity
          onPress={uploadPdf}
          disabled={uploading}
          style={styles.uploadBtn}
          activeOpacity={0.85}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Upload PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter documents by title..."
          placeholderTextColor={Colors.textTertiary}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPdfs(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={Colors.primary} size="small" />
          </View>
        ) : filteredPdfs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="folder-open-outline" size={24} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching documents' : 'Your vault is empty'}
            </Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? 'Try a different search keyword.' : 'Upload lecture notes, past exam papers, or syllabus slides to generate quizzes.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity onPress={uploadPdf} style={styles.emptyActionBtn} activeOpacity={0.85}>
                <Ionicons name="cloud-upload-outline" size={14} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Select PDF File</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.tableCard}>
            {filteredPdfs.map((pdf, idx) => (
              <View
                key={pdf.id}
                style={[styles.tableRow, idx === filteredPdfs.length - 1 && styles.tableRowLast]}
              >
                <View style={styles.fileIcon}>
                  <Ionicons name="document-text-outline" size={16} color={Colors.textPrimary} />
                </View>
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>{pdf.name}</Text>
                  <Text style={styles.fileMeta}>{formatSize(pdf.size)} • {format(new Date(pdf.created_at), 'MMM d, yyyy')}</Text>
                </View>
                <View style={styles.actionGroup}>
                  <TouchableOpacity
                    onPress={() => downloadPdf(pdf)}
                    style={styles.actionIcon}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Share PDF"
                  >
                    <Ionicons name="share-outline" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deletePdf(pdf)}
                    style={styles.actionIcon}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Delete PDF"
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
  header: {
    paddingTop: 48,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 110,
  },
  loaderWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  fileIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.xs,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileDetails: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fileMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    padding: 2,
  },
});
