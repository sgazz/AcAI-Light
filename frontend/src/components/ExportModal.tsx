'use client';

import { useState } from 'react';
import { FaTimes, FaDownload, FaFilePdf, FaFileCode, FaFileAlt, FaCalendar, FaCog, FaCheck, FaSpinner, FaMagic, FaShieldAlt, FaClock, FaUser, FaRobot } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface Session {
  session_id: string;
  message_count: number;
  first_message: string;
  last_message: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  messages: Message[];
}

type ExportFormat = 'pdf' | 'json' | 'markdown';

export default function ExportModal({ isOpen, onClose, session, messages }: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-RS');
  };

  const exportToPDF = async () => {
    if (!session || messages.length === 0) return;

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Chat History Export', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Session metadata
      if (includeMetadata) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Session Information:', margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Session ID: ${session.session_id}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Message Count: ${session.message_count}`, margin, yPosition);
        yPosition += 6;
        doc.text(`First Message: ${formatDate(session.first_message)}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Last Message: ${formatDate(session.last_message)}`, margin, yPosition);
        yPosition += 10;
      }

      // Messages
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Messages:', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      for (const message of messages) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Message header
        const sender = message.sender === 'user' ? 'You' : 'AI';
        const timestamp = includeTimestamps ? ` (${formatDate(message.timestamp)})` : '';
        const header = `${sender}${timestamp}`;
        
        doc.setFont('helvetica', 'bold');
        if (message.sender === 'user') {
          doc.setTextColor(59, 130, 246); // Blue for user
        } else {
          doc.setTextColor(16, 185, 129); // Green for AI
        }
        doc.text(header, margin, yPosition);
        yPosition += 6;

        // Message content
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0); // Black text
        
        // Split content into lines that fit the page width
        const lines = doc.splitTextToSize(message.content, contentWidth);
        
        for (const line of lines) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += 5;
        }
        
        yPosition += 8; // Space between messages
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
        doc.text(`Exported on ${new Date().toLocaleString('sr-RS')}`, pageWidth / 2, 295, { align: 'center' });
      }

      // Save the PDF
      const fileName = `chat-history-${session.session_id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('Greška pri export-u PDF-a:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = async () => {
    if (!session || messages.length === 0) return;

    setIsExporting(true);
    try {
      const exportData = {
        metadata: includeMetadata ? {
          session_id: session.session_id,
          message_count: session.message_count,
          first_message: session.first_message,
          last_message: session.last_message,
          export_date: new Date().toISOString(),
          export_format: 'json'
        } : null,
        messages: messages.map(msg => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: includeTimestamps ? msg.timestamp : undefined
        }))
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const fileName = `chat-history-${session.session_id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
      saveAs(blob, fileName);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('Greška pri export-u JSON-a:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToMarkdown = async () => {
    if (!session || messages.length === 0) return;

    setIsExporting(true);
    try {
      let markdown = '';

      // Header
      markdown += '# Chat History Export\n\n';

      // Session metadata
      if (includeMetadata) {
        markdown += '## Session Information\n\n';
        markdown += `- **Session ID:** ${session.session_id}\n`;
        markdown += `- **Message Count:** ${session.message_count}\n`;
        markdown += `- **First Message:** ${formatDate(session.first_message)}\n`;
        markdown += `- **Last Message:** ${formatDate(session.last_message)}\n`;
        markdown += `- **Export Date:** ${new Date().toLocaleString('sr-RS')}\n\n`;
      }

      // Messages
      markdown += '## Messages\n\n';

      for (const message of messages) {
        const sender = message.sender === 'user' ? 'You' : 'AI';
        const timestamp = includeTimestamps ? ` *(${formatDate(message.timestamp)})*` : '';
        
        markdown += `### ${sender}${timestamp}\n\n`;
        markdown += `${message.content}\n\n`;
        markdown += '---\n\n';
      }

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const fileName = `chat-history-${session.session_id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.md`;
      saveAs(blob, fileName);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('Greška pri export-u Markdown-a:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    switch (exportFormat) {
      case 'pdf':
        await exportToPDF();
        break;
      case 'json':
        await exportToJSON();
        break;
      case 'markdown':
        await exportToMarkdown();
        break;
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return <FaFilePdf className="text-red-400" size={20} />;
      case 'json':
        return <FaFileCode className="text-yellow-400" size={20} />;
      case 'markdown':
        return <FaFileAlt className="text-blue-400" size={20} />;
    }
  };

  const getFormatDescription = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return 'Portable Document Format - dobar za štampanje i deljenje';
      case 'json':
        return 'JavaScript Object Notation - dobar za programiranje i analizu';
      case 'markdown':
        return 'Markdown format - dobar za čitanje i uređivanje';
    }
  };

  return (
    <>
      {/* Premium Overlay sa Glassmorphism */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/20 to-blue-900/30 backdrop-blur-xl z-50"
        onClick={onClose}
      />
      
      {/* Premium Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 z-[9999] w-full max-w-2xl h-[85vh] flex flex-col">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        </div>

        <div className="relative flex flex-col h-full">
          {/* Premium Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                  <FaDownload className="text-white" size={24} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                  Export Chat History
                </h3>
                <p className="text-sm text-slate-400 font-medium">Izaberite format i opcije za export</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 group"
              title="Zatvori"
            >
              <FaTimes size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Premium Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
            {/* Premium Session Info */}
            {session && (
              <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <FaCalendar size={16} className="text-blue-400" />
                  </div>
                  <span className="text-lg font-bold text-white">Session Info</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">ID:</span>
                    <span className="text-white font-mono">{session.session_id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Messages:</span>
                    <span className="text-white font-bold">{session.message_count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Last:</span>
                    <span className="text-white">{formatDate(session.last_message)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Premium Export Format Selection */}
            <div className="space-y-4">
              <label className="block text-lg font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <FaMagic size={16} className="text-purple-400" />
                </div>
                Export Format
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['pdf', 'json', 'markdown'] as ExportFormat[]).map((format) => (
                  <label
                    key={format}
                    className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                      exportFormat === format
                        ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10 shadow-xl shadow-blue-500/20'
                        : 'border-white/10 hover:border-blue-500/30 hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format}
                      checked={exportFormat === format}
                      onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                      className="sr-only"
                    />
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="p-3 bg-slate-700/50 rounded-xl">
                        {getFormatIcon(format)}
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-white capitalize mb-1">
                          {format.toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-400 leading-relaxed">
                          {getFormatDescription(format)}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Premium Export Options */}
            <div className="space-y-4">
              <label className="block text-lg font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <FaCog size={16} className="text-yellow-400" />
                </div>
                Export Options
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-white/10 cursor-pointer hover:bg-slate-700/30 transition-all duration-200 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-slate-700/50 text-blue-500 focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FaShieldAlt size={14} className="text-blue-400" />
                    <span className="text-sm text-white group-hover:text-blue-200 transition-colors duration-200">
                      Include session metadata
                    </span>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-white/10 cursor-pointer hover:bg-slate-700/30 transition-all duration-200 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={includeTimestamps}
                      onChange={(e) => setIncludeTimestamps(e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-slate-700/50 text-blue-500 focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FaClock size={14} className="text-green-400" />
                    <span className="text-sm text-white group-hover:text-green-200 transition-colors duration-200">
                      Include message timestamps
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Premium Preview */}
            <div className="p-4 bg-gradient-to-r from-slate-800/30 to-slate-700/30 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <FaUser size={14} className="text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-white">Preview</span>
              </div>
              <div className="text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-2">
                  <span>Format:</span>
                  <span className="text-white font-semibold">{exportFormat.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Messages:</span>
                  <span className="text-white font-semibold">{messages.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Size:</span>
                  <span className="text-white font-semibold">~{Math.round(messages.length * 0.5)}KB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Footer - Fixed */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-white/10 bg-gradient-to-r from-slate-800/30 to-slate-700/30 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !session || messages.length === 0}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl transition-all duration-300 font-semibold ${
                isExporting || !session || messages.length === 0
                  ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                  : exportSuccess
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isExporting ? (
                <>
                  <div className="relative">
                    <FaSpinner className="animate-spin" size={16} />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  Exporting...
                </>
              ) : exportSuccess ? (
                <>
                  <FaCheck size={16} />
                  Exported!
                </>
              ) : (
                <>
                  <FaDownload size={16} />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 