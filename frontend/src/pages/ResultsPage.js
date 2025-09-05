import React from 'react';
import { FiCheck } from 'react-icons/fi';

export default function ResultsPage() {
  // Mock data (replace with actual API call)
  const loanDetails = {
    approved: true,
    amount: 10000,
    interestRate: 5.5,
    termMonths: 36,
    monthlyPayment: 303.75,
    reasons: [
      'Good credit score',
      'Stable income',
      'Low debt-to-income ratio'
    ]
  };

  const nextSteps = [
    {
      step: 1,
      title: 'Review Loan Agreement',
      description: 'Review and accept the loan agreement.'
    },
    {
      step: 2,
      title: 'Submit Documentation',
      description: 'Provide necessary documentation for verification.'
    },
    {
      step: 3,
      title: 'Receive Funds',
      description: 'Receive funds in your account within 2-3 business days.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter text-gray-900 sm:text-5xl">
              Loan Application Results
            </h1>
          </div>

          {/* Approval Card */}
          <div className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-6 p-6 md:flex-row">
              <div className="flex-shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <FiCheck className="h-8 w-8" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-semibold text-gray-900">
                  Congratulations, your loan has been approved!
                </h2>
                <p className="mt-1 text-gray-600">
                  We're pleased to inform you that your loan application has been approved. 
                  Please review the details below and proceed with the next steps.
                </p>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Loan Details */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Loan Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-100 py-3">
                  <p className="text-sm text-gray-500">Loan Amount</p>
                  <p className="text-sm font-medium text-gray-800">
                    ${loanDetails.amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between border-b border-gray-100 py-3">
                  <p className="text-sm text-gray-500">Interest Rate</p>
                  <p className="text-sm font-medium text-gray-800">
                    {loanDetails.interestRate}%
                  </p>
                </div>
                <div className="flex justify-between border-b border-gray-100 py-3">
                  <p className="text-sm text-gray-500">Loan Term</p>
                  <p className="text-sm font-medium text-gray-800">
                    {loanDetails.termMonths} months
                  </p>
                </div>
                <div className="flex justify-between pt-3">
                  <p className="text-sm font-medium text-gray-900">Monthly Payment</p>
                  <p className="text-sm font-semibold text-blue-700">
                    ${loanDetails.monthlyPayment.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Approval Reasons */}
              <div className="mt-6">
                <h4 className="mb-2 text-sm font-medium text-gray-700">Approval Reasons</h4>
                <ul className="space-y-1">
                  {loanDetails.reasons.map((reason, index) => (
                    <li key={index} className="flex items-start">
                      <FiCheck className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="text-sm text-gray-600">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Next Steps</h3>
              <ul className="space-y-4">
                {nextSteps.map((step) => (
                  <li key={step.step} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <span className="text-sm font-semibold">{step.step}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{step.title}</p>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <button className="flex h-12 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-6 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:w-auto">
              Download PDF
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
