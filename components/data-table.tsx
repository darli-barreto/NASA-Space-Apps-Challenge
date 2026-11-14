"use client";
import { useSourceText } from "./source-text";
import type { ReactNode } from "react";

export default function DataTable({ title, columns, rows }: {
  title: string;
  columns: string[];
  rows: ReactNode[][];
}) {
  const text = useSourceText();
  return (
    <div role="region" aria-label={text(title)} tabIndex={0} className="max-h-96 overflow-auto rounded border border-slate-200 bg-white">
      <table aria-label={text(title)} className="w-full text-left text-sm tabular-nums [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
        <thead className="sticky top-0 bg-slate-100"><tr>{columns.map(column => <th scope="col" key={column}>{text(column)}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{value}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
