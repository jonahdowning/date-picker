import { Form, Action, ActionPanel, getPreferenceValues, closeMainWindow, popToRoot, Clipboard, showHUD, Icon } from "@raycast/api";

interface Preferences {
  dateFormat: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Date to Clipboard"
            icon={Icon.Clipboard}
            onSubmit={async (values: { date: Date | null }) => {
              if (values.date) {
                const formattedDate = formatDate(values.date, preferences.dateFormat || "M.d.y");
                await Clipboard.copy(formattedDate);
                await showHUD(`Copied ${formattedDate}`);
                await closeMainWindow();
                await popToRoot();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="date"
        title="Select a Date"
        defaultValue={new Date()}
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}