import React, { useState } from 'react';
import './LoanFormPage.css';

function LoanFormPage() {
  const [formData, setFormData] = useState({
    name: "",
    income: "",
    existingLoan: "",
    credit_years: "",
    employment: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Add form submission logic here
  };

  return (
    <div className="loan-form-container">
      <h2>Loan Application</h2>
      <p>Fill out the loan application form.</p>
      
      <form onSubmit={handleSubmit} className="loan-form">
        <div className="form-group">
          <label>Full Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <label>Income:</label>
          <input
          name="income"
          type="number"
          value={formData.income}
          onChange={handleChange}
          required
          />
        </div>
        <div>
          <lable>credit Years:</lable>
          <input
          name="credit_years"
          type="number"
          value={formData.credit_years}
          onChange={handleChange}
          required
          />
        </div>
        <div>
          <lable>Employement:</lable>
        <select>
          <input
          name="employement"
          value={formData.employement}
          onChange={handleChange}
          required
          />
        </select>
        </div>
        <div className="form-group">
          <label>Employment Status:</label>
          <select
            name="employement"
            value={formData.employement}
            onChange={handleChange}
            required
          >
            <option value="">Select Employment Status</option>
            <option value="employed">Employed</option>
            <option value="self-employed">Self-Employed</option>
            <option value="unemployed">Unemployed</option>
            <option value="student">Student</option>
         </select>
        </div>
        <button type="submit" className="submit-btn">Submit Application</button>
      </form>
    </div>
  );
}

export default LoanFormPage;
