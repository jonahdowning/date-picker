import { Grid, Action, ActionPanel, getPreferenceValues, closeMainWindow, popToRoot, Clipboard, showHUD, Icon, environment, Keyboard } from "@raycast/api";
import { useState } from "react";

interface Preferences {
  defaultDateFormat: string;
  preferredFormat1?: string;
  preferredFormat2?: string;
  preferredFormat3?: string;
  preferredFormat4?: string;
  preferredFormat5?: string;
  shortcutNextMonth?: string;
  shortcutPrevMonth?: string;
  shortcutCurrentMonth?: string;
  shortcutNextYear?: string;
  shortcutPrevYear?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const today = new Date();

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedId, setSelectedId] = useState<string | null>(`day-${today.getDate()}`);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Calculate calendar variables for the current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const navigate = (yearOffset: number, monthOffset: number) => {
    const newDate = new Date(year + yearOffset, month + monthOffset, 1);
    setViewDate(newDate);
    const isCurrentMonth = newDate.getFullYear() === today.getFullYear() && newDate.getMonth() === today.getMonth();
    setSelectedId(isCurrentMonth ? `day-${today.getDate()}` : "day-1");
  };

  const goToToday = () => {
    setViewDate(new Date());
    setSelectedId(`day-${today.getDate()}`);
  };

  // Simple formatting helper function for custom mappings
  const formatDate = (date: Date, formatStr: string) => {
    const d = date.getDate().toString();
    const dd = d.padStart(2, "0");
    const m = (date.getMonth() + 1).toString();
    const mm = m.padStart(2, "0");
    const yyyy = date.getFullYear().toString();
    const yy = yyyy.slice(-2);

    return formatStr
      .replace(/yyyy/g, yyyy)
      .replace(/yy/g, yy)
      .replace(/y/g, yyyy)
      .replace(/MM/g, mm)
      .replace(/M/g, m)
      .replace(/dd/g, dd)
      .replace(/d/g, d);
  };

  // Helper to dynamically render SVG text for the grid view
  const getSvgIcon = (text: string, isToday: boolean = false, isHeader: boolean = false) => {
    const isDark = environment.appearance === "dark";
    let color = isDark ? "#FFFFFF" : "#000000"; // Adapt to Light/Dark Mode
    if (isHeader) color = "#888888";
    if (isToday) color = "#FFFFFF"; // Always keep today's text white over the red background

    const bg = isToday ? `<circle cx="80" cy="45" r="35" fill="#FF6363" />` : "";
    const fontSize = isHeader ? 25 : 35;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
      ${bg}
      <text x="80" y="50" font-family="-apple-system, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const parseShortcut = (shortcutStr: string | undefined, defaultShortcut: Keyboard.Shortcut): Keyboard.Shortcut => {
    if (!shortcutStr || shortcutStr.trim() === "") return defaultShortcut;
    try {
      const parts = shortcutStr.split("+").map((s) => s.trim());
      const keyRaw = parts.pop() || "";
      const modifiers = parts.map((m) => m.toLowerCase()) as Keyboard.KeyModifier[];
      // Fallback: Ensure normal single-character keys are properly lowercased (but respect exact camelCase values like 'arrowRight')
      const key = (keyRaw.length === 1 ? keyRaw.toLowerCase() : keyRaw) as Keyboard.KeyEquivalent;
      if (!key) return defaultShortcut;
      return { modifiers, key };
    } catch {
      return defaultShortcut;
    }
  };

  const NavigationActions = () => (
    <ActionPanel.Section title="Navigation">
      <Action.PickDate
        title="Jump to Date"
        shortcut={{ modifiers: ["cmd"], key: "j" }}
        type={Action.PickDate.Type.Date}
        onChange={(date) => {
          if (date) {
            setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
            setSelectedId(`day-${date.getDate()}`);
          }
        }}
      />
      <Action title="Next Month" icon={Icon.ArrowRight} shortcut={parseShortcut(preferences.shortcutNextMonth, { modifiers: ["ctrl"], key: "n" })} onAction={() => navigate(0, 1)} />
      <Action title="Previous Month" icon={Icon.ArrowLeft} shortcut={parseShortcut(preferences.shortcutPrevMonth, { modifiers: ["ctrl"], key: "p" })} onAction={() => navigate(0, -1)} />
      <Action title="Current Month" icon={Icon.Calendar} shortcut={parseShortcut(preferences.shortcutCurrentMonth, { modifiers: ["ctrl"], key: "c" })} onAction={goToToday} />
      <Action title="Next Year" icon={Icon.ArrowRight} shortcut={parseShortcut(preferences.shortcutNextYear, { modifiers: ["ctrl", "shift"], key: "n" })} onAction={() => navigate(1, 0)} />
      <Action title="Previous Year" icon={Icon.ArrowLeft} shortcut={parseShortcut(preferences.shortcutPrevYear, { modifiers: ["ctrl", "shift"], key: "p" })} onAction={() => navigate(-1, 0)} />
    </ActionPanel.Section>
  );

  const items: JSX.Element[] = [];

  // 1. Add column headers (Sun, Mon, Tue, etc.)
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  daysOfWeek.forEach((day) => {
    items.push(<Grid.Item id={`header-${day}`} key={`header-${day}`} content={getSvgIcon(day, false, true)} actions={<ActionPanel><NavigationActions /></ActionPanel>} />);
  });

  // 2. Add empty spacing blocks to pad the days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptySvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"></svg>')}`;
    items.push(<Grid.Item id={`empty-${i}`} key={`empty-${i}`} content={emptySvg} actions={<ActionPanel><NavigationActions /></ActionPanel>} />);
  }

  // 3. Populate the actual days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === today.toDateString();
    const formattedDate = formatDate(date, preferences.defaultDateFormat || "MM-dd-yyyy");
    const id = `day-${day}`;

    items.push(
      <Grid.Item
        id={id}
        key={id}
        content={getSvgIcon(day.toString(), isToday)}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Paste title="Paste Date" content={formattedDate} />
              <Action.CopyToClipboard title="Copy Date" content={formattedDate} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Preferred Formats">
              {preferences.preferredFormat1 && (
                <Action.Paste
                  title={`Paste as ${preferences.preferredFormat1}`}
                  content={formatDate(date, preferences.preferredFormat1)}
                  shortcut={{ modifiers: ["cmd"], key: "1" }}
                />
              )}
              {preferences.preferredFormat2 && (
                <Action.Paste
                  title={`Paste as ${preferences.preferredFormat2}`}
                  content={formatDate(date, preferences.preferredFormat2)}
                  shortcut={{ modifiers: ["cmd"], key: "2" }}
                />
              )}
              {preferences.preferredFormat3 && (
                <Action.Paste
                  title={`Paste as ${preferences.preferredFormat3}`}
                  content={formatDate(date, preferences.preferredFormat3)}
                  shortcut={{ modifiers: ["cmd"], key: "3" }}
                />
              )}
              {preferences.preferredFormat4 && (
                <Action.Paste
                  title={`Paste as ${preferences.preferredFormat4}`}
                  content={formatDate(date, preferences.preferredFormat4)}
                  shortcut={{ modifiers: ["cmd"], key: "4" }}
                />
              )}
              {preferences.preferredFormat5 && (
                <Action.Paste
                  title={`Paste as ${preferences.preferredFormat5}`}
                  content={formatDate(date, preferences.preferredFormat5)}
                  shortcut={{ modifiers: ["cmd"], key: "5" }}
                />
              )}
            </ActionPanel.Section>
            <NavigationActions />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid
      columns={7}
      aspectRatio="16/9"
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Zero}
      searchBarPlaceholder="Select a day..."
      filtering={false}
      selectedItemId={selectedId || undefined}
      onSelectionChange={(id) => setSelectedId(id)}
    >
      <Grid.Section title={viewDate.toLocaleString("default", { month: "long", year: "numeric" })}>
        {items}
      </Grid.Section>
    </Grid>
  );
}