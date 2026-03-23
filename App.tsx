import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { StatusBar } from "expo-status-bar";

import { analyzeFile } from "./src/analysis/analyzer";
import { CodeViewer } from "./src/components/CodeViewer";
import { IssueList } from "./src/components/IssueList";
import { theme } from "./src/theme";
import { ReviewIssue, ReviewResult } from "./src/types";
import { getLanguageLabel } from "./src/utils/file";

export default function App() {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<ReviewIssue | undefined>();
  const [loading, setLoading] = useState(false);

  const summaryCards = useMemo(() => {
    if (!result) return null;

    return [
      {
        label: "Linhas",
        value: String(result.summary.totalLines),
        color: theme.colors.primary
      },
      {
        label: "Erros",
        value: String(result.summary.errors),
        color: theme.colors.danger
      },
      {
        label: "Avisos",
        value: String(result.summary.warnings),
        color: theme.colors.warning
      },
      {
        label: "Infos",
        value: String(result.summary.infos),
        color: theme.colors.info
      },
      {
        label: "Duplicados",
        value: String(result.summary.duplicateBlocks),
        color: theme.colors.success
      }
    ];
  }, [result]);

  async function pickFile() {
    try {
      setLoading(true);

      const picked = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: "*/*"
      });

      if (picked.canceled) {
        setLoading(false);
        return;
      }

      const file = picked.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8
      });

      const review = analyzeFile(file.name, content);
      setResult(review);
      setSelectedIssue(review.issues[0]);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Erro",
        "Não foi possível abrir ou analisar o ficheiro."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setResult(null);
    setSelectedIssue(undefined);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.appTitle}>Script Reviewer Mobile</Text>
          <Text style={styles.appSubtitle}>
            Revisão local de scripts, indentação, sinais estruturais e código repetido.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={pickFile}
              style={[styles.button, styles.primaryButton]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "A processar..." : "Abrir ficheiro"}
              </Text>
            </Pressable>

            <Pressable
              onPress={clearAll}
              style={[styles.button, styles.secondaryButton]}
            >
              <Text style={styles.secondaryButtonText}>Limpar</Text>
            </Pressable>
          </View>
        </View>

        {!result ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sem ficheiro carregado</Text>
            <Text style={styles.emptyText}>
              Importa um único ficheiro e a app vai analisar o conteúdo localmente.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.fileCard}>
              <Text style={styles.sectionTitle}>Ficheiro</Text>
              <Text style={styles.fileName}>{result.fileName}</Text>
              <Text style={styles.fileMeta}>
                Linguagem: {getLanguageLabel(result.fileExtension || "txt")}
              </Text>
              <Text style={styles.fileMeta}>
                Total de problemas: {result.summary.totalIssues}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              {summaryCards?.map((item) => (
                <View
                  key={item.label}
                  style={[styles.summaryCard, { borderColor: item.color }]}
                >
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <IssueList
              issues={result.issues}
              selectedIssueId={selectedIssue?.id}
              onSelectIssue={setSelectedIssue}
            />

            <CodeViewer
              lines={result.lines}
              highlightedLine={selectedIssue?.line}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: 48
  },
  headerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md
  },
  appTitle: {
    color: theme.colors.text,
    fontSize: theme.font.sizeXl,
    fontWeight: "800"
  },
  appSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeMd,
    lineHeight: 21
  },
  buttonRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap"
  },
  button: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButton: {
    backgroundColor: theme.colors.primary
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  primaryButtonText: {
    color: "#08111f",
    fontWeight: "800",
    fontSize: theme.font.sizeMd
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.font.sizeMd
  },
  emptyState: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.font.sizeLg,
    fontWeight: "700"
  },
  emptyText: {
    color: theme.colors.textMuted,
    lineHeight: 21
  },
  fileCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.font.sizeLg,
    fontWeight: "700",
    marginBottom: theme.spacing.xs
  },
  fileName: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeMd,
    fontWeight: "700"
  },
  fileMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSm
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  summaryCard: {
    minWidth: "30%",
    flexGrow: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.xs
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: theme.font.sizeLg,
    fontWeight: "800"
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSm
  }
});
