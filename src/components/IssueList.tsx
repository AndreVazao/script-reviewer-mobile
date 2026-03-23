import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { ReviewIssue } from "../types";
import { theme } from "../theme";

interface IssueListProps {
  issues: ReviewIssue[];
  selectedIssueId?: string;
  onSelectIssue: (issue: ReviewIssue) => void;
}

function getSeverityColor(severity: ReviewIssue["severity"]) {
  switch (severity) {
    case "error":
      return theme.colors.danger;
    case "warning":
      return theme.colors.warning;
    default:
      return theme.colors.info;
  }
}

export function IssueList({
  issues,
  selectedIssueId,
  onSelectIssue
}: IssueListProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Problemas encontrados</Text>

      {issues.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhum problema encontrado.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {issues.map((issue) => {
            const selected = issue.id === selectedIssueId;
            return (
              <Pressable
                key={issue.id}
                onPress={() => onSelectIssue(issue)}
                style={[
                  styles.card,
                  selected && styles.cardSelected,
                  { borderLeftColor: getSeverityColor(issue.severity) }
                ]}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.badge}>{issue.severity.toUpperCase()}</Text>
                  <Text style={styles.meta}>
                    Linha {issue.line}
                    {issue.column ? `, Col ${issue.column}` : ""}
                  </Text>
                </View>

                <Text style={styles.message}>{issue.message}</Text>

                <Text style={styles.type}>{issue.type}</Text>

                {issue.details ? (
                  <Text style={styles.details}>{issue.details}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.font.sizeLg,
    fontWeight: "700"
  },
  scroll: {
    maxHeight: 320
  },
  content: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs
  },
  cardSelected: {
    backgroundColor: theme.colors.cardAlt
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  badge: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.font.sizeXs
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeXs
  },
  message: {
    color: theme.colors.text,
    fontSize: theme.font.sizeMd,
    fontWeight: "600"
  },
  type: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeSm
  },
  details: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSm
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg
  },
  emptyText: {
    color: theme.colors.textMuted
  }
});
