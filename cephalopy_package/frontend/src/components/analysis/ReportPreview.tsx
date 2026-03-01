import React, { useState, useEffect } from "react";
import { useLandmarkStore } from "@/stores/landmarkStore";
import { Spin, Button, message, Select, Modal } from "antd";
import {
  SnippetsOutlined,
  BookOutlined,
  ScanOutlined,
  BorderOutlined,
  AppstoreOutlined,
  TableOutlined,
  LayoutOutlined,
  FilePdfOutlined,
  DownloadOutlined
} from '@ant-design/icons';


const { Option } = Select;

// Backend base URL – must point to your FastAPI service
// Local dev:  http://127.0.0.1:8000/api/v1
// Cloud Run:  https://<your-backend-service>.run.app/api/v1
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

const ReportPreview: React.FC = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeActiveImage, setIncludeActiveImage] = useState(true);
  const [titleBg, setTitleBg] = useState("#CBCBCB");
  const [titlePageData, setTitlePageData] = useState({
    mainTitle: "Cephalometric Analysis Report",
    author: "",
    patient: "",
    description: "",
  });
  const [imageLayouts, setImageLayouts] =
    useState<"single" | "grid2" | "grid3">("grid2");

  const {
    page1Notes,
    page2Notes,
    page3Notes,
    manualNotes,
    comparisonNotes,
    setPage1Notes,
    page1Images,
    setPage2Notes,
    page2Images,
    setPage3Notes,
    page3Images,
    setManualNotes,
    manualImages,
    setComparisonNotes,
    comparisonImages,
    page3ImageCaptions,
    cephMeasurements,
    compMeasures,
    currentImage,
  } = useLandmarkStore();
  const [notes1Text, setNotes1Text] = useState<string>(page1Notes || "");
  const [notes2Text, setNotes2Text] = useState<string>(page2Notes || "");
  const [notes3Text, setNotes3Text] = useState<string>(manualNotes || "");
  const [notes4Text, setNotes4Text] = useState<string>(comparisonNotes || "");
  const [notes5Text, setNotes5Text] = useState<string>(page3Notes || "");
  const [isViewNotesVisible, setIsViewNotesVisible] = useState(false);

  /**
   * Fetch a blob URL or asset URL, resize and compress it via canvas,
   * and return a base64 data URL (PNG).
   * Defaults: 1000x1000, quality 0.6 (pretty aggressive shrink).
   */
  async function blobUrlToCompressedBase64(
    blobUrl: string,
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.6
  ): Promise<string> {
    const res = await fetch(blobUrl);
    const blob = await res.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Maintain aspect ratio, clamp to max width/height
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get 2D context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Export as PNG with given quality to shrink size
          const dataUrl = canvas.toDataURL("image/png", quality);
          resolve(dataUrl);
        };

        img.onerror = (err) => reject(err);
        img.src = reader.result as string;
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  }

  // Handlers for changes on the notes.
  const handleNotes1Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes1Text(e.target.value);
  };
  const handleNotes2Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes2Text(e.target.value);
  };
  const handleNotes3Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes3Text(e.target.value);
  };
  const handleNotes4Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes4Text(e.target.value);
  };
  const handleNotes5Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes5Text(e.target.value);
  };

  // Handlers for viewing all notes Modal.
  const showViewNotesModal = () => setIsViewNotesVisible(true);
  const handleViewNotesOk = () => setIsViewNotesVisible(false);
  const handleViewNotesCancel = () => setIsViewNotesVisible(false);


  useEffect(() => {
    setPage1Notes(notes1Text);
  }, [notes1Text, setPage1Notes]);

  useEffect(() => {
    setPage2Notes(notes2Text);
  }, [notes2Text, setPage2Notes]);

  useEffect(() => {
    setManualNotes(notes3Text);
  }, [notes3Text, setManualNotes]);

  useEffect(() => {
    setComparisonNotes(notes4Text);
  }, [notes4Text, setComparisonNotes]);

  useEffect(() => {
    setPage3Notes(notes5Text);
  }, [notes5Text, setPage3Notes]);


  /**
   * Quick helper to estimate JSON payload size in MB.
   */
  function estimatePayloadSizeMB(payload: any): number {
    const json = JSON.stringify(payload);
    return new Blob([json]).size / (1024 * 1024);
  }

  const documentAPI = {
    generateDoc: async (payload: any) => {
      const res = await fetch(`${API_BASE_URL}/generate_doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to generate document");
      return res.json();
    },

    downloadDoc: async () => {
      const res = await fetch(`${API_BASE_URL}/download_doc`);
      if (!res.ok) throw new Error("Failed to download PDF");
      return res.blob();
    },
  };

  const generatePdf = async () => {
    try {
      setLoading(true);

      if (!cephMeasurements || cephMeasurements.length === 0) {
        message.warning("No measurements available for PDF");
        return;
      }

      // Compress page images
      const page1Base64 = await Promise.all(
        page1Images.map((url) =>
          blobUrlToCompressedBase64(url, 1000, 1000, 0.6)
        )
      );
      const page2Base64 = await Promise.all(
        page2Images.map((url) =>
          blobUrlToCompressedBase64(url, 1000, 1000, 0.6)
        )
      );
      const page3Base64 = await Promise.all(
        page3Images.map((url) =>
          blobUrlToCompressedBase64(url, 1000, 1000, 0.6)
        )
      );
      const manualBase64 = await Promise.all(
        manualImages.map((url) =>
          blobUrlToCompressedBase64(url, 1000, 1000, 0.6)
        )
      );
      const compBase64 = await Promise.all(
        comparisonImages.map((url) =>
          blobUrlToCompressedBase64(url, 1000, 1000, 0.6)
        )
      );

      let titleImageBase64 = "";
      if (includeTitle && includeActiveImage && currentImage) {
        titleImageBase64 = await blobUrlToCompressedBase64(
          currentImage.url,
          1000,
          1000,
          0.6
        );
      }

      const metricsDict: Record<
        string,
        {
          Value: string;
          Norm: string | number | null;
          Deviation: string | number | null;
        }
      > = {};

      cephMeasurements.forEach((m) => {
        metricsDict[m.name] = {
          Value: `${m.value} ${m.unit ?? ""}`.trim(),
          Norm: m.norm ?? "",
          Deviation: m.deviation ?? "",
        };
      });

      const payload = {
        logo: logoBase64,
        include_title: includeTitle,
        title_img: titleImageBase64,
        main_title: titlePageData.mainTitle,
        author: titlePageData.author,
        patient: titlePageData.patient,
        descr: titlePageData.description,
        title_bg: titleBg,
        titles_li: [
          "Landmark Detection",
          "Landmark Correction",
          "Manual Detection",
          "Comparison Predicted and Manual",
          "Cephalometric Analysis",
        ],
        img_li: [page1Base64, page2Base64, manualBase64, compBase64, page3Base64],
        img_captions_li: [
          ["Landmark Detection"],
          ["Landmark Correction"],
          ["Manual Detection"],
          ["Manual Detection", "Prediction"],
          page3ImageCaptions,
        ],
        notes_li: [
          page1Notes,
          page2Notes,
          manualNotes,
          comparisonNotes,
          page3Notes,
        ],
        metrics_li: [{}, {}, {}, compMeasures, metricsDict],
        image_layout: ["single", "single", "single", "single", imageLayouts],
      };

      // Log payload size
      const sizeMB = estimatePayloadSizeMB(payload);
      console.log(`[generate_doc] Payload size ≈ ${sizeMB.toFixed(2)} MB`);

      // Optional guard
      if (sizeMB > 28) {
        message.error(
          `Report is too large (${sizeMB.toFixed(
            2
          )} MB). Please reduce the number or size of images.`
        );
        return;
      }

      await documentAPI.generateDoc(payload);

      const blob = await documentAPI.downloadDoc();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error(err);
      message.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 24,
        width: "100%",
        height: "100%",
        flex: "1 1 0%",
        background: "rgba(255, 255, 240, 0.05)",
        borderRadius: "12px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <h1 style={{ padding: "20px" }}>Generated Report</h1>
      <Button
        icon={<SnippetsOutlined  />}
        onClick={showViewNotesModal}
        block
        className="depth-button-secondary"
        style={{ width: "240px", marginBottom:"24px"}}
      >
        Show All Notes
      </Button>

      <Modal
        title="View All Notes"
        open={isViewNotesVisible}
        onOk={handleViewNotesOk}
        onCancel={handleViewNotesCancel}
        okButtonProps={{
          style: {
            backgroundColor: "#09185B",
            color: "#FFFFF0",
            border: "none"
          }
        }}
        cancelButtonProps={{
          style: {
            backgroundColor: "#f0f0f0",
            color: "#000000",
            border: "1px solid #d9d9d9"
          }
        }}
      >
        <div
          style={{
            background: "rgb(4 21 109 / 75%)",
            display: "block",
            marginBottom: "4px",
            padding: "16px",
            borderRadius: "8px",
          }}
        >
          <h4>Landmark Detection</h4>
          <textarea
            id="Notes_field1"
            value={notes1Text}
            onChange={handleNotes1Change}
            placeholder="No Notes..."
            className="border p-2 rounded notesFields"
          />
          <h4>Landmark Correction</h4>
          <textarea
            id="Notes_field2"
            value={notes2Text}
            onChange={handleNotes2Change}
            placeholder="No Notes..."
            className="border p-2 rounded notesFields"
          />
          <h4>Manual Detection Labelling</h4>
          <textarea
            id="Notes_field3"
            value={notes3Text}
            onChange={handleNotes3Change}
            placeholder="No Notes..."
            className="border p-2 rounded notesFields"
          />
          <h4>Manual Detection Comparison</h4>
          <textarea
            id="Notes_field4"
            value={notes4Text}
            onChange={handleNotes4Change}
            placeholder="No Notes..."
            className="border p-2 rounded notesFields"
          />
          <h4>Cephalometric Analysis</h4>
          <textarea
            id="Notes_field5"
            value={notes5Text}
            onChange={handleNotes5Change}
            placeholder="No Notes..."
            className="border p-2 rounded notesFields"
          />
        </div>
      </Modal>

      <div style={{ marginBottom: 24 }}>
        <label>
          <input
            type="checkbox"
            checked={includeTitle}
            onChange={(e) => setIncludeTitle(e.target.checked)}
          />{" "}
          <BookOutlined /> Include Title Page
        </label>

        {includeTitle && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: "60%",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              Report Title:
              <input
                type="text"
                placeholder="Report Title"
                value={titlePageData.mainTitle}
                onChange={(e) =>
                  setTitlePageData({
                    ...titlePageData,
                    mainTitle: e.target.value,
                  })
                }
                style={{
                  background: "rgba(0, 0, 0, 0.1)",
                  color: "#FFFFF0",
                  border: "2px solid rgba(255, 255, 240, 0.1)",
                  width: "80%",
                  padding: "5px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              Author:
              <input
                type="text"
                placeholder="Author"
                value={titlePageData.author}
                onChange={(e) =>
                  setTitlePageData({
                    ...titlePageData,
                    author: e.target.value,
                  })
                }
                style={{
                  background: "rgba(0, 0, 0, 0.1)",
                  color: "#FFFFF0",
                  border: "2px solid rgba(255, 255, 240, 0.1)",
                  width: "80%",
                  padding: "5px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              Patient:
              <input
                type="text"
                placeholder="Patient Identifier"
                value={titlePageData.patient}
                onChange={(e) =>
                  setTitlePageData({
                    ...titlePageData,
                    patient: e.target.value,
                  })
                }
                style={{
                  background: "rgba(0, 0, 0, 0.1)",
                  color: "#FFFFF0",
                  border: "2px solid rgba(255, 255, 240, 0.1)",
                  width: "80%",
                  padding: "5px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              Description:
              <textarea
                placeholder="Description"
                value={titlePageData.description}
                onChange={(e) =>
                  setTitlePageData({
                    ...titlePageData,
                    description: e.target.value,
                  })
                }
                style={{
                  background: "rgba(0, 0, 0, 0.1)",
                  color: "#FFFFF0",
                  border: "2px solid rgba(255, 255, 240, 0.1)",
                  width: "80%",
                  padding: "5px",
                  borderRadius: "8px",
                  resize: "vertical",
                }}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={includeActiveImage}
                onChange={(e) => setIncludeActiveImage(e.target.checked)}
              />{" "}
              <ScanOutlined /> Include Current X-ray on Title Page
            </label>

            <label>
              Title Page Background:{" "}
              <input
                type="color"
                value={titleBg}
                onChange={(e) => setTitleBg(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <h3><LayoutOutlined /> Image Layout Options</h3>

        <label>
          Layout:
          <Select
            style={{
              width: "50%",
              padding: "5px",
              marginBottom: 10,
              marginLeft: 10,
            }}
            value={imageLayouts}
            onChange={setImageLayouts}
          >
            <Option value="single"><BorderOutlined /> Single Column</Option>
            <Option value="grid2"><AppstoreOutlined /> Grid 2x2</Option>
            <Option value="grid3"><TableOutlined /> Grid 3x3</Option>
          </Select>
        </label>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: "12px" }}>
        <Button type="primary" onClick={generatePdf} disabled={loading}>
          <FilePdfOutlined /> {loading ? "Generating..." : "Generate PDF"}
        </Button>

        {!loading && pdfUrl && (
          <Button
            // type="primary"
            className="depth-button-secondary"
            onClick={() => {
              const a = document.createElement("a");
              a.href = pdfUrl;
              a.download = "Cephalometric_Report.pdf";
              a.click();
            }}
          >
            <DownloadOutlined/> Download PDF
          </Button>
      )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      )}

      {!loading && pdfUrl && (
        <>
          <iframe
            src={pdfUrl}
            style={{
              width: "100%",
              height: "90vh",
              border: "1px solid #CCC",
            }}
          />

          <Button
            type="primary"
            onClick={() => {
              const a = document.createElement("a");
              a.href = pdfUrl;
              a.download = "Cephalometric_Report.pdf";
              a.click();
            }}
            style={{ marginTop: 16 }}
          >
            <DownloadOutlined/> Download PDF
          </Button>
        </>
      )}
    </div>
  );
};

export default ReportPreview;
