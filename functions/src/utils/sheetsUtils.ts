import {google} from "googleapis";
import {getGoogleSheetsAuth} from "./auth";

export interface SheetData {
  values: string[][];
}

export interface ProgramDistribution {
  "Not Yet contacted": number;
  "No Program": number;
  "Inactive": number;
  "Contacted": number;
  "Approved": number;
  "Refused": number;
  total: number;
}

export interface IdeasDistribution {
  "Not yet": number;
  "Generated": number;
  "Chosen": number;
  "To be redone": number;
  total: number;
}

/**
 * Extract sheet ID from Google Sheets URL
 */
export function extractSheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Invalid Google Sheets URL");
  }
  return match[1];
}

/**
 * Read data from Google Sheets
 */
export async function readSheetData(
  sheetId: string,
  range: string = "A:Z"
): Promise<SheetData> {
  try {
    const auth = await getGoogleSheetsAuth();
    const sheets = google.sheets({version: "v4", auth: auth as any});

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    return {
      values: response.data.values || [],
    };
  } catch (error) {
    console.error("Error reading sheet data:", error);
    throw new Error(`Failed to read sheet data: ${error}`);
  }
}

/**
 * Read data from a specific tab in Google Sheets
 */
export async function readFromTab(
  sheetId: string,
  tabName: string,
  range: string = "A:Z"
): Promise<SheetData> {
  try {
    const auth = await getGoogleSheetsAuth();
    const sheets = google.sheets({version: "v4", auth: auth as any});

    // Format: 'TabName'!A:Z
    const fullRange = `'${tabName}'!${range}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: fullRange,
    });

    return {
      values: response.data.values || [],
    };
  } catch (error) {
    console.error(`Error reading from tab "${tabName}":`, error);
    throw new Error(`Failed to read from tab "${tabName}": ${error}`);
  }
}

/**
 * Append rows to a specific tab in Google Sheets
 */
export async function appendToTab(
  sheetId: string,
  tabName: string,
  values: string[][]
): Promise<void> {
  try {
    const auth = await getGoogleSheetsAuth();
    const sheets = google.sheets({version: "v4", auth: auth as any});

    // Format: 'TabName'!A:Z
    const range = `'${tabName}'!A:Z`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });

    console.log(`✅ Successfully appended ${values.length} row(s) to tab "${tabName}"`);
  } catch (error) {
    console.error(`Error appending to tab "${tabName}":`, error);
    throw new Error(`Failed to append to tab "${tabName}": ${error}`);
  }
}

/**
 * Analyze Program distribution (Column G)
 */
export function analyzeProgramDistribution(data: string[][]): ProgramDistribution {
  const distribution: ProgramDistribution = {
    "Not Yet contacted": 0,
    "No Program": 0,
    "Inactive": 0,
    "Contacted": 0,
    "Approved": 0,
    "Refused": 0,
    total: 0,
  };

  // Skip header row (index 0), column G is index 6
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[6]) { // Column G (0-indexed as 6)
      const value = row[6].trim();
      if (value in distribution && value !== "total") {
        (distribution as any)[value]++;
        distribution.total++;
      }
    }
  }

  return distribution;
}

/**
 * Analyze Ideas Generated distribution (Column J)
 */
export function analyzeIdeasDistribution(data: string[][]): IdeasDistribution {
  const distribution: IdeasDistribution = {
    "Not yet": 0,
    "Generated": 0,
    "Chosen": 0,
    "To be redone": 0,
    total: 0,
  };

  // Skip header row (index 0), column J is index 9
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[9]) { // Column J (0-indexed as 9)
      const value = row[9].trim();
      if (value in distribution && value !== "total") {
        (distribution as any)[value]++;
        distribution.total++;
      }
    }
  }

  return distribution;
}

/**
 * Format distribution data as readable text
 */
export function formatDistributionReport(
  programDist: ProgramDistribution,
  ideasDist: IdeasDistribution
): string {
  const timestamp = new Date().toISOString();

  return `
=== MARKETING SHEET REPORT ===
Generated: ${timestamp}

📊 PROGRAM STATUS DISTRIBUTION (Column G)
Total entries: ${programDist.total}
- Not Yet contacted: ${programDist["Not Yet contacted"]} (${((programDist["Not Yet contacted"] / programDist.total) * 100).toFixed(1)}%)
- No Program: ${programDist["No Program"]} (${((programDist["No Program"] / programDist.total) * 100).toFixed(1)}%)
- Inactive: ${programDist["Inactive"]} (${((programDist["Inactive"] / programDist.total) * 100).toFixed(1)}%)
- Contacted: ${programDist["Contacted"]} (${((programDist["Contacted"] / programDist.total) * 100).toFixed(1)}%)
- Approved: ${programDist["Approved"]} (${((programDist["Approved"] / programDist.total) * 100).toFixed(1)}%)
- Refused: ${programDist["Refused"]} (${((programDist["Refused"] / programDist.total) * 100).toFixed(1)}%)

💡 IDEAS GENERATED DISTRIBUTION (Column J)
Total entries: ${ideasDist.total}
- Not yet: ${ideasDist["Not yet"]} (${((ideasDist["Not yet"] / ideasDist.total) * 100).toFixed(1)}%)
- Generated: ${ideasDist["Generated"]} (${((ideasDist["Generated"] / ideasDist.total) * 100).toFixed(1)}%)
- Chosen: ${ideasDist["Chosen"]} (${((ideasDist["Chosen"] / ideasDist.total) * 100).toFixed(1)}%)
- To be redone: ${ideasDist["To be redone"]} (${((ideasDist["To be redone"] / ideasDist.total) * 100).toFixed(1)}%)

===============================
  `.trim();
}