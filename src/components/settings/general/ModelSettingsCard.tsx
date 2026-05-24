import React from "react";
import { useModelStore } from "../../../stores/modelStore";
import type { ModelInfo } from "@/bindings";

export const ModelSettingsCard: React.FC = () => {
  const { currentModel, models } = useModelStore();

  const currentModelInfo = models.find((m: ModelInfo) => m.id === currentModel);

  // Parakeet V3 works automatically; there are no consumer-facing model settings.
  if (!currentModel || !currentModelInfo) {
    return null;
  }

  return null;
};
