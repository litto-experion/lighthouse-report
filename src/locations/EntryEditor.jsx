import React, { useState } from 'react';
import { Button, TextInput, Paragraph, Spinner, Table, TableBody, TableCell, TableHead, TableRow } from '@contentful/f36-components';
import { useSDK } from '@contentful/react-apps-toolkit';

const EntryEditor = () => {
  const sdk = useSDK();
  const [url, setUrl] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    if (!url) {
      sdk.dialogs.openAlert({ title: "Error", message: "Please enter a URL" });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/run-lighthouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error("Failed to run audit:", err);
      sdk.dialogs.openAlert({ title: "Error", message: "Audit failed. Check backend logs." });
    }
    setLoading(false);
  };

  const renderAltTable = (images) => (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Image (missing alt)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {images.map((img, i) => (
          <TableRow key={i}>
            <TableCell>{img.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderUnoptimizedTable = (images) => (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Image Name</TableCell>
          <TableCell>Savings (in KB)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {images.map((img, i) => (
          <TableRow key={i}>
            <TableCell>{img.name}</TableCell>
            <TableCell>{img.savingsKB}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderReport = (section, label) => (
    <>
      <h3>{label}</h3>
      <Paragraph>{section?.geminiSummary}</Paragraph>
      <Paragraph>Accessibility Score: {section?.accessibilityScore}</Paragraph>
      {section?.missingAltImages && section.missingAltImages.length > 0 && (
        <>
          <Paragraph>Images missing alt text:</Paragraph>
          {renderAltTable(section.missingAltImages)}
        </>
      )}
      {section?.unoptimizedImages && section.unoptimizedImages.length > 0 && (
        <>
          <Paragraph>Images that can be optimized:</Paragraph>
          {renderUnoptimizedTable(section.unoptimizedImages)}
        </>
      )}
    </>
  );

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <TextInput
          placeholder="Enter website URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button variant="primary" onClick={runAudit} isDisabled={loading}>
          {loading ? <Spinner size="small" /> : "Run Lighthouse Audit"}
        </Button>
      </div>

      {report && (
        <div style={{ marginTop: "1rem" }}>
          {report.mobile && renderReport(report.mobile, "📱 Mobile Report")}
          {report.desktop && renderReport(report.desktop, "💻 Desktop Report")}
        </div>
      )}
    </div>
  );
};

export default EntryEditor;
