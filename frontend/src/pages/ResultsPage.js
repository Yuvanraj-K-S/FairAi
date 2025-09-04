import React from "react";
import "./ResultsPage.css";
import Plot from "react-plotly.js";

function ResultsPage() {
  // Mock data (replace later with API call)
  const mockResult = {
    decision: "approve",
    score: 0.82,
    explain: ["income > threshold", "low existing debt"],
    summary: {
      FMR_by_ethnicity: { Indian: 0.02, White: 0.01, Black: 0.03 },
      FNMR_by_gender: { Male: 0.03, Female: 0.05 },
    }
  };

  return (
    <div className="results-container">
      <h2>Loan Application Results</h2>
      <p>Your results are shown below.</p>

      {/* Decision card */}
      <div className="decision-card">
        <h3>Decision: {mockResult.decision.toUpperCase()}</h3>
        <p>Score: {(mockResult.score * 100).toFixed(1)}%</p>
        <ul>
          {mockResult.explain.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

      {/* Charts */}
      <div className="charts-section">
        <Plot
          data={[
            {
              x: Object.keys(mockResult.summary.FMR_by_ethnicity),
              y: Object.values(mockResult.summary.FMR_by_ethnicity),
              type: "bar",
              marker: { color: "#3498db" },
            },
          ]}
          layout={{ title: "FMR by Ethnicity", xaxis: { title: "Group" }, yaxis: { title: "Rate" } }}
          style={{ width: "100%", height: "400px" }}
        />

        <Plot
          data={[
            {
              x: Object.keys(mockResult.summary.FNMR_by_gender),
              y: Object.values(mockResult.summary.FNMR_by_gender),
              type: "bar",
              marker: { color: "#e74c3c" },
            },
          ]}
          layout={{ title: "FNMR by Gender", xaxis: { title: "Group" }, yaxis: { title: "Rate" } }}
          style={{ width: "100%", height: "400px" }}
        />
      </div>
    </div>
  );
}

export default ResultsPage;
