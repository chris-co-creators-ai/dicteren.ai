import React from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical, Sparkles } from "lucide-react";
import DicterenTextLogo from "./icons/DicterenTextLogo";
import { useSettings } from "../hooks/useSettings";
import generalIcon from "@/assets/branding/menu-icons/general-32.png";
import modelsIcon from "@/assets/branding/menu-icons/models-32.png";
import advancedIcon from "@/assets/branding/menu-icons/advanced-32.png";
import historyIcon from "@/assets/branding/menu-icons/history-32.png";
import aboutIcon from "@/assets/branding/menu-icons/about-32.png";
import {
  GeneralSettings,
  AdvancedSettings,
  HistorySettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
  ModelsSettings,
} from "./settings";

export type SidebarSection = keyof typeof SECTIONS_CONFIG;

interface IconProps {
  width?: number | string;
  height?: number | string;
  size?: number | string;
  className?: string;
  [key: string]: any;
}

interface SectionConfig {
  labelKey: string;
  icon: React.ComponentType<IconProps> | string;
  component: React.ComponentType;
  enabled: (settings: any) => boolean;
}

const BrandMenuIcon: React.FC<{ src: string; active?: boolean }> = ({
  src,
}) => (
  <img
    src={src}
    alt=""
    className="w-5 h-5 object-contain shrink-0"
  />
);

export const SECTIONS_CONFIG = {
  general: {
    labelKey: "sidebar.general",
    icon: generalIcon,
    component: GeneralSettings,
    enabled: () => true,
  },
  models: {
    labelKey: "sidebar.models",
    icon: modelsIcon,
    component: ModelsSettings,
    enabled: () => true,
  },
  advanced: {
    labelKey: "sidebar.advanced",
    icon: advancedIcon,
    component: AdvancedSettings,
    enabled: () => true,
  },
  history: {
    labelKey: "sidebar.history",
    icon: historyIcon,
    component: HistorySettings,
    enabled: () => true,
  },
  postprocessing: {
    labelKey: "sidebar.postProcessing",
    icon: Sparkles,
    component: PostProcessingSettings,
    enabled: (settings) => settings?.post_process_enabled ?? false,
  },
  debug: {
    labelKey: "sidebar.debug",
    icon: FlaskConical,
    component: DebugSettings,
    enabled: (settings) => settings?.debug_mode ?? false,
  },
  about: {
    labelKey: "sidebar.about",
    icon: aboutIcon,
    component: AboutSettings,
    enabled: () => true,
  },
} as const satisfies Record<string, SectionConfig>;

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const availableSections = Object.entries(SECTIONS_CONFIG)
    .filter(([_, config]) => config.enabled(settings))
    .map(([id, config]) => ({ id: id as SidebarSection, ...config }));

  return (
    <div
      className="dc-sidebar flex flex-col w-52 h-full shrink-0"
      style={{ padding: 16 }}
    >
      <div className="flex items-center gap-2 mb-4 px-1.5">
        <DicterenTextLogo width={140} />
      </div>
      <div className="flex flex-col w-full gap-1">
        {availableSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              data-active={isActive}
              className="dc-sidebar-item"
              onClick={() => onSectionChange(section.id)}
              title={t(section.labelKey)}
            >
              {typeof Icon === "string" ? (
                <BrandMenuIcon src={Icon} active={isActive} />
              ) : (
                <Icon
                  width={16}
                  height={16}
                  className="shrink-0"
                  style={{
                    color: isActive
                      ? "var(--orange-600)"
                      : "var(--text-muted)",
                  }}
                />
              )}
              <span className="truncate">{t(section.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
