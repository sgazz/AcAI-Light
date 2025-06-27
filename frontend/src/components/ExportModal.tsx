'use client';

import { useState } from 'react';
import { FaTimes, FaDownload, FaFilePdf, FaFileCode, FaFileAlt, FaCalendar } from 'react-icons/fa';
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
        return <FaFilePdf className="text-red-500" />;
      case 'json':
        return <FaFileCode className="text-yellow-500" />;
      case 'markdown':
        return <FaFileAlt className="text-blue-500" />;
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
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] rounded-xl shadow-2xl border border-[var(--border-color)] z-50 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <FaDownload className="text-[var(--accent-blue)]" size={20} />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Export Chat History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Zatvori"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Session Info */}
          {session && (
            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-2">
                <FaCalendar className="text-[var(--accent-blue)]" size={14} />
                <span className="text-sm font-medium text-[var(--text-primary)]">Session Info</span>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                <div>ID: {session.session_id.slice(0, 8)}...</div>
                <div>Messages: {session.message_count}</div>
                <div>Last: {formatDate(session.last_message)}</div>
              </div>
            </div>
          )}

          {/* Export Format Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
              Export Format
            </label>
            <div className="space-y-2">
              {(['pdf', 'json', 'markdown'] as ExportFormat[]).map((format) => (
                <label
                  key={format}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    exportFormat === format
                      ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/20'
                      : 'border-[var(--border-color)] hover:border-[var(--accent-blue)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format}
                    checked={exportFormat === format}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    {getFormatIcon(format)}
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)] capitalize">
                        {format.toUpperCase()}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {getFormatDescription(format)}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Export Options
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-[var(--border-color)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Include session metadata
              </span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                className="rounded border-[var(--border-color)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Include message timestamps
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !session || messages.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isExporting || !session || messages.length === 0
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue)]/80'
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FaDownload size={14} />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
} 