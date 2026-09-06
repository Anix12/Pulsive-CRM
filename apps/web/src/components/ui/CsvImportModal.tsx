'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from './Modal';
import { Upload, FileText, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

const CONTACT_FIELDS: { value: string; label: string; required?: boolean }[] = [
  { value: 'name', label: 'Name', required: true },
  { value: 'phone', label: 'Phone', required: true },
  { value: 'alternatePhone', label: 'Alternate Phone' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'jobTitle', label: 'Job Title' },
  { value: 'status', label: 'Status' },
  { value: 'source', label: 'Source' },
  { value: '', label: '— Skip this column —' },
];

function autoMap(headers: string[]): Record<string, string> {
  const aliases: Record<string, string> = {
    name: 'name', 'full name': 'name', 'contact name': 'name', 'first name': 'name', firstname: 'name',
    phone: 'phone', mobile: 'phone', 'phone number': 'phone', tel: 'phone',
    'alternate phone': 'alternatePhone', 'alt phone': 'alternatePhone', 'secondary phone': 'alternatePhone', 'phone 2': 'alternatePhone',
    email: 'email', 'email address': 'email', 'e-mail': 'email',
    company: 'company', organisation: 'company', organization: 'company', 'company name': 'company',
    'job title': 'jobTitle', jobtitle: 'jobTitle', 'job_title': 'jobTitle', title: 'jobTitle', position: 'jobTitle',
    status: 'status',
    source: 'source', 'lead source': 'source',
  };
  const mapping: Record<string, string> = {};
  headers.forEach((h) => {
    mapping[h] = aliases[h.toLowerCase().trim()] ?? '';
  });
  return mapping;
}

function parsePreview(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const parse = (line: string) => {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  };
  const headers = parse(lines[0]);
  const rows = lines.slice(1, 6).map(parse);
  return { headers, rows };
}

type Step = 'upload' | 'map' | 'result';

interface ImportResult {
  imported: number;
  failed: number;
  errors: { row: number; error: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  /** Import endpoint, relative to NEXT_PUBLIC_API_URL. Defaults to the contacts importer. */
  endpoint?: string;
  /** Modal title. Defaults to the contacts importer's title. */
  title?: string;
  /** Label for the "imported" stat + submit button. Defaults to "Contacts". */
  resultLabel?: string;
}

export function CsvImportModal({
  open,
  onClose,
  onImported,
  endpoint = '/api/v1/contacts/import',
  title = 'Import Contacts from CSV',
  resultLabel = 'Contacts',
}: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExcel = (f: File) => /\.(xlsx|xls)$/i.test(f.name);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv') && !isExcel(f)) { setError('Please upload a .csv, .xlsx, or .xls file'); return; }
    setError('');
    setFile(f);
    const reader = new FileReader();

    if (isExcel(f)) {
      reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
        const h = (rows[0] || []).map((v) => String(v).trim());
        const previewData = rows.slice(1, 6).map((row) => h.map((_, i) => String(row[i] ?? '')));
        setHeaders(h);
        setPreviewRows(previewData);
        setMapping(autoMap(h));
        setStep('map');
      };
      reader.readAsArrayBuffer(f);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { headers: h, rows } = parsePreview(text);
        setHeaders(h);
        setPreviewRows(rows);
        setMapping(autoMap(h));
        setStep('map');
      };
      reader.readAsText(f);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const submit = async () => {
    if (!file) return;
    const requiredFields = CONTACT_FIELDS.filter((f) => f.required).map((f) => f.value);
    const mappedFields = Object.values(mapping);
    const missing = requiredFields.filter((f) => !mappedFields.includes(f));
    if (missing.length > 0) {
      setError(`Please map required fields: ${missing.join(', ')}`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.accessToken : '';
      const form = new FormData();
      form.append('file', file);
      form.append('mapping', JSON.stringify(mapping));
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Import failed');
      setResult(json.data);
      setStep('result');
      if (json.data.imported > 0) onImported();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setResult(null);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2 text-xs text-white/40">
        {(['upload', 'map', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${step === s ? 'bg-gradient-to-br from-cyan-400 to-blue-700 text-white' : i < ['upload', 'map', 'result'].indexOf(step) ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
              {i + 1}
            </span>
            <span className={step === s ? 'font-semibold text-white/90' : ''}>{s === 'upload' ? 'Upload' : s === 'map' ? 'Map Columns' : 'Results'}</span>
            {i < 2 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${dragging ? 'border-cyan-400/50 bg-cyan-400/[0.06]' : 'border-white/15 hover:border-cyan-400/30 hover:bg-white/[0.03]'}`}
          >
            <Upload className="mb-3 h-8 w-8 text-white/30" />
            <p className="text-sm font-medium text-white/75">Drop a CSV file here or click to browse</p>
            <p className="mt-1 text-xs text-white/35">Max 5 MB · UTF-8 encoded</p>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          <div className="rounded-lg bg-white/[0.04] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/35">Expected CSV format</p>
            <code className="block text-xs text-white/55">Name,Phone,Email,Company,Status</code>
            <code className="block text-xs text-white/30">John Doe,+919876543210,john@example.com,Acme,LEAD</code>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-cyan-400/10 px-3 py-2">
            <FileText className="h-4 w-4 text-cyan-300" />
            <p className="text-sm text-cyan-300 font-medium">{file?.name}</p>
            <span className="ml-auto text-xs text-cyan-400/70">{previewRows.length} preview rows</span>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-white/70">Map your CSV columns to contact fields:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-36 truncate rounded bg-white/[0.06] px-2 py-1.5 text-xs font-mono text-white/70" title={header}>{header}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 text-white/25" />
                  <select
                    value={mapping[header] ?? ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white/80 focus:border-cyan-400/50 focus:outline-none"
                  >
                    {CONTACT_FIELDS.map((f) => (
                      <option key={f.value} value={f.value} className="bg-[#0b1120] text-white">
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {previewRows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/35">Preview (first {previewRows.length} rows)</p>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="bg-white/[0.04]">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-white/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="whitespace-nowrap px-3 py-1.5 text-white/55">{cell || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-between pt-2">
            <button onClick={reset} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/[0.06]">
              Back
            </button>
            <button onClick={submit} disabled={loading} className="btn-gradient-brand flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? 'Importing...' : `Import ${resultLabel}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-400/10 p-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-emerald-300">{result.imported}</p>
                <p className="text-xs text-emerald-400/80">{resultLabel} imported</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-red-400/10 p-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-300">{result.failed}</p>
                <p className="text-xs text-red-400/80">Failed rows</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/35">Errors</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-red-400/20 bg-red-400/[0.06]">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex gap-3 border-b border-red-400/10 px-3 py-2 text-xs last:border-0">
                    <span className="font-mono text-red-400/70">Row {e.row}</span>
                    <span className="text-red-300">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            {result.failed > 0 && (
              <button onClick={reset} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/[0.06]">
                Import Another
              </button>
            )}
            <button onClick={handleClose} className="btn-gradient-brand rounded-lg px-4 py-2 text-sm font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
