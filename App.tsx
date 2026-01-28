
import React, { useState, useCallback } from 'react';
import { 
  FileText, 
  Upload, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Trash2,
  Download,
  Check,
  History,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { extractTextFromPdf } from './services/pdfService';
import { reviewTextWithGemini } from './services/geminiService';
import { FileData, AppStatus, ReviewResult } from './types';

const App: React.FC = () => {
  const [targetFile, setTargetFile] = useState<FileData | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<FileData[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTargetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus(AppStatus.EXTRACTING_TEXT);
      const text = await extractTextFromPdf(file);
      setTargetFile({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        content: text,
        type: 'target'
      });
      setStatus(AppStatus.IDLE);
    } catch (err) {
      setError("Erro ao ler o PDF. Verifique se o arquivo não está protegido.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    try {
      setStatus(AppStatus.EXTRACTING_TEXT);
      const newRefs: FileData[] = [];
      for (const file of files) {
        const text = await extractTextFromPdf(file);
        newRefs.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          content: text,
          type: 'reference'
        });
      }
      setReferenceFiles(prev => [...prev, ...newRefs]);
      setStatus(AppStatus.IDLE);
    } catch (err) {
      setError("Erro ao ler um ou mais arquivos de referência.");
      setStatus(AppStatus.ERROR);
    }
  };

  const startAnalysis = async () => {
    if (!targetFile) return;

    try {
      setStatus(AppStatus.ANALYZING);
      setError(null);
      const refTexts = referenceFiles.map(f => f.content);
      const reviewResult = await reviewTextWithGemini(targetFile.content, refTexts);
      setResult(reviewResult);
      setStatus(AppStatus.COMPLETED);
    } catch (err) {
      console.error(err);
      setError("Falha na análise da IA. Tente novamente em instantes.");
      setStatus(AppStatus.ERROR);
    }
  };

  const reset = () => {
    setTargetFile(null);
    setReferenceFiles([]);
    setResult(null);
    setStatus(AppStatus.IDLE);
    setError(null);
  };

  const downloadResult = () => {
    if (!result) return;
    const blob = new Blob([result.fullCorrectedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revisado_${targetFile?.name.replace('.pdf', '.txt')}`;
    a.click();
  };

  const exportToExcel = () => {
    if (!result || !result.corrections) return;

    const data = result.corrections.map(corr => ({
      'Tipo de Erro': corr.type === 'orthography' ? 'Ortografia' :
                      corr.type === 'grammar' ? 'Gramática' :
                      corr.type === 'style' ? 'Estilo' : 'Pontuação',
      'Página': corr.pageNumber,
      'Texto Original (De)': corr.original,
      'Texto Sugerido (Para)': corr.corrected,
      'Explicação': corr.explanation
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revisão Detalhada");

    // Ajuste de largura de colunas (aproximado)
    const maxWidths = [15, 10, 40, 40, 60];
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `analise_revisao_${targetFile?.name.replace('.pdf', '')}.xlsx`);
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CheckCircle2 className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Revisor Pro <span className="text-blue-600">AI</span></h1>
          </div>
          <div className="flex items-center gap-4">
            {status === AppStatus.COMPLETED && (
              <button 
                onClick={reset}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Nova Revisão
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {status === AppStatus.IDLE && !result && (
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Revisão Gramatical de Elite com IA
            </h2>
            <p className="text-slate-600 text-lg">
              Envie seu PDF e documentos de referência. O sistema indicará a página exata e permitirá exportação para Excel.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="text-blue-600 w-5 h-5" />
                <h3 className="font-semibold text-slate-900 text-lg">Documento para Revisar</h3>
              </div>
              
              {!targetFile ? (
                <label className="group relative border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Clique para subir PDF</span>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleTargetUpload} />
                </label>
              ) : (
                <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between border border-blue-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <FileText className="text-blue-600 w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-blue-900 truncate">{targetFile.name}</span>
                  </div>
                  <button onClick={() => setTargetFile(null)} className="p-1 hover:bg-blue-200 rounded-md text-blue-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="text-emerald-600 w-5 h-5" />
                <h3 className="font-semibold text-slate-900 text-lg">Regras de Referência</h3>
              </div>
              <div className="space-y-3">
                {referenceFiles.map(file => (
                  <div key={file.id} className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between border border-emerald-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen className="text-emerald-600 w-4 h-4" />
                      <span className="text-xs font-medium text-emerald-900 truncate">{file.name}</span>
                    </div>
                    <button onClick={() => setReferenceFiles(prev => prev.filter(f => f.id !== file.id))} className="p-1 hover:bg-emerald-200 rounded-md text-emerald-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  Adicionar PDF de regras
                  <input type="file" className="hidden" accept=".pdf" multiple onChange={handleReferenceUpload} />
                </label>
              </div>
            </div>

            <button
              onClick={startAnalysis}
              disabled={!targetFile || status === AppStatus.ANALYZING || status === AppStatus.EXTRACTING_TEXT}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 ${
                !targetFile || status === AppStatus.ANALYZING || status === AppStatus.EXTRACTING_TEXT
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1'
              }`}
            >
              {status === AppStatus.ANALYZING ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analisando Texto...
                </>
              ) : status === AppStatus.EXTRACTING_TEXT ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Lendo Documento...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Iniciar Revisão
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            {!result && status !== AppStatus.ANALYZING && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                <History className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Os resultados com número de página aparecerão aqui</p>
                <p className="text-sm mt-2 italic">A exportação para Excel incluirá tipo de erro, página e detalhes comparativos.</p>
              </div>
            )}

            {status === AppStatus.ANALYZING && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="text-blue-600 w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Processando Linguística...</h3>
                <p className="text-slate-500 max-w-sm">Mapeando páginas e corrigindo conteúdo...</p>
              </div>
            )}

            {result && status === AppStatus.COMPLETED && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-black ${
                      result.score > 80 ? 'bg-emerald-100 text-emerald-700' : 
                      result.score > 50 ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {result.score}
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-bold text-lg">Qualidade Geral</h4>
                      <p className="text-slate-500 text-sm">{result.corrections.length} pontos de atenção.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={exportToExcel} 
                      className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Exportar Excel
                    </button>
                    <button 
                      onClick={downloadResult} 
                      className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Texto
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-2 bg-slate-50/50">
                    <CheckCircle2 className="text-blue-600 w-5 h-5" />
                    <h3 className="font-bold text-slate-900">Texto Consolidado</h3>
                  </div>
                  <div className="p-8">
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-normal">{result.fullCorrectedText}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-xl px-2 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    Relatório de Alterações
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.corrections.map((corr, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                          <MapPin className="w-12 h-12 text-slate-900" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                corr.type === 'orthography' ? 'bg-purple-100 text-purple-700' :
                                corr.type === 'grammar' ? 'bg-blue-100 text-blue-700' :
                                corr.type === 'style' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {corr.type === 'orthography' ? 'Ortografia' :
                                 corr.type === 'grammar' ? 'Gramática' :
                                 corr.type === 'style' ? 'Estilo' : 'Pontuação'}
                              </span>
                          </div>
                          <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            <MapPin className="w-3 h-3" />
                            <span className="text-[11px] font-bold">Pág. {corr.pageNumber}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-3 relative z-10">
                          <div className="flex items-start gap-2">
                            <span className="text-red-400 font-medium line-through decoration-red-200 shrink-0 text-xs">De:</span>
                            <span className="text-slate-500 italic text-sm">"{corr.original}"</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold shrink-0 text-xs">Para:</span>
                            <span className="text-emerald-700 font-semibold text-sm">"{corr.corrected}"</span>
                          </div>
                          <div className="pt-3 border-t border-slate-50">
                            <p className="text-xs text-slate-500 leading-relaxed">
                              <span className="font-bold text-slate-700">Explicação:</span> {corr.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
