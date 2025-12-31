'use client';

import { jsPDF } from 'jspdf';
import Papa from 'papaparse';

interface TableToolbarProps {
  data: any[];
  fileName: string;
  columns: { key: string; label: string }[];
}

export function TableToolbar({ data, fileName, columns }: TableToolbarProps) {
  const exportCSV = () => {
    if (!data.length) {
      alert('No data to export');
      return;
    }

    // Filter columns to include only those in the columns array
    const filteredData = data.map((row) => {
      const filtered: any = {};
      columns.forEach((col) => {
        filtered[col.label] = row[col.key] || '';
      });
      return filtered;
    });

    const csv = Papa.unparse(filteredData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!data.length) {
      alert('No data to export');
      return;
    }

    const filteredData = data.map((row) => {
      const filtered: any = {};
      columns.forEach((col) => {
        filtered[col.label] = row[col.key] || '';
      });
      return filtered;
    });

    const json = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!data.length) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Title
    doc.setFontSize(16);
    doc.text(fileName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Table header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const colWidth = (pageWidth - 20) / columns.length;
    columns.forEach((col, idx) => {
      doc.text(col.label, 10 + idx * colWidth, yPosition);
    });
    yPosition += 7;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    data.forEach((row) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 15;
      }

      columns.forEach((col, idx) => {
        const cellText = String(row[col.key] || '-').substring(0, 30);
        doc.text(cellText, 10 + idx * colWidth, yPosition);
      });
      yPosition += 7;
    });

    doc.save(`${fileName}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={exportCSV}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
        title="Export as CSV"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        CSV
      </button>

      <button
        onClick={exportJSON}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        title="Export as JSON"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        JSON
      </button>

      <button
        onClick={exportPDF}
        className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
        title="Export as PDF"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        PDF
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
        title="Print"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Print
      </button>
    </div>
  );
}
