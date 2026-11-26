import { useState } from "react";

export function useSelectedText(fallback: string) {
  const [selectedText, setSelectedText] = useState("");
  return {
    input: (selectedText || fallback).slice(0, 4000),
    onSelect: (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const { value, selectionStart, selectionEnd } = event.currentTarget;
      setSelectedText(value.slice(selectionStart, selectionEnd).trim());
    },
    clear: () => setSelectedText(""),
  };
}
