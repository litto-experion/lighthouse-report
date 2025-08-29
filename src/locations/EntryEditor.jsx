import React, { useState } from 'react';
import { Button, TextInput, Paragraph, Table, TableBody, TableCell, TableHead, TableRow, EntryCard, Badge, DisplayText, Flex, Text } from '@contentful/f36-components';
import { useSDK } from '@contentful/react-apps-toolkit';

const EntryEditor = () => {
  const sdk = useSDK();
  const [url, setUrl] = useState('https://experionglobal.com/');
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAudit = async () => {
    if (!url) {
      sdk.dialogs.openAlert({ title: "Error", message: "Please enter a URL" });
      return;
    }
    setIsLoading(true);
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
    setIsLoading(false);
  };

  const renderTable = (images) => {
    return <Table>
      <TableHead>
        <TableRow>
          {images.length > 0 && Object.keys(images[0]).map((key) => (
            <TableCell key={key}>{key}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {images.map((image, index) => (
          <TableRow key={index}>
            {Object.entries(image).map(([key, value]) => (
              <TableCell key={key}>{image[key]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  };

  const renderBadge = (label, score) => {
    const scoreValue = score.slice(0, -1); 
    console.log(score)
    const variant = scoreValue >= 90 ? "positive" : scoreValue >= 50 ? "warning" : "negative";
    return <Badge variant={variant}>{`${label} Score: ${score}`}</Badge>;
  };

  const renderReport = (section, label) => (
    <>
      <EntryCard
        contentType={label}
        badge={
          <Flex flexDirection="row" gap="spacingM">
            {renderBadge("Accessibility", section?.accessibilityScore)}
            {renderBadge("SEO", section?.seoScore)}
          </Flex>
        }
      >
        <Flex flexDirection="column" padding="spacingL" gap="1.5rem">
          <Text fontSize="fontSizeL" lineHeight="lineHeight2Xl">
            {section?.geminiSummary}
          </Text>
          {section?.missingAltImages && section.missingAltImages.length > 0 && (
            <>
              <Paragraph fontWeight="fontWeightDemiBold">Images missing alt text:</Paragraph>
              {renderTable(section.missingAltImages)}
            </>
          )}
          {section?.unoptimizedImages && section.unoptimizedImages.length > 0 && (
            <>
              <Paragraph fontWeight="fontWeightDemiBold">Images that can be optimized:</Paragraph>
              {renderTable(section.unoptimizedImages)}
            </>
          )}
        </Flex>
      </EntryCard>

    </>
  );

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        alignItems: "center",
        marginTop: "2rem"
      }}>
        <TextInput
          placeholder="Enter website URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button variant="primary" onClick={runAudit} isLoading={isLoading} isDisabled={isLoading}>
          {isLoading ? "Running Audit" : "Run Lighthouse Audit"}
        </Button>
      </div>

      {report && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          alignItems: "center",
          marginTop: "2rem"
        }}>
          {report.mobile && renderReport(report.mobile, "📱 Mobile Report")}
          {report.desktop && renderReport(report.desktop, "💻 Desktop Report")}
        </div>
      )}
    </div>
  );
};

export default EntryEditor;
