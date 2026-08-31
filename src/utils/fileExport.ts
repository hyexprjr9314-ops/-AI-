import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Parses markdown text to extract tabular structures and sections.
 */
export interface ParsedTableData {
  headers: string[];
  rows: string[][];
}

/**
 * Extracts markdown tables from text if present.
 */
export function extractMarkdownTables(text: string): ParsedTableData[] {
  const lines = text.split('\n');
  const tables: ParsedTableData[] = [];
  let currentHeaders: string[] | null = null;
  let currentRows: string[][] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Check if it's a delimiter row like |---|---|
      const isDelimiter = cells.every((c) => /^[-: ]+$/.test(c));

      if (isDelimiter && currentHeaders) {
        inTable = true;
        continue;
      }

      if (!inTable) {
        currentHeaders = cells;
      } else {
        currentRows.push(cells);
      }
    } else {
      if (inTable && currentHeaders && currentRows.length > 0) {
        tables.push({ headers: currentHeaders, rows: currentRows });
      }
      inTable = false;
      currentHeaders = null;
      currentRows = [];
    }
  }

  if (inTable && currentHeaders && currentRows.length > 0) {
    tables.push({ headers: currentHeaders, rows: currentRows });
  }

  return tables;
}

/**
 * Exports structured sheets to an Excel (.xlsx) file.
 */
export function exportToExcel(
  sheetsData: { sheetName: string; data: (string | number)[][] }[],
  fileName: string
) {
  const wb = XLSX.utils.book_new();

  sheetsData.forEach(({ sheetName, data }) => {
    const safeSheetName = (sheetName || 'Sheet1').slice(0, 31).replace(/[\\/?*[\]]/g, '_');
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Calculate dynamic column widths
    const colWidths: number[] = [];
    data.forEach((row) => {
      row.forEach((cell, colIdx) => {
        const cellLength = cell ? String(cell).length : 5;
        const currentVal = colWidths[colIdx] || 10;
        colWidths[colIdx] = Math.max(currentVal, Math.min(cellLength + 4, 45));
      });
    });

    ws['!cols'] = colWidths.map((w: number) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  });

  const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Converts generic Markdown text into an Excel file.
 * If markdown contains tables, converts each table to a sheet.
 * Otherwise, splits by paragraphs and lists into rows.
 */
export function exportMarkdownToExcel(markdown: string, fileName: string) {
  const extractedTables = extractMarkdownTables(markdown);

  if (extractedTables.length > 0) {
    const sheets = extractedTables.map((t, idx) => ({
      sheetName: `Table_${idx + 1}`,
      data: [t.headers, ...t.rows],
    }));
    exportToExcel(sheets, fileName);
    return;
  }

  // Fallback: convert markdown lines/bullet points into rows
  const lines = markdown.split('\n');
  const rows: string[][] = [];
  rows.push(['항목', '내용']);

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#')) {
      const headingText = trimmed.replace(/^#+\s*/, '');
      rows.push(['[섹션]', headingText]);
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const bulletText = trimmed.replace(/^[-*]\s*/, '');
      rows.push(['•', bulletText]);
    } else {
      rows.push(['본문', trimmed]);
    }
  });

  exportToExcel([{ sheetName: '내용 요약', data: rows }], fileName);
}

/**
 * Formats and exports Markdown content into a professionally styled Word (.docx) document.
 */
export async function exportMarkdownToDocx(
  markdown: string,
  docTitle: string,
  authorName: string = 'Personal AI Agent'
) {
  const lines = markdown.split('\n');
  const docElements: (Paragraph | Table)[] = [];

  // Title Paragraph
  docElements.push(
    new Paragraph({
      text: docTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, before: 100 },
    })
  );

  // Metadata subtitle
  docElements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: `작성: ${authorName} | 생성일: ${new Date().toLocaleDateString('ko-KR')}`,
          italics: true,
          color: '666666',
          size: 18,
        }),
      ],
    })
  );

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableHeaders.length > 0 && tableRows.length > 0) {
      const docxTableRows: TableRow[] = [
        // Header Row
        new TableRow({
          tableHeader: true,
          children: tableHeaders.map(
            (h) =>
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: '2D3748', color: 'FFFFFF' },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: h,
                        bold: true,
                        color: 'FFFFFF',
                        size: 20,
                      }),
                    ],
                  }),
                ],
              })
          ),
        }),
        // Data Rows
        ...tableRows.map(
          (row, rIdx) =>
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    shading:
                      rIdx % 2 === 1
                        ? { type: ShadingType.CLEAR, fill: 'F7FAFC' }
                        : undefined,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: cell, size: 20 })],
                      }),
                    ],
                  })
              ),
            })
        ),
      ];

      docElements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: docxTableRows,
        })
      );
      docElements.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    }
    inTable = false;
    tableHeaders = [];
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table parsing
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      const isDelimiter = cells.every((c) => /^[-: ]+$/.test(c));
      if (isDelimiter && tableHeaders.length > 0) {
        inTable = true;
        continue;
      }

      if (!inTable) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        flushTable();
      }
    }

    if (!trimmed) {
      docElements.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      docElements.push(
        new Paragraph({
          text: trimmed.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        })
      );
    } else if (trimmed.startsWith('## ')) {
      docElements.push(
        new Paragraph({
          text: trimmed.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 100 },
        })
      );
    } else if (trimmed.startsWith('# ')) {
      docElements.push(
        new Paragraph({
          text: trimmed.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 140 },
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const cleanBullet = trimmed.replace(/^[-*]\s+/, '');
      docElements.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: cleanBullet, size: 22 })],
        })
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const cleanNumbered = trimmed.replace(/^\d+\.\s+/, '');
      docElements.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${trimmed.match(/^\d+\./)?.[0] || '1.'} `, bold: true }),
            new TextRun({ text: cleanNumbered, size: 22 }),
          ],
        })
      );
    } else {
      // Normal paragraph
      const cleanText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
      docElements.push(
        new Paragraph({
          spacing: { after: 120, line: 276 },
          children: [new TextRun({ text: cleanText, size: 22 })],
        })
      );
    }
  }

  if (inTable) {
    flushTable();
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docElements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const finalName = docTitle.endsWith('.docx') ? docTitle : `${docTitle}.docx`;
  saveAs(blob, finalName);
}
