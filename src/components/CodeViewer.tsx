import React, { useEffect, useMemo, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { theme } from "../theme";

interface CodeViewerProps {
  lines: string[];
  highlightedLine?: number;
}

export function CodeViewer({ lines, highlightedLine }: CodeViewerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lineHeight = 22;

  useEffect(() => {
    if (!highlightedLine || !scrollRef.current) return;
    const y = Math.max(0, (highlightedLine - 3) * lineHeight);
    scrollRef.current.scrollTo({ y, animated: true });
  }, [highlightedLine]);

  const rendered = useMemo(
    () =>
      lines.map((line, index) => {
        const lineNumber = index + 1;
        const isHighlighted = lineNumber === highlightedLine;

        return (
          <View
            key={`line-${lineNumber}`}
            style={[styles.lineRow, isHighlighted && styles.lineRowHighlighted]}
          >
            <Text style={styles.lineNumber}>{lineNumber}</Text>
            <Text selectable style={styles.lineText}>
              {line.length > 0 ? line.replace(/\t/g, "⇥   ") : " "}
            </Text>
          </View>
        );
      }),
    [lines, highlightedLine]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Código</Text>
      <ScrollView ref={scrollRef} style={styles.viewer}>
        {rendered}
      </ScrollView>
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
  viewer: {
    maxHeight: 420,
    backgroundColor: theme.colors.codeBg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm
  },
  lineRow: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.sm
  },
  lineRowHighlighted: {
    backgroundColor: theme.colors.lineHighlight
  },
  lineNumber: {
    width: 52,
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSm,
    textAlign: "right",
    paddingRight: theme.spacing.sm,
    fontFamily: "monospace"
  },
  lineText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.font.sizeSm,
    fontFamily: "monospace"
  }
});
