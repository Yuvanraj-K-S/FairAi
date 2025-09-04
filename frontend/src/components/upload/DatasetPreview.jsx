import React from 'react';

export default function DatasetPreview({ previewRows }) {
  if (!previewRows || previewRows.length === 0) return null;
  const cols = Object.keys(previewRows[0]);
  
  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800">
          Dataset Preview
        </h3>
        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          First {previewRows.length} rows
        </span>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {cols.map((c) => (
                <th 
                  key={c} 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewRows.map((r, i) => (
              <tr 
                key={i}
                className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {cols.map((c) => (
                  <td 
                    key={c} 
                    className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs"
                    title={String(r[c] ?? '')}
                  >
                    {String(r[c] ?? '').length > 30 
                      ? `${String(r[c] ?? '').substring(0, 30)}...` 
                      : String(r[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        <p>Showing {previewRows.length} of {previewRows.length} rows • {cols.length} columns</p>
      </div>
    </div>
  );
}
