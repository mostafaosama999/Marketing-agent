declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [sheet: string]: WorkSheet };
  }

  export interface WorkSheet {
    [cell: string]: CellObject | any;
  }

  export interface CellObject {
    t: string;
    v: any;
    w?: string;
  }

  export interface ParsingOptions {
    type?: 'array' | 'string' | 'buffer' | 'base64' | 'binary' | 'file';
    [key: string]: any;
  }

  export interface SheetJSUtils {
    sheet_to_json<T = any>(worksheet: WorkSheet, opts?: any): T[];
    decode_range(range: string): any;
  }

  export function read(data: any, opts?: ParsingOptions): WorkBook;
  export function readFile(filename: string, opts?: ParsingOptions): WorkBook;
  export const utils: SheetJSUtils;
}
