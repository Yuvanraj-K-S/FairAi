import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUpload,
  FiFile,
  FiCheckCircle,
  FiX,
  FiChevronRight,
} from "react-icons/fi";
import apiClient from "../api/client";

const FacialRecognitionPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [usingDefault, setUsingDefault] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
  }, []);

  // Upload custom model
  const handleSubmit = async (e) => {
    // no preventing button behavior here (we use type="button"), keep simple
    if (!selectedFile) {
      // inform user but do not disable the button
      alert("Please choose a model file first (or use the default model).");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("model_file", selectedFile);
      // If your backend expects dataset_zip or other fields, append them here

      // Use multipart/form-data automatically
      const response = await apiClient.post("/api/face/evaluate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setIsUploaded(true);
      // Navigate to the new facial recognition results page with the evaluation data
      navigate("/results/facial-recognition", { state: { evaluationData: response.data } });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Continue with default model (always clickable)
  const handleDefaultModel = async () => {
    setUsingDefault(true);
    setIsUploading(true);

    try {
      // Send as FormData so backend receives multipart/form-data
      const formData = new FormData();
      formData.append("use_default", "true");
      // If backend requires dataset_zip, add here or backend will use its default dataset

      const response = await apiClient.post("/api/face/evaluate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setIsUploaded(true);
      // Navigate to the new facial recognition results page with the evaluation data
      navigate("/results/facial-recognition", { state: { evaluationData: response.data } });
    } catch (error) {
      console.error("Default model evaluation failed:", error);
      alert("Failed to run default model. Please try again.");
    } finally {
      setIsUploading(false);
      setUsingDefault(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFileName("");
    setIsUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Facial Recognition Analysis
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Upload your facial recognition model or use the default one
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Main Content */}
          <div className="px-6 py-8">
            {isUploaded ? (
              <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-6">
                  <FiCheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-medium text-gray-900 mb-2">
                  Evaluation Started
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Your model is being analyzed for potential biases.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Upload Another Model
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/results/facial-recognition")}
                    className="px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Processing...' : 'View Results'}
                    <FiChevronRight className="ml-2 -mr-1 h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-150">
                  {fileName ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-blue-50">
                        <FiFile className="h-8 w-8 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                      </p>
                      <div className="flex justify-center space-x-4">
                        <button
                          type="button"
                          onClick={handleButtonClick}
                          className="text-sm font-medium text-blue-600"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="text-sm font-medium text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                        <FiUpload className="h-6 w-6 text-gray-400" />
                      </div>
                      <button
                        type="button"
                        onClick={handleButtonClick}
                        className="font-medium text-blue-600 hover:text-blue-500"
                      >
                        Click to upload
                      </button>
                      <p className="mt-1 text-xs text-gray-500">
                        Model files (.h5, .pb, .tflite, .pt, .pth)
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".h5,.pb,.tflite,.pt,.pth"
                  />
                </div>

                {/* Action Buttons: NONE of these buttons are disabled by props */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  {/* Continue with Default Model - always clickable */}
                  <button
                    type="button"
                    onClick={handleDefaultModel}
                    className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white ${
                      usingDefault ? "bg-green-500" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {usingDefault ? "Running Default..." : "Continue with Default Model"}
                  </button>

                  {/* Upload Model (custom) - always clickable */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700`}
                  >
                    {isUploading ? "Processing..." : "Upload Model"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacialRecognitionPage;