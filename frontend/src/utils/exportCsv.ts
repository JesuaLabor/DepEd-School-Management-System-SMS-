export interface CsvColumn<T> {
  key: keyof T | ((row: T) => string | number | boolean | null | undefined);
  label: string;
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Header row
  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");

  // Data rows
  const dataRows = data.map((item) => {
    return columns
      .map((col) => {
        let val: any;
        if (typeof col.key === "function") {
          val = col.key(item);
        } else {
          val = item[col.key];
        }

        if (val === null || val === undefined) {
          val = "";
        } else {
          val = String(val);
        }

        // Escape double quotes by doubling them
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
